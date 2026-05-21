use std::fs;
use std::io::Write;
use std::path::Path;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::paths::{ensure_app_dir, profile_dir, profiles_json_path};
use crate::slug::slugify;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Surfaces {
    pub gui: bool,
    pub cli: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub color: String,
    pub created_at: String,
    pub surfaces: Surfaces,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct Store {
    profiles: Vec<Profile>,
}

pub fn load() -> AppResult<Vec<Profile>> {
    let path = profiles_json_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(&path)?;
    if raw.trim().is_empty() {
        return Ok(Vec::new());
    }
    let store: Store = serde_json::from_str(&raw)?;
    Ok(store.profiles)
}

pub fn save_all(profiles: &[Profile]) -> AppResult<()> {
    ensure_app_dir()?;
    let path = profiles_json_path()?;
    let store = Store {
        profiles: profiles.to_vec(),
    };
    let body = serde_json::to_vec_pretty(&store)?;
    atomic_write(&path, &body)?;
    Ok(())
}

fn atomic_write(path: &Path, body: &[u8]) -> AppResult<()> {
    let parent = path
        .parent()
        .ok_or_else(|| AppError::NotFound(format!("path {} has no parent", path.display())))?;
    fs::create_dir_all(parent)?;
    let tmp = parent.join(
        path.file_name()
            .map(|name| format!(".{}.tmp", name.to_string_lossy()))
            .unwrap_or_else(|| ".tmp".to_string()),
    );
    {
        let mut file = fs::File::create(&tmp)?;
        file.write_all(body)?;
        file.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}

pub fn create(name: &str, color: &str, surfaces: Surfaces) -> AppResult<Profile> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation("name must not be empty".to_string()));
    }
    if !is_valid_hex_color(color) {
        return Err(AppError::Validation(format!(
            "color must be a 7-char hex like #7C3AED, got '{color}'"
        )));
    }
    let slug = slugify(trimmed);
    if slug.is_empty() {
        return Err(AppError::Validation(
            "name produced an empty slug after sanitisation".to_string(),
        ));
    }

    let mut existing = load()?;
    if existing.iter().any(|profile| profile.slug == slug) {
        return Err(AppError::Validation(format!(
            "a profile with slug '{slug}' already exists"
        )));
    }

    let profile = Profile {
        id: Uuid::new_v4().to_string(),
        name: trimmed.to_string(),
        slug,
        color: color.to_string(),
        created_at: Utc::now().to_rfc3339(),
        surfaces,
    };

    let dir = profile_dir(&profile.id)?;
    if profile.surfaces.gui {
        fs::create_dir_all(dir.join("gui-data"))?;
    }
    if profile.surfaces.cli {
        fs::create_dir_all(dir.join("cli-config"))?;
    }

    // Generate launchers BEFORE persisting, so a launcher failure rolls back cleanly.
    if profile.surfaces.gui {
        if let Err(err) = crate::launchers::gui::generate(&profile, env!("CARGO_PKG_VERSION")) {
            let _ = std::fs::remove_dir_all(&dir);
            return Err(err);
        }
    }

    if profile.surfaces.cli {
        if let Err(err) = crate::launchers::cli::generate(&profile) {
            if profile.surfaces.gui {
                let _ = crate::launchers::gui::remove(&profile.name);
            }
            let _ = std::fs::remove_dir_all(&dir);
            return Err(err);
        }
    }

    existing.push(profile.clone());
    if let Err(err) = save_all(&existing) {
        if profile.surfaces.cli {
            let _ = crate::launchers::cli::remove(&profile.slug);
        }
        if profile.surfaces.gui {
            let _ = crate::launchers::gui::remove(&profile.name);
        }
        let _ = std::fs::remove_dir_all(&dir);
        return Err(err);
    }
    Ok(profile)
}

fn is_valid_hex_color(color: &str) -> bool {
    if color.len() != 7 || !color.starts_with('#') {
        return false;
    }
    color.chars().skip(1).all(|ch| ch.is_ascii_hexdigit())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_color_validator_accepts_correct_format() {
        assert!(is_valid_hex_color("#7C3AED"));
        assert!(is_valid_hex_color("#000000"));
        assert!(is_valid_hex_color("#ffffff"));
    }

    #[test]
    fn hex_color_validator_rejects_bad_input() {
        assert!(!is_valid_hex_color("7C3AED"));
        assert!(!is_valid_hex_color("#7C3AE"));
        assert!(!is_valid_hex_color("#GGGGGG"));
        assert!(!is_valid_hex_color(""));
    }

    #[test]
    fn profile_roundtrips_through_json() {
        let original = Profile {
            id: "11111111-1111-1111-1111-111111111111".to_string(),
            name: "Personal".to_string(),
            slug: "personal".to_string(),
            color: "#7C3AED".to_string(),
            created_at: "2026-05-20T12:00:00Z".to_string(),
            surfaces: Surfaces {
                gui: true,
                cli: true,
            },
        };
        let raw = serde_json::to_string(&original).unwrap();
        let parsed: Profile = serde_json::from_str(&raw).unwrap();
        assert_eq!(parsed, original);
        assert!(raw.contains(r#""createdAt""#));
    }
}
