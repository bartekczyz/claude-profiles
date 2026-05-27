//! Triggers Claude Code's built-in OAuth token refresh by spawning the
//! `claude` binary as a subprocess with the profile's `CLAUDE_CONFIG_DIR`
//! set and stdin closed.
//!
//! ## Why we delegate to Claude Code instead of refreshing ourselves
//!
//! The credentials blob stored by Claude Code includes a long-lived
//! `refreshToken` alongside the short-lived `accessToken`. Refreshing the
//! access token requires POSTing to Anthropic's OAuth token endpoint with
//! the refresh token and a `client_id` — neither of which is publicly
//! documented. Reverse-engineering them would couple us to undocumented
//! internals that can change without notice. Delegating to Claude Code
//! itself sidesteps that entire problem: when invoked it silently
//! refreshes its own token using its own knowledge of those endpoints.
//!
//! ## How the spawn works
//!
//! `claude < /dev/null > /dev/null 2>&1` exits cleanly within a few
//! hundred milliseconds — the REPL detects EOF on stdin during its
//! startup pass and exits before showing a prompt. The auth refresh
//! happens early in that startup pass, before stdin is read. We bound
//! the wait at 8s (matching the quota fetch timeout) and `kill_on_drop`
//! ensures the child is reaped if our timeout fires.

use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;

use async_trait::async_trait;

/// How long we'll wait for the spawned `claude` to finish refreshing
/// its token before giving up. Matches the quota fetch timeout.
const REFRESH_TIMEOUT: Duration = Duration::from_secs(8);

#[async_trait]
pub trait CliRefresher: Send + Sync {
    /// Best-effort: trigger a token refresh for the given profile config dir.
    /// Always returns — success is verified by the caller re-issuing the
    /// quota fetch, never by inspecting any return value here.
    async fn try_refresh(&self, cli_config_dir: &Path);
}

/// Production refresher. Spawns the real `claude` binary.
pub struct ClaudeCliRefresher;

#[async_trait]
impl CliRefresher for ClaudeCliRefresher {
    async fn try_refresh(&self, cli_config_dir: &Path) {
        let Some(binary) = find_claude_binary() else {
            return;
        };
        let mut command = tokio::process::Command::new(&binary);
        command
            .env("CLAUDE_CONFIG_DIR", cli_config_dir)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .kill_on_drop(true);
        let Ok(mut child) = command.spawn() else {
            return;
        };
        // We don't care about the exit status. If the timeout fires, the
        // future is dropped and `kill_on_drop` reaps the child.
        let _ = tokio::time::timeout(REFRESH_TIMEOUT, child.wait()).await;
    }
}

/// Locate the `claude` binary. Tauri apps launched from Finder/Dock have
/// a minimal PATH (`/usr/bin:/bin:/usr/sbin:/sbin`) that excludes common
/// install locations, so PATH lookup alone is unreliable. We try PATH
/// first, then fall back to the standard install locations on macOS.
fn find_claude_binary() -> Option<PathBuf> {
    let path_env = std::env::var_os("PATH");
    let home = dirs::home_dir();
    find_claude_binary_in(path_env.as_deref(), home.as_deref())
}

/// Pure variant used by both `find_claude_binary` and tests. Takes the
/// raw `PATH` env value and the user's home dir as explicit inputs.
fn find_claude_binary_in(
    path_env: Option<&std::ffi::OsStr>,
    home: Option<&Path>,
) -> Option<PathBuf> {
    if let Some(found) = path_env.and_then(|path| find_in_path("claude", path)) {
        return Some(found);
    }
    let mut fallbacks: Vec<PathBuf> = Vec::new();
    if let Some(home) = home {
        fallbacks.push(home.join(".local").join("bin").join("claude"));
        fallbacks.push(home.join(".claude").join("local").join("claude"));
    }
    fallbacks.push(PathBuf::from("/opt/homebrew/bin/claude"));
    fallbacks.push(PathBuf::from("/usr/local/bin/claude"));
    fallbacks.into_iter().find(|candidate| candidate.is_file())
}

/// Pure: walk a PATH-style env value looking for the first entry that
/// contains an executable file named `name`.
fn find_in_path(name: &str, path_env: &std::ffi::OsStr) -> Option<PathBuf> {
    for dir in std::env::split_paths(path_env) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate);
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::os::unix::fs::PermissionsExt;

    use tempfile::TempDir;

    use super::*;

    fn make_executable(path: &Path) {
        fs::write(path, "#!/bin/sh\nexit 0\n").unwrap();
        let mut perms = fs::metadata(path).unwrap().permissions();
        perms.set_mode(0o755);
        fs::set_permissions(path, perms).unwrap();
    }

    #[test]
    fn find_in_path_returns_first_match() {
        let first = TempDir::new().unwrap();
        let second = TempDir::new().unwrap();
        make_executable(&first.path().join("dummy-binary"));
        make_executable(&second.path().join("dummy-binary"));

        let combined = std::env::join_paths([first.path(), second.path()]).unwrap();
        let found = find_in_path("dummy-binary", &combined);
        assert_eq!(found.unwrap(), first.path().join("dummy-binary"));
    }

    #[test]
    fn find_in_path_returns_none_when_missing() {
        let dir = TempDir::new().unwrap();
        let path_env = std::ffi::OsString::from(dir.path());
        let result = find_in_path("definitely-not-here-9f86d081", &path_env);
        assert!(result.is_none());
    }

    #[test]
    fn find_claude_binary_in_prefers_path_over_fallbacks() {
        let path_dir = TempDir::new().unwrap();
        make_executable(&path_dir.path().join("claude"));
        let fake_home = TempDir::new().unwrap();
        // Also create a fallback so we can prove PATH wins.
        let fallback_dir = fake_home.path().join(".local").join("bin");
        fs::create_dir_all(&fallback_dir).unwrap();
        make_executable(&fallback_dir.join("claude"));

        let path_env = std::ffi::OsString::from(path_dir.path());
        let found = find_claude_binary_in(Some(&path_env), Some(fake_home.path()));
        assert_eq!(found.unwrap(), path_dir.path().join("claude"));
    }

    #[test]
    fn find_claude_binary_in_falls_back_to_home_when_path_misses() {
        let fake_home = TempDir::new().unwrap();
        let fallback_dir = fake_home.path().join(".local").join("bin");
        fs::create_dir_all(&fallback_dir).unwrap();
        let expected = fallback_dir.join("claude");
        make_executable(&expected);

        // Empty PATH-like input: a tempdir with no `claude` in it.
        let empty_path_dir = TempDir::new().unwrap();
        let path_env = std::ffi::OsString::from(empty_path_dir.path());
        let found = find_claude_binary_in(Some(&path_env), Some(fake_home.path()));
        assert_eq!(found.unwrap(), expected);
    }

    // No "returns None when nothing found" test — `/opt/homebrew/bin/claude`
    // and `/usr/local/bin/claude` are real paths that may exist on the
    // test runner and we don't want a system-state-dependent flake.
}
