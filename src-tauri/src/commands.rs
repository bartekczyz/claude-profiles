use crate::error::{AppError, AppResult};
use crate::profiles::{self, Profile, Surfaces};

#[tauri::command]
pub fn list_profiles() -> AppResult<Vec<Profile>> {
    profiles::load()
}

#[tauri::command]
pub fn create_profile(name: String, color: String, surfaces: Surfaces) -> AppResult<Profile> {
    profiles::create(&name, &color, surfaces)
}

#[tauri::command]
pub fn regenerate_launchers(id: String) -> AppResult<()> {
    let profiles = profiles::load()?;
    let profile = profiles
        .iter()
        .find(|candidate| candidate.id == id)
        .ok_or_else(|| AppError::NotFound(format!("profile {id} not found")))?;
    if profile.surfaces.gui {
        crate::launchers::gui::generate(profile, env!("CARGO_PKG_VERSION"))?;
    }
    if profile.surfaces.cli {
        crate::launchers::cli::generate(profile)?;
    }
    Ok(())
}
