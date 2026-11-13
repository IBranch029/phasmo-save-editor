//! PhasmoSave Editor - a desktop editor for local Phasmophobia profile saves.

pub mod commands;
pub mod error;
pub mod es3;
pub mod save;

/// Boots the Tauri application.
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::detect_save,
            commands::load_save,
            commands::apply_modifications,
            commands::create_backup,
            commands::list_backups,
            commands::restore_backup,
            commands::game_running,
        ])
        .run(tauri::generate_context!())
        .expect("the PhasmoSave Editor application failed to start");
}
