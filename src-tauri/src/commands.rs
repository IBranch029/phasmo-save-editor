//! The Tauri command surface exposed to the React front end.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

use serde::Serialize;

use crate::error::AppError;
use crate::es3::crypto;
use crate::es3::document::{apply_patches, FieldKind, Patch, SaveDocument};
use crate::save;

/// Description of the save folder and its file.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveInfo {
    /// The folder the game uses by default.
    pub default_directory: String,
    /// The folder that is currently being inspected.
    pub directory: String,
    /// The full path of `SaveFile.txt`, when it exists.
    pub save_path: Option<String>,
    /// Whether the save file exists.
    pub exists: bool,
    /// Whether the game is currently running.
    pub game_running: bool,
    /// Every automatic backup of the save file, newest first.
    pub backups: Vec<BackupInfo>,
}

/// A single automatic backup.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    pub path: String,
    pub name: String,
    pub size_bytes: u64,
    pub created_at: String,
}

/// An integer field of the save file.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntField {
    pub key: String,
    pub value: i64,
}

/// A boolean field of the save file.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BoolField {
    pub key: String,
    pub value: bool,
}

/// A floating point field of the save file.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FloatField {
    pub key: String,
    pub value: f64,
}

/// Everything the dashboard needs to render a profile.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveProfile {
    pub path: String,
    pub size_bytes: u64,
    pub modified_at: String,
    pub save_version: Option<i64>,
    pub money: Option<i64>,
    pub experience: Option<i64>,
    pub level: Option<i64>,
    pub prestige: Option<i64>,
    pub reward_multiplier: Option<f64>,
    pub prestige_theme: Option<bool>,
    pub ints: Vec<IntField>,
    pub bools: Vec<BoolField>,
    pub floats: Vec<FloatField>,
    pub total_fields: usize,
}

/// The result of a successful write.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveOutcome {
    pub profile: SaveProfile,
    pub backup_path: String,
    pub bytes_written: usize,
}

/// Locates the save folder and reports what is inside it.
#[tauri::command]
pub fn detect_save(directory: Option<String>) -> Result<SaveInfo, AppError> {
    let default_directory = save::default_save_dir().ok_or_else(|| {
        AppError::NotFound("the user profile directory could not be resolved".into())
    })?;

    let chosen = match directory.as_deref() {
        Some(value) if !value.trim().is_empty() => PathBuf::from(value),
        _ => default_directory.clone(),
    };

    let save_path = save::save_file_in(&chosen);
    let exists = save_path.is_file();

    Ok(SaveInfo {
        default_directory: default_directory.to_string_lossy().into_owned(),
        directory: chosen.to_string_lossy().into_owned(),
        save_path: exists.then(|| save_path.to_string_lossy().into_owned()),
        exists,
        game_running: save::is_game_running(),
        backups: if exists {
            backup_infos(&save_path)
        } else {
            Vec::new()
        },
    })
}

/// Decrypts the save file and returns the editable profile.
#[tauri::command]
pub fn load_save(path: String) -> Result<SaveProfile, AppError> {
    let path = PathBuf::from(path);
    if !path.is_file() {
        return Err(AppError::NotFound(format!(
            "'{}' does not exist",
            path.display()
        )));
    }

    let bytes = fs::read(&path)
        .map_err(|error| AppError::Io(format!("could not read '{}': {error}", path.display())))?;
    let document = decode(&bytes)?;
    Ok(build_profile(&path, &document))
}

/// Applies the requested modifications and writes the save back to disk.
///
/// A timestamped backup is created before anything is written. The new payload
/// is decrypted again and compared against the original to make sure the save
/// survives the round trip before it replaces the file on disk.
#[tauri::command]
pub fn apply_modifications(
    path: String,
    patches: Vec<Patch>,
    force: Option<bool>,
) -> Result<SaveOutcome, AppError> {
    let path = PathBuf::from(path);
    if !path.is_file() {
        return Err(AppError::NotFound(format!(
            "'{}' does not exist",
            path.display()
        )));
    }

    if save::is_game_running() && !force.unwrap_or(false) {
        return Err(AppError::Conflict(
            "Phasmophobia is currently running. Close the game before writing to the save file."
                .into(),
        ));
    }

    let bytes = fs::read(&path)
        .map_err(|error| AppError::Io(format!("could not read '{}': {error}", path.display())))?;
    let document = decode(&bytes)?;

    let updated = apply_patches(&document, &patches)?;

    // The patched payload must still be a valid document.
    let verified = SaveDocument::parse(updated.clone())?;
    for patch in &patches {
        if verified.member(&patch.key).is_none() {
            return Err(AppError::Es3(format!(
                "the field '{}' disappeared while patching",
                patch.key
            )));
        }
    }

    let container = crypto::encrypt(updated.as_bytes())?;

    // Never write a container that cannot be read back.
    let round_trip = crypto::decrypt(&container)?;
    if round_trip != updated.as_bytes() {
        return Err(AppError::Es3(
            "the encrypted save did not survive a decryption round trip".into(),
        ));
    }

    // Safety net: the save must always be recoverable.
    let backup = save::create_backup(&path)?;
    save::write_atomic(&path, &container)?;

    Ok(SaveOutcome {
        profile: build_profile(&path, &verified),
        backup_path: backup.to_string_lossy().into_owned(),
        bytes_written: container.len(),
    })
}

