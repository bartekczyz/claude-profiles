//! Craft surfaces a profile inherits from the stock install.
//!
//! Pointing `CLAUDE_CONFIG_DIR` (or `CODEX_HOME`) at a profile's `cli-config`
//! isolates *everything* the CLI reads, not just credentials — skills, subagents,
//! slash commands, rules and the global instructions file all resolve relative to
//! that dir. A freshly created profile therefore starts with none of them, while
//! the GUI launcher exports no config env for Claude at all and so keeps reading
//! the stock `~/.claude`. Same profile, two different answers to "what skills do
//! I have".
//!
//! This module closes that gap from the CLI side: for each entry in
//! [`AppSpec::shared_surfaces`] it drops a symlink in the profile's config dir
//! pointing back at the stock install. See that field's docs for which surfaces
//! are shared and, more importantly, which are deliberately not.
//!
//! ## Never clobber
//!
//! A link is created only when the profile path is *vacant*. Anything already
//! there — a real directory, a file, or a link the user aimed elsewhere — is left
//! alone and reported as [`LinkOutcome::Occupied`]. That mirrors the guarantee
//! `launchers::cli` makes with its marker comment (never overwrite what we did not
//! create), and doubles as the per-profile opt-out: replace a link with a real
//! directory and the profile keeps its own copy across regeneration.

use std::fs;
use std::path::Path;

use crate::app_kind::AppSpec;

/// What linking one surface did. Every variant except [`LinkOutcome::Failed`] is
/// a normal, expected result — most profiles will report a mix.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LinkOutcome {
    /// A new symlink was created in the profile's config dir.
    Linked,
    /// A link to the stock surface was already in place. No-op.
    AlreadyLinked,
    /// The stock install has no such surface, so there is nothing to inherit.
    /// Not an error: linking runs again on every wrapper regeneration, so a
    /// surface the user creates later gets picked up then.
    SourceMissing,
    /// Something we did not create already occupies the profile path. Left
    /// untouched — this is the opt-out.
    Occupied,
    /// Creating the symlink failed. Non-fatal: the profile still works, it just
    /// does not inherit this surface.
    Failed(String),
}

/// Link every shared surface of `spec` from `stock_config` into `cli_config`.
///
/// Returns one outcome per surface, in `spec.shared_surfaces` order, so callers
/// (and tests) can see exactly what happened. Never returns `Err`: a profile
/// whose surfaces cannot be linked is degraded, not broken, and wrapper
/// generation must not fail because of it.
pub fn link_shared_surfaces(
    stock_config: &Path,
    cli_config: &Path,
    spec: &AppSpec,
) -> Vec<(&'static str, LinkOutcome)> {
    if fs::create_dir_all(cli_config).is_err() {
        return spec
            .shared_surfaces
            .iter()
            .map(|surface| {
                let reason = format!("could not create {}", cli_config.display());
                (*surface, LinkOutcome::Failed(reason))
            })
            .collect();
    }

    spec.shared_surfaces
        .iter()
        .map(|surface| (*surface, link_one(stock_config, cli_config, surface)))
        .collect()
}

