//! File system helpers: locating the save folder, backups and atomic writes.

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::AppError;

/// The profile save file inside the Phasmophobia data folder.
pub const SAVE_FILE_NAME: &str = "SaveFile.txt";

/// Prefix of the automatic backups written next to the save file.
pub const BACKUP_PREFIX: &str = "SaveFile.txt.bak_";

/// The process name used by the game.
const GAME_PROCESS: &str = "phasmophobia.exe";

/// The environment variable that overrides the automatic save folder lookup.
pub const SAVE_DIR_ENV: &str = "PHASMO_SAVE_DIR";

/// Resolves `%USERPROFILE%\AppData\LocalLow\Kinetic Games\Phasmophobia`.
///
/// The folder can be overridden with the `PHASMO_SAVE_DIR` environment
/// variable, which turns the application into a portable build.
pub fn default_save_dir() -> Option<PathBuf> {
    if let Ok(custom) = std::env::var(SAVE_DIR_ENV) {
        let trimmed = custom.trim();
        if !trimmed.is_empty() {
            return Some(PathBuf::from(trimmed));
        }
    }

    dirs::home_dir().map(|home| {
        home.join("AppData")
            .join("LocalLow")
            .join("Kinetic Games")
            .join("Phasmophobia")
    })
}

/// Builds the path of the save file inside a data folder.
pub fn save_file_in(directory: &Path) -> PathBuf {
    directory.join(SAVE_FILE_NAME)
}

/// Checks whether the game is currently running.
pub fn is_game_running() -> bool {
    let output = Command::new("tasklist")
        .args(["/NH", "/FO", "CSV"])
        .output();

    match output {
        Ok(result) => {
            let listing = String::from_utf8_lossy(&result.stdout).to_ascii_lowercase();
            listing.contains(GAME_PROCESS)
        }
        Err(_) => false,
    }
}

/// Copies the save file to a timestamped backup next to it.
pub fn create_backup(path: &Path) -> Result<PathBuf, AppError> {
    let directory = path
        .parent()
        .ok_or_else(|| AppError::Io("the save file has no parent directory".into()))?;

    let target = directory.join(format!("{BACKUP_PREFIX}{}", timestamp_utc()));
    fs::copy(path, &target).map_err(|error| {
        AppError::Io(format!(
            "could not create the backup '{}': {error}",
            target.display()
        ))
    })?;

    Ok(target)
}

/// Lists every automatic backup of the given save file, newest first.
pub fn list_backups(path: &Path) -> Vec<PathBuf> {
    let Some(directory) = path.parent() else {
        return Vec::new();
    };
    let Ok(entries) = fs::read_dir(directory) else {
        return Vec::new();
    };

    let mut backups: Vec<PathBuf> = entries
        .flatten()
        .filter(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with(BACKUP_PREFIX)
        })
        .map(|entry| entry.path())
        .collect();

    backups.sort();
    backups.reverse();
    backups
}

/// Writes the payload to disk without ever leaving a half written save file.
pub fn write_atomic(path: &Path, data: &[u8]) -> Result<(), AppError> {
    let directory = path
        .parent()
        .ok_or_else(|| AppError::Io("the save file has no parent directory".into()))?;

    let temporary = directory.join(format!(".{SAVE_FILE_NAME}.tmp"));

    {
        let mut file = fs::File::create(&temporary).map_err(|error| {
            AppError::Io(format!(
                "could not create the temporary file '{}': {error}",
                temporary.display()
            ))
        })?;
        file.write_all(data)
            .map_err(|error| AppError::Io(format!("could not write the save file: {error}")))?;
        file.sync_all()
            .map_err(|error| AppError::Io(format!("could not flush the save file: {error}")))?;
    }

    if let Err(error) = fs::rename(&temporary, path) {
        let _ = fs::remove_file(&temporary);
        return Err(AppError::Io(format!(
            "could not replace the save file '{}': {error}",
            path.display()
        )));
    }

    Ok(())
}

/// Formats the current UTC time as `YYYYMMDD-HHMMSSZ`.
pub fn timestamp_utc() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let seconds = now.as_secs() as i64;
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
    let day_of_year =
        day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = (day_of_year - (153 * month_prime + 2) / 5 + 1) as u32;
    let month = if month_prime < 10 {
        month_prime + 3
    } else {
        month_prime - 9
    } as u32;

    (if month <= 2 { year + 1 } else { year }, month, day)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_a_known_timestamp() {
        // 2021-01-01T00:00:00Z is day 18628 of the Unix epoch.
        assert_eq!(civil_from_days(18_628), (2021, 1, 1));
        assert_eq!(civil_from_days(0), (1970, 1, 1));
    }

    #[test]
    fn builds_a_timestamp_with_the_expected_shape() {
        let stamp = timestamp_utc();
        assert_eq!(stamp.len(), 16);
        assert!(stamp.ends_with('Z'));
    }

    #[test]
    fn the_environment_variable_overrides_the_default_folder() {
        // The override is read on every call, so a test can set it safely.
        let previous = std::env::var(SAVE_DIR_ENV).ok();
        std::env::set_var(SAVE_DIR_ENV, "D:\\Portable\\Phasmophobia");
        assert_eq!(
            default_save_dir(),
            Some(PathBuf::from("D:\\Portable\\Phasmophobia"))
        );

        match previous {
            Some(value) => std::env::set_var(SAVE_DIR_ENV, value),
            None => std::env::remove_var(SAVE_DIR_ENV),
        }
    }
}
