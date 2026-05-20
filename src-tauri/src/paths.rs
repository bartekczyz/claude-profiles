use std::path::PathBuf;

use crate::error::{AppError, AppResult};

const APP_DIR_NAME: &str = "claude-profiles";

pub fn app_data_dir() -> AppResult<PathBuf> {
    let base = dirs::data_dir().ok_or_else(|| {
        AppError::NotFound("could not determine macOS Application Support directory".to_string())
    })?;
    Ok(base.join(APP_DIR_NAME))
}

pub fn profiles_json_path() -> AppResult<PathBuf> {
    Ok(app_data_dir()?.join("profiles.json"))
}

pub fn profile_dir(id: &str) -> AppResult<PathBuf> {
    Ok(app_data_dir()?.join("profiles").join(id))
}

pub fn ensure_app_dir() -> AppResult<()> {
    let dir = app_data_dir()?;
    std::fs::create_dir_all(&dir)?;
    Ok(())
}
