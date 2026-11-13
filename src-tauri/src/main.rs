// Hide the console window in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    phasmo_save_editor_lib::run()
}
