use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, AppHandle, Wry,
};
use crate::state::AppState;
use crate::commands::stop_video_wallpaper;
use crate::commands::date_widget::center_to_position;
use crate::types::DateWidgetSettings;

pub fn create_tray_menu(app: &tauri::App) -> tauri::Result<()> {
    // Create tray menu
    let show = MenuItem::with_id(app, "show", "Show Settings", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide Settings", true, None::<&str>)?;
    let stop_video = MenuItem::with_id(app, "stop_video", "Stop Video Wallpaper", true, None::<&str>)?;
    let date_widget = MenuItem::with_id(app, "date_widget", "Toggle Date Widget", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &stop_video, &date_widget, &quit])?;
    // Create tray icon with event handling
    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("Wallora")
        .on_menu_event(move |app, event| {
            handle_tray_menu_event(app, event.id().as_ref());
        })
        .on_tray_icon_event(|tray, event| {
            handle_tray_icon_event(tray, event);
        })
        .build(app)?;

    Ok(())
}

fn handle_tray_menu_event(app: &AppHandle<Wry>, event_id: &str) {
    match event_id {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "hide" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.hide();
            }
        }
        "stop_video" => {
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Some(state) = app_clone.try_state::<AppState>() {
                    let _ = stop_video_wallpaper(state, app_clone.clone()).await;
                }
            });
        }
        "date_widget" => {
            let app_clone = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Some(state) = app_clone.try_state::<AppState>() {
                    let default_center_x = 400.0; // Default center X
                    let default_center_y = 300.0; // Default center Y
                    let (pos_x, pos_y) = center_to_position(default_center_x, default_center_y);

                    // Create default settings for tray toggle
                    let default_settings = DateWidgetSettings {
                        enabled: true,
                        locked: false,
                        show_time: true,
                        bold_text: false,
                        scale: 1.0,
                        color: "#FFFFFF".to_string(),
                        font: "Megrim".to_string(),
                        alignment: "center".to_string(),
                        position_x: pos_x,
                        position_y: pos_y,
                        center_x: default_center_x,
                        center_y: default_center_y
                    };
                    let _ = crate::commands::create_date_widget(app_clone.clone(), state, default_settings).await;
                }
            });
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

fn handle_tray_icon_event(tray: &tauri::tray::TrayIcon, event: TrayIconEvent) {
    match event {
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } => {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        _ => {}
    }
}