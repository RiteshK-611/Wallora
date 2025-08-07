use tauri::{AppHandle, Wry};
use tauri_plugin_store::StoreExt;
use tauri_plugin_autostart::ManagerExt;
use crate::types::{AppPersistentState, DateWidgetSettings, WallpaperSettings, WallpaperInfo};

const STORE_FILE: &str = "wallora-settings.json";
const STATE_KEY: &str = "app_state";

#[tauri::command]
pub async fn save_app_state(
    app: AppHandle<Wry>,
    state: AppPersistentState,
) -> Result<String, String> {
    let store = app.store(STORE_FILE).map_err(|e| format!("Failed to access store: {}", e))?;
    
    let state_value = serde_json::to_value(&state)
        .map_err(|e| format!("Failed to serialize state: {}", e))?;
    
    store.set(STATE_KEY, state_value);
    store.save().map_err(|e| format!("Failed to save store: {}", e))?;
    
    Ok("App state saved successfully".to_string())
}

#[tauri::command]
pub async fn load_app_state(app: AppHandle<Wry>) -> Result<AppPersistentState, String> {
    let store = app.store(STORE_FILE).map_err(|e| format!("Failed to access store: {}", e))?;
    
    match store.get(STATE_KEY) {
        Some(value) => {
            serde_json::from_value(value.clone())
                .map_err(|e| format!("Failed to deserialize state: {}", e))
        }
        None => Ok(AppPersistentState::default()),
    }
}

#[tauri::command]
pub async fn set_autostart(app: AppHandle<Wry>, enable: bool) -> Result<String, String> {
    let autostart_manager = app.autolaunch();
    
    if enable {
        autostart_manager.enable().map_err(|e| format!("Failed to enable autostart: {}", e))?;
    } else {
        autostart_manager.disable().map_err(|e| format!("Failed to disable autostart: {}", e))?;
    }
    
    // Update the persistent state
    let mut current_state = load_app_state(app.clone()).await.unwrap_or_default();
    current_state.autostart_enabled = enable;
    save_app_state(app, current_state).await?;
    
    Ok(format!("Autostart {}", if enable { "enabled" } else { "disabled" }))
}

#[tauri::command]
pub async fn get_autostart_status(app: AppHandle<Wry>) -> Result<bool, String> {
    let autostart_manager = app.autolaunch();
    autostart_manager.is_enabled().map_err(|e| format!("Failed to check autostart status: {}", e))
}

#[tauri::command]
pub async fn update_wallpaper_state(
    app: AppHandle<Wry>,
    wallpaper_path: String,
    file_type: String,
) -> Result<String, String> {
    let mut current_state = load_app_state(app.clone()).await.unwrap_or_default();
    current_state.last_wallpaper_path = Some(wallpaper_path);
    current_state.last_wallpaper_file_type = Some(file_type);
    save_app_state(app, current_state).await
}

#[tauri::command]
pub async fn update_date_widget_state(
    app: AppHandle<Wry>,
    settings: DateWidgetSettings,
) -> Result<String, String> {
    let mut current_state = load_app_state(app.clone()).await.unwrap_or_default();
    current_state.date_widget_settings = Some(settings);
    save_app_state(app, current_state).await
}

#[tauri::command]
pub async fn update_wallpaper_settings_state(
    app: AppHandle<Wry>,
    settings: WallpaperSettings,
) -> Result<String, String> {
    let mut current_state = load_app_state(app.clone()).await.unwrap_or_default();
    current_state.wallpaper_settings = Some(settings);
    save_app_state(app, current_state).await
}

#[tauri::command]
pub async fn save_wallpaper_list(
    app: AppHandle<Wry>,
    wallpapers: Vec<WallpaperInfo>,
) -> Result<String, String> {
    let mut current_state = load_app_state(app.clone()).await.unwrap_or_default();
    current_state.wallpaper_list = wallpapers;
    save_app_state(app, current_state).await
}