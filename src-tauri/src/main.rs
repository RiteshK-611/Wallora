#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod types;
mod state;
mod utils;
mod platform;
mod tray;

use state::AppState;
use commands::*;
use tray::create_tray_menu;

fn main() {
    let app_state = AppState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .setup(|app| {
            create_tray_menu(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_static_wallpaper,
            create_video_wallpaper,
            stop_video_wallpaper,
            get_wallpaper_files,
            get_files_info,
            show_main_window,
            hide_main_window,
            create_date_widget,
            hide_date_widget,
            show_date_widget,
            close_date_widget
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}