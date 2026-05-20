use crate::error::AppResult;
use crate::profiles::{self, Profile, Surfaces};

#[tauri::command]
pub fn list_profiles() -> AppResult<Vec<Profile>> {
    profiles::load()
}

#[tauri::command]
pub fn create_profile(name: String, color: String, surfaces: Surfaces) -> AppResult<Profile> {
    profiles::create(&name, &color, surfaces)
}
