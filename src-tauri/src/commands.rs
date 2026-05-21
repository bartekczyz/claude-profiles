use std::process::Command;

use crate::error::{AppError, AppResult};
use crate::migration::{self, ExistingInstall, ImportParams, MigrationBackupInfo};
use crate::paths::{
    claude_code_install_path, claude_desktop_install_path, gui_launcher_path,
    next_migration_backup_dir, profile_dir as profile_data_dir,
};
use crate::profiles::{self, Profile, ProfilePatch, ProfilePaths, Surface, Surfaces};

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

#[tauri::command]
pub fn update_profile(id: String, patch: ProfilePatch) -> AppResult<Profile> {
    profiles::update(&id, patch)
}

#[tauri::command]
pub fn delete_profile(id: String, move_to_trash: bool) -> AppResult<()> {
    profiles::delete(&id, move_to_trash)
}

#[tauri::command]
pub fn toggle_surface(id: String, surface: Surface, enabled: bool) -> AppResult<Profile> {
    profiles::toggle_surface(&id, surface, enabled)
}

#[tauri::command]
pub fn open_profile_in_app(id: String) -> AppResult<()> {
    let all = profiles::load()?;
    let profile = all
        .iter()
        .find(|candidate| candidate.id == id)
        .ok_or_else(|| AppError::NotFound(format!("profile {id} not found")))?;
    if !profile.surfaces.gui {
        return Err(AppError::Validation("profile has no GUI surface".into()));
    }
    let app_path = gui_launcher_path(&profile.name);
    let status = Command::new("open")
        .arg(&app_path)
        .status()
        .map_err(AppError::Io)?;
    if !status.success() {
        return Err(AppError::Validation(format!(
            "`open {}` exited with status {status}",
            app_path.display()
        )));
    }
    Ok(())
}

#[tauri::command]
pub fn open_in_finder(path: String) -> AppResult<()> {
    let target = std::path::Path::new(&path);
    if !target.exists() {
        return Err(AppError::NotFound(format!("path does not exist: {path}")));
    }
    let status = Command::new("open")
        .arg("-R")
        .arg(&path)
        .status()
        .map_err(AppError::Io)?;
    if !status.success() {
        return Err(AppError::Validation(format!(
            "`open -R {path}` exited with status {status}"
        )));
    }
    Ok(())
}

#[tauri::command]
pub fn profile_paths(id: String) -> AppResult<ProfilePaths> {
    profiles::paths(&id)
}

#[tauri::command]
pub fn detect_existing_claude_install() -> AppResult<ExistingInstall> {
    let desktop = claude_desktop_install_path()?;
    let code = claude_code_install_path()?;
    Ok(migration::detect(&desktop, &code))
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportExistingInput {
    pub name: String,
    pub color: String,
    pub include_gui: bool,
    pub include_cli: bool,
}

#[tauri::command]
pub fn import_existing_install(input: ImportExistingInput) -> AppResult<Profile> {
    let desktop_path = claude_desktop_install_path()?;
    let cli_path = claude_code_install_path()?;
    let existing = migration::detect(&desktop_path, &cli_path);

    if input.include_gui && existing.claude_desktop_path.is_none() {
        return Err(AppError::NotFound(
            "no existing Claude Desktop install found".into(),
        ));
    }
    if input.include_cli && existing.claude_code_path.is_none() {
        return Err(AppError::NotFound(
            "no existing Claude Code install found".into(),
        ));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let dir = profile_data_dir(&id)?;
    let backup = next_migration_backup_dir()?;

    let outcome = migration::import(ImportParams {
        id,
        name: input.name,
        color: input.color,
        include_gui: input.include_gui,
        include_cli: input.include_cli,
        gui_source: input.include_gui.then_some(desktop_path),
        cli_source: input.include_cli.then_some(cli_path),
        profile_dir: dir.clone(),
        backup_dir: backup.clone(),
    })?;

    if outcome.profile.surfaces.gui {
        if let Err(err) =
            crate::launchers::gui::generate(&outcome.profile, env!("CARGO_PKG_VERSION"))
        {
            rollback_import(&outcome.profile, &dir, &backup);
            return Err(err);
        }
    }
    if outcome.profile.surfaces.cli {
        if let Err(err) = crate::launchers::cli::generate(&outcome.profile) {
            if outcome.profile.surfaces.gui {
                let _ = crate::launchers::gui::remove(&outcome.profile.name);
            }
            rollback_import(&outcome.profile, &dir, &backup);
            return Err(err);
        }
    }

    let mut all = profiles::load()?;
    all.push(outcome.profile.clone());
    if let Err(err) = profiles::save_all(&all) {
        if outcome.profile.surfaces.cli {
            let _ = crate::launchers::cli::remove(&outcome.profile.slug);
        }
        if outcome.profile.surfaces.gui {
            let _ = crate::launchers::gui::remove(&outcome.profile.name);
        }
        rollback_import(&outcome.profile, &dir, &backup);
        return Err(err);
    }

    Ok(outcome.profile)
}

fn rollback_import(
    profile: &Profile,
    profile_dir_path: &std::path::Path,
    backup: &std::path::Path,
) {
    if profile.surfaces.gui {
        let backup_gui = backup.join("Claude");
        let original = claude_desktop_install_path().ok();
        if let (true, Some(target)) = (backup_gui.exists(), original) {
            let _ = std::fs::rename(&backup_gui, &target);
        }
    }
    if profile.surfaces.cli {
        let backup_cli = backup.join(".claude");
        let original = claude_code_install_path().ok();
        if let (true, Some(target)) = (backup_cli.exists(), original) {
            let _ = std::fs::rename(&backup_cli, &target);
        }
    }
    let _ = std::fs::remove_dir_all(backup);
    let _ = std::fs::remove_dir_all(profile_dir_path);
}

#[tauri::command]
pub fn list_migration_backups() -> AppResult<Vec<MigrationBackupInfo>> {
    let root = crate::paths::app_data_dir()?;
    migration::list_backups(&root)
}

#[tauri::command]
pub fn delete_migration_backup(path: String) -> AppResult<()> {
    migration::delete_backup(std::path::Path::new(&path))
}