/// Creates a timestamped backup of the save file.
#[tauri::command]
pub fn create_backup(path: String) -> Result<String, AppError> {
    let path = PathBuf::from(path);
    if !path.is_file() {
        return Err(AppError::NotFound(format!(
            "'{}' does not exist",
            path.display()
        )));
    }
    let backup = save::create_backup(&path)?;
    Ok(backup.to_string_lossy().into_owned())
}

/// Lists every automatic backup of the save file.
#[tauri::command]
pub fn list_backups(path: String) -> Result<Vec<BackupInfo>, AppError> {
    let path = PathBuf::from(path);
    Ok(backup_infos(&path))
}

/// Restores a backup over the current save file.
#[tauri::command]
pub fn restore_backup(path: String, backup: String) -> Result<SaveProfile, AppError> {
    let path = PathBuf::from(path);
    let backup = PathBuf::from(backup);

    if !backup.is_file() {
        return Err(AppError::NotFound(format!(
            "'{}' does not exist",
            backup.display()
        )));
    }

    let bytes = fs::read(&backup).map_err(|error| {
        AppError::Io(format!("could not read '{}': {error}", backup.display()))
    })?;

    // Validate the backup before it is put in place.
    let document = decode(&bytes)?;

    let _safety = save::create_backup(&path)?;
    save::write_atomic(&path, &bytes)?;

    Ok(build_profile(&path, &document))
}

/// Reports whether the game is currently running.
#[tauri::command]
pub fn game_running() -> bool {
    save::is_game_running()
}

/// Decodes an encrypted save file into a document.
fn decode(bytes: &[u8]) -> Result<SaveDocument, AppError> {
    let plaintext = crypto::decrypt(bytes)?;
    let text = String::from_utf8(plaintext)
        .map_err(|_| AppError::Es3("the decrypted save is not valid UTF-8".into()))?;
    SaveDocument::parse(text).map_err(AppError::from)
}

/// Collects the metadata of every backup of the given save file.
fn backup_infos(path: &Path) -> Vec<BackupInfo> {
    save::list_backups(path)
        .into_iter()
        .map(|backup| {
            let metadata = fs::metadata(&backup).ok();
            BackupInfo {
                name: backup
                    .file_name()
                    .map(|name| name.to_string_lossy().into_owned())
                    .unwrap_or_default(),
                path: backup.to_string_lossy().into_owned(),
                size_bytes: metadata.as_ref().map(|m| m.len()).unwrap_or(0),
                created_at: metadata
                    .as_ref()
                    .and_then(|m| m.modified().ok())
                    .map(|time| format_time(time.duration_since(UNIX_EPOCH).unwrap_or_default()))
                    .unwrap_or_default(),
            }
        })
        .collect()
}

/// Formats a duration since the Unix epoch as `YYYYMMDD-HHMMSSZ`.
fn format_time(duration: std::time::Duration) -> String {
    let seconds = duration.as_secs() as i64;
    let days = seconds.div_euclid(86_400);
    let time_of_day = seconds.rem_euclid(86_400);
    let (year, month, day) = civil_from_days(days);

    format!(
        "{year:04}{month:02}{day:02}-{:02}{:02}{:02}Z",
        time_of_day / 3600,
        (time_of_day % 3600) / 60,
        time_of_day % 60
    )
}

/// Converts a day number since the Unix epoch into a civil date.
fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let shifted = days + 719_468;
    let era = if shifted >= 0 {
        shifted
    } else {
        shifted - 146_096
    } / 146_097;
    let day_of_era = (shifted - era * 146_097) as u64;
    let year_of_era =
        (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let year = year_of_era as i64 + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = (day_of_year - (153 * month_prime + 2) / 5 + 1) as u32;
    let month = if month_prime < 10 {
        month_prime + 3
    } else {
        month_prime - 9
    } as u32;

    (if month <= 2 { year + 1 } else { year }, month, day)
}

/// Collects every scalar field of the document.
fn build_profile(path: &Path, document: &SaveDocument) -> SaveProfile {
    let mut ints = Vec::new();
    let mut bools = Vec::new();
    let mut floats = Vec::new();

    for member in document.members() {
        match document.field_kind(&member.key) {
            Some(FieldKind::Int) => {
                if let Some(value) = document.int(&member.key) {
                    ints.push(IntField {
                        key: member.key.clone(),
                        value,
                    });
                }
            }
            Some(FieldKind::Bool) => {
                if let Some(value) = document.boolean(&member.key) {
                    bools.push(BoolField {
                        key: member.key.clone(),
                        value,
                    });
                }
            }
            Some(FieldKind::Float) => {
                if let Some(value) = document.float(&member.key) {
                    floats.push(FloatField {
                        key: member.key.clone(),
                        value,
                    });
                }
            }
            _ => {}
        }
    }

    let metadata = fs::metadata(path).ok();

    SaveProfile {
        path: path.to_string_lossy().into_owned(),
        size_bytes: metadata.as_ref().map(|m| m.len()).unwrap_or(0),
        modified_at: metadata
            .as_ref()
            .and_then(|m| m.modified().ok())
            .map(|time| format_time(time.duration_since(UNIX_EPOCH).unwrap_or_default()))
            .unwrap_or_default(),
        save_version: document.int("SaveVersion"),
        money: document.int("PlayersMoney"),
        experience: document.int("Experience"),
        level: document.int("NewLevel"),
        prestige: document.int("PrestigeIndex"),
        reward_multiplier: document.float("RewardMultiplier"),
        prestige_theme: document.boolean("PrestigeTheme"),
        ints,
        bools,
        floats,
        total_fields: document.members().len(),
    }
}
