use tauri::{AppHandle, State, Wry};
use crate::state::AppState;
use tauri::Manager;

#[tauri::command]
pub async fn create_date_widget(
    app: AppHandle<Wry>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // Create unique window label for date widget
    let window_label = "date-widget";

    // Handle existing date widget
    {
        let mut date_widgets = state.date_widgets.lock().unwrap();
        if let Some(existing_label) = date_widgets.get("current") {
            if let Some(window) = app.get_webview_window(existing_label) {
                let _ = window.close();
            }
        }
        date_widgets.insert("current".to_string(), window_label.to_string());
    }

    // Create date widget window
    let date_window = tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        tauri::WebviewUrl::App("date-widget.html".into()),
    )
    .title("Date Widget")
    .minimizable(false)
    .maximizable(false)
    .closable(false)
    .resizable(false)
    .decorations(false)
    .shadow(false)
    .visible(false)
    .skip_taskbar(true)
    .always_on_top(false)
    .transparent(true)
    .inner_size(400.0, 200.0)
    .position(100.0, 100.0)
    .build()
    .map_err(|e| format!("Failed to create date widget window: {}", e))?;

    // Show window after setup
    date_window.show()
        .map_err(|e| format!("Failed to show date widget: {}", e))?;

    // Wait for window to be ready
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    // Windows-specific: Set window to desktop level
    #[cfg(target_os = "windows")]
    {
        let date_window_clone = date_window.clone();
        
        let result = tokio::task::spawn_blocking(move || {
            crate::platform::windows::set_widget_on_desktop(&date_window_clone)
        }).await;
        
        match result {
            Ok(Ok(_)) => {
                #[cfg(debug_assertions)]
                println!("Successfully positioned date widget on desktop");
            }
            Ok(Err(_e)) => {
                #[cfg(debug_assertions)]
                eprintln!("Failed to position date widget: {}", _e);
            }
            Err(_e) => {
                #[cfg(debug_assertions)]
                eprintln!("Failed to execute widget positioning task: {}", _e);
            }
        }
    }

    Ok("Date widget created successfully".to_string())
}

#[tauri::command]
pub async fn hide_date_widget(state: State<'_, AppState>, app: AppHandle<Wry>) -> Result<String, String> {
    let date_widgets = state.date_widgets.lock().unwrap();
    if let Some(window_label) = date_widgets.get("current") {
        if let Some(window) = app.get_webview_window(window_label) {
            window.hide().map_err(|e| format!("Failed to hide date widget: {}", e))?;
        }
    }
    Ok("Date widget hidden".to_string())
}

#[tauri::command]
pub async fn show_date_widget(state: State<'_, AppState>, app: AppHandle<Wry>) -> Result<String, String> {
    let date_widgets = state.date_widgets.lock().unwrap();
    if let Some(window_label) = date_widgets.get("current") {
        if let Some(window) = app.get_webview_window(window_label) {
            window.show().map_err(|e| format!("Failed to show date widget: {}", e))?;
        }
    }
    Ok("Date widget shown".to_string())
}

#[tauri::command]
pub async fn close_date_widget(state: State<'_, AppState>, app: AppHandle<Wry>) -> Result<String, String> {
    let mut date_widgets = state.date_widgets.lock().unwrap();
    if let Some(window_label) = date_widgets.get("current") {
        if let Some(window) = app.get_webview_window(window_label) {
            window.close().map_err(|e| format!("Failed to close date widget: {}", e))?;
        }
        date_widgets.remove("current");
    }
    Ok("Date widget closed".to_string())
}