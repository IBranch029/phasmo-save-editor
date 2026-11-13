//! Verifies the complete write path on a copy of the real save file.
//!
//! The test never touches the original save: it copies the file into a
//! temporary folder and runs the same command the application uses.

use std::fs;
use std::path::PathBuf;

use phasmo_save_editor_lib::commands::{apply_modifications, list_backups, load_save};
use phasmo_save_editor_lib::es3::document::Patch;
use serde_json::Value as JsonValue;

/// Copies the real save file into a temporary folder.
fn stage_copy() -> Option<(tempdir::TempDir, PathBuf)> {
    let home = std::env::var("USERPROFILE").ok()?;
    let source = PathBuf::from(home)
        .join("AppData")
        .join("LocalLow")
        .join("Kinetic Games")
        .join("Phasmophobia")
        .join("SaveFile.txt");

    if !source.is_file() {
        eprintln!("no Phasmophobia save file found - skipping the live check");
        return None;
    }

    let dir = tempdir::TempDir::new("phasmo-save-editor-test")?;
    let target = dir.path().join("SaveFile.txt");
    fs::copy(&source, &target).ok()?;
    Some((dir, target))
}

/// A tiny scoped temporary folder helper.
mod tempdir {
    use std::path::{Path, PathBuf};

    /// A temporary directory that removes itself when it is dropped.
    pub struct TempDir {
        path: PathBuf,
    }

    impl TempDir {
        pub fn new(prefix: &str) -> Option<Self> {
            let base = std::env::temp_dir().join(format!(
                "{prefix}-{}",
                std::process::id()
            ));
            let path = base.join(format!("{}", std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)));
            fs::create_dir_all(&path).ok()?;
            Some(Self { path })
        }

        pub fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    use std::fs;
}

#[test]
fn writes_the_modified_save_and_keeps_a_backup() {
    let Some((_guard, path)) = stage_copy() else {
        return;
    };

    let before = load_save(path.to_string_lossy().into_owned()).expect("load the save");
    let original_bytes = fs::read(&path).expect("read the save");
    let original_money = before.money.expect("money");

    let target_money = original_money + 123_456;

    let outcome = apply_modifications(
        path.to_string_lossy().into_owned(),
        vec![Patch {
            key: "PlayersMoney".into(),
            kind: phasmo_save_editor_lib::es3::document::PatchKind::Int,
            value: JsonValue::from(target_money),
        }],
        Some(false),
    )
    .expect("apply the modifications");

    // A backup has to exist and it has to hold the original file.
    assert!(
        !outcome.backup_path.is_empty(),
        "a backup path has to be reported"
    );
    let backup = PathBuf::from(&outcome.backup_path);
    assert!(backup.is_file(), "the backup has to exist");
    assert_eq!(
        fs::read(&backup).expect("read the backup"),
        original_bytes,
        "the backup has to be a copy of the original file"
    );

    // The file on disk has to have changed.
    let new_bytes = fs::read(&path).expect("read the save");
    assert_ne!(new_bytes, original_bytes, "the save file has to be rewritten");

    // The new file has to decrypt and hold the patched value.
    let after = load_save(path.to_string_lossy().into_owned()).expect("load the patched save");
    assert_eq!(after.money, Some(target_money));
    assert_eq!(after.level, before.level, "the level must not change");
    assert_eq!(after.experience, before.experience, "the experience must not change");
    assert_eq!(after.prestige, before.prestige, "the prestige must not change");
    assert_eq!(after.total_fields, before.total_fields);

    // The backup archive has to list the new backup.
    let backups = list_backups(path.to_string_lossy().into_owned()).expect("list the backups");
    assert!(!backups.is_empty(), "the backup has to be listed");
    assert_eq!(backups[0].path, outcome.backup_path);
}