fn link_one(stock_config: &Path, cli_config: &Path, surface: &str) -> LinkOutcome {
    let source = stock_config.join(surface);
    // `exists` follows symlinks, so a dangling link in the stock dir counts as
    // missing — inheriting it would only propagate the breakage.
    if !source.exists() {
        return LinkOutcome::SourceMissing;
    }

    let destination = cli_config.join(surface);
    // `symlink_metadata` deliberately does not follow links: we need to know
    // whether the path itself is occupied, including by a dangling link.
    if fs::symlink_metadata(&destination).is_ok() {
        let points_at_source = fs::read_link(&destination)
            .map(|target| target == source)
            .unwrap_or(false);
        if points_at_source {
            return LinkOutcome::AlreadyLinked;
        }
        return LinkOutcome::Occupied;
    }

    match std::os::unix::fs::symlink(&source, &destination) {
        Ok(()) => LinkOutcome::Linked,
        Err(err) => LinkOutcome::Failed(err.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app_kind::{CLAUDE, CODEX};
    use std::path::PathBuf;
    use tempfile::tempdir;

    /// A spec with a single surface keeps the linking assertions focused; the
    /// real specs are covered by the coverage tests at the bottom.
    const ONE_SURFACE: AppSpec = AppSpec {
        shared_surfaces: &["skills"],
        ..CLAUDE
    };

    fn outcome_for(results: &[(&'static str, LinkOutcome)], surface: &str) -> LinkOutcome {
        results
            .iter()
            .find(|(name, _)| *name == surface)
            .map(|(_, outcome)| outcome.clone())
            .unwrap_or_else(|| panic!("no outcome reported for {surface}"))
    }

    fn stock_with_skills() -> (tempfile::TempDir, PathBuf) {
        let stock = tempdir().unwrap();
        let skills = stock.path().join("skills");
        fs::create_dir_all(skills.join("grilling")).unwrap();
        let path = stock.path().to_path_buf();
        (stock, path)
    }

    #[test]
    fn links_a_surface_present_in_the_stock_install() {
        let (_stock, stock_path) = stock_with_skills();
        let profile = tempdir().unwrap();

        let results = link_shared_surfaces(&stock_path, profile.path(), &ONE_SURFACE);

        assert_eq!(outcome_for(&results, "skills"), LinkOutcome::Linked);
        let linked = profile.path().join("skills");
        assert!(fs::symlink_metadata(&linked).unwrap().is_symlink());
        assert!(linked.join("grilling").is_dir(), "link must resolve");
    }

    #[test]
    fn skips_a_surface_the_stock_install_does_not_have() {
        let stock = tempdir().unwrap();
        let profile = tempdir().unwrap();

        let results = link_shared_surfaces(stock.path(), profile.path(), &ONE_SURFACE);

        assert_eq!(outcome_for(&results, "skills"), LinkOutcome::SourceMissing);
        assert!(
            !profile.path().join("skills").exists(),
            "must not create a dangling link"
        );
    }

    #[test]
    fn is_idempotent_across_repeated_generation() {
        let (_stock, stock_path) = stock_with_skills();
        let profile = tempdir().unwrap();

        link_shared_surfaces(&stock_path, profile.path(), &ONE_SURFACE);
        let results = link_shared_surfaces(&stock_path, profile.path(), &ONE_SURFACE);

        assert_eq!(outcome_for(&results, "skills"), LinkOutcome::AlreadyLinked);
        assert!(profile.path().join("skills").join("grilling").is_dir());
    }

    #[test]
    fn leaves_a_real_directory_alone_so_profiles_can_opt_out() {
        let (_stock, stock_path) = stock_with_skills();
        let profile = tempdir().unwrap();
        let own_skills = profile.path().join("skills");
        fs::create_dir_all(own_skills.join("profile-only")).unwrap();

        let results = link_shared_surfaces(&stock_path, profile.path(), &ONE_SURFACE);

        assert_eq!(outcome_for(&results, "skills"), LinkOutcome::Occupied);
        assert!(!fs::symlink_metadata(&own_skills).unwrap().is_symlink());
        assert!(own_skills.join("profile-only").is_dir());
        assert!(
            !own_skills.join("grilling").exists(),
            "stock skills must not leak into an opted-out profile"
        );
    }

    #[test]
    fn leaves_a_link_the_user_aimed_elsewhere_alone() {
        let (_stock, stock_path) = stock_with_skills();
        let elsewhere = tempdir().unwrap();
        fs::create_dir_all(elsewhere.path().join("bespoke")).unwrap();
        let profile = tempdir().unwrap();
        let destination = profile.path().join("skills");
        std::os::unix::fs::symlink(elsewhere.path(), &destination).unwrap();

        let results = link_shared_surfaces(&stock_path, profile.path(), &ONE_SURFACE);

        assert_eq!(outcome_for(&results, "skills"), LinkOutcome::Occupied);
        assert_eq!(fs::read_link(&destination).unwrap(), elsewhere.path());
    }

    #[test]
    fn reports_every_surface_even_when_none_are_present() {
        let stock = tempdir().unwrap();
        let profile = tempdir().unwrap();

        let results = link_shared_surfaces(stock.path(), profile.path(), &CLAUDE);

        assert_eq!(results.len(), CLAUDE.shared_surfaces.len());
        assert!(results
            .iter()
            .all(|(_, outcome)| *outcome == LinkOutcome::SourceMissing));
    }

    #[test]
    fn links_a_file_surface_not_just_directories() {
        let stock = tempdir().unwrap();
        fs::write(stock.path().join("CLAUDE.md"), "# global instructions").unwrap();
        let profile = tempdir().unwrap();

        let results = link_shared_surfaces(stock.path(), profile.path(), &CLAUDE);

        assert_eq!(outcome_for(&results, "CLAUDE.md"), LinkOutcome::Linked);
        let linked = profile.path().join("CLAUDE.md");
        assert_eq!(fs::read_to_string(linked).unwrap(), "# global instructions");
    }

    #[test]
    fn missing_stock_config_dir_is_not_an_error() {
        let profile = tempdir().unwrap();
        let absent = PathBuf::from("/nonexistent/stock/config/dir");

        let results = link_shared_surfaces(&absent, profile.path(), &CLAUDE);

        assert!(results
            .iter()
            .all(|(_, outcome)| *outcome == LinkOutcome::SourceMissing));
    }

    #[test]
    fn creates_the_profile_config_dir_when_absent() {
        let (_stock, stock_path) = stock_with_skills();
        let parent = tempdir().unwrap();
        let cli_config = parent.path().join("cli-config");

        let results = link_shared_surfaces(&stock_path, &cli_config, &ONE_SURFACE);

        assert_eq!(outcome_for(&results, "skills"), LinkOutcome::Linked);
        assert!(cli_config.join("skills").join("grilling").is_dir());
    }

    #[test]
    fn shared_surfaces_never_include_credential_or_executable_state() {
        // Guards the isolation boundary itself: adding any of these to a spec
        // would leak hooks, permissions, MCP servers or auth across profiles.
        let forbidden = [
            "settings.json",
            "settings.local.json",
            "hooks",
            "plugins",
            ".claude.json",
            ".credentials.json",
            "auth.json",
            "config.toml",
            "history.jsonl",
            "projects",
            "sessions",
        ];
        for spec in [&CLAUDE, &CODEX] {
            for surface in spec.shared_surfaces {
                assert!(
                    !forbidden.contains(surface),
                    "{} must stay isolated per profile",
                    surface
                );
            }
        }
    }

    /// Deleting a profile runs `remove_dir_all` over its config dir, which now
    /// holds links into the *stock* install. If that ever followed links, one
    /// profile deletion would wipe the user's real skills. Pinned here because
    /// the blast radius is total and the behaviour lives in std, not our code.
    #[test]
    fn deleting_a_profile_config_dir_does_not_touch_the_stock_install() {
        let (_stock, stock_path) = stock_with_skills();
        let parent = tempdir().unwrap();
        let cli_config = parent.path().join("cli-config");
        link_shared_surfaces(&stock_path, &cli_config, &ONE_SURFACE);
        assert!(cli_config.join("skills").join("grilling").is_dir());

        fs::remove_dir_all(&cli_config).unwrap();

        assert!(!cli_config.exists());
        assert!(
            stock_path.join("skills").join("grilling").is_dir(),
            "profile deletion must never reach through the link"
        );
    }

    /// Opt-in end-to-end check against a real profile, mirroring the gated
    /// smoke tests elsewhere in the crate. Unit tests all run against tempdirs
    /// (`app_data_dir` is redirected under `cfg(test)`), so this is the only way
    /// to exercise the real stock install. Creates links but never clobbers, so
    /// it is safe to point at a profile in daily use.
    ///
    /// ```sh
    /// AI_PROFILES_SHARED_SMOKE="$HOME/Library/Application Support/ai-profiles/profiles/<id>/cli-config" \
    ///   cargo test --manifest-path apps/ai-profiles/src-tauri/Cargo.toml \
    ///   shared_surfaces_smoke -- --ignored --nocapture
    /// ```
    #[test]
    #[ignore]
    fn shared_surfaces_smoke() {
        let Ok(cli_config) = std::env::var("AI_PROFILES_SHARED_SMOKE") else {
            eprintln!("set AI_PROFILES_SHARED_SMOKE=<cli-config dir> to run");
            return;
        };
        let stock = crate::paths::stock_cli_config_dir(&CLAUDE).unwrap();
        let results = link_shared_surfaces(&stock, Path::new(&cli_config), &CLAUDE);
        for (surface, outcome) in &results {
            println!("{surface}: {outcome:?}");
        }
        assert!(results
            .iter()
            .all(|(_, outcome)| !matches!(outcome, LinkOutcome::Failed(_))));
    }

    #[test]
    fn each_app_shares_its_own_skills_surface() {
        assert!(CLAUDE.shared_surfaces.contains(&"skills"));
        assert!(CODEX.shared_surfaces.contains(&"skills"));
    }

    /// Each app reads user-scope instructions from *one* filename, and they
    /// differ. Verified by probe: with an identical body, a config-dir
    /// `CLAUDE.md` reaches Claude Code's prompt and a config-dir `AGENTS.md`
    /// does not (Claude Code honours `AGENTS.md` at project scope only, and its
    /// own Codex importer writes user-scope instructions to `CLAUDE.md`).
    /// Linking the wrong name would look supported while silently doing nothing.
    #[test]
    fn instruction_files_follow_each_app_rather_than_the_agents_md_convention() {
        assert!(CLAUDE.shared_surfaces.contains(&"CLAUDE.md"));
        assert!(!CLAUDE.shared_surfaces.contains(&"AGENTS.md"));

        assert!(CODEX.shared_surfaces.contains(&"AGENTS.md"));
        assert!(!CODEX.shared_surfaces.contains(&"CLAUDE.md"));
    }
}
