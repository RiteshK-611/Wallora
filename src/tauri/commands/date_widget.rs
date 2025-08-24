use tauri::{AppHandle, State, Wry, WebviewUrl};
use crate::state::AppState;
use crate::types::DateWidgetSettings;
use crate::commands::update_date_widget_state;
use tauri::Manager;
use serde_json;

const WIDGET_WIDTH: f64 = 670.0;
const WIDGET_HEIGHT: f64 = 250.0;

// Convert top-left position to center point
fn position_to_center(x: f64, y: f64) -> (f64, f64) {
    (
        x + WIDGET_WIDTH / 2.0,
        y + WIDGET_HEIGHT / 2.0
    )
}

// Convert center point to top-left position
pub fn center_to_position(center_x: f64, center_y: f64) -> (f64, f64) {
    (
        center_x - WIDGET_WIDTH / 2.0,
        center_y - WIDGET_HEIGHT / 2.0
    )
}

// Validate center point and ensure widget remains visible
fn validate_center_point(center_x: f64, center_y: f64, screen_width: f64, screen_height: f64) -> (f64, f64) {
    let min_visible = 50.0;

    let min_center_x = min_visible;
    let max_center_x = screen_width - min_visible;
    let min_center_y = min_visible;
    let max_center_y = screen_height - min_visible;
    
    (
        center_x.max(min_center_x).min(max_center_x),
        center_y.max(min_center_y).min(max_center_y)
    )
}

#[tauri::command]
pub async fn create_date_widget(
    app: AppHandle,
    state: State<'_, AppState>,
    settings: DateWidgetSettings,
) -> Result<String, String> {
    let window_label = "date-widget";

    // Close any existing widget first
    {
        let mut date_widgets = state.date_widgets.lock().unwrap();
        if let Some(existing_label) = date_widgets.get("current") {
            if let Some(window) = app.get_webview_window(existing_label) {
                let _ = window.close();
            }
        }
        date_widgets.insert("current".to_string(), window_label.to_string());
    }

    // Get screen dimensions
    let screen_width = 1920.0; // Get actual screen size in production
    let screen_height = 1080.0;

    // Load saved settings and determine center point
    let (final_center_x, final_center_y) = if let Ok(current_state) = crate::commands::load_app_state(app.clone()).await {
        if let Some(saved_settings) = current_state.date_widget_settings {
            let center = if saved_settings.center_x != 0.0 || saved_settings.center_y != 0.0 {
                (saved_settings.center_x, saved_settings.center_y)
            } else {
                position_to_center(saved_settings.position_x, saved_settings.position_y)
            };
            
            #[cfg(debug_assertions)]
            println!("Loading saved center position: center_x={}, center_y={}", center.0, center.1);
            
            center
        } else {
            (400.0, 300.0) // Default center
        }
    } else {
        (400.0, 300.0) // Default center
    };

    // Validate center point
    let (validated_center_x, validated_center_y) = validate_center_point(
        final_center_x, 
        final_center_y, 
        screen_width, 
        screen_height
    );
    
    // Convert to window position
    let (window_x, window_y) = center_to_position(validated_center_x, validated_center_y);
    
    #[cfg(debug_assertions)]
    println!("Center validation: original=({}, {}), validated=({}, {}), calculated_window_pos=({}, {})", 
             final_center_x, final_center_y, 
             validated_center_x, validated_center_y,
             window_x, window_y);

    // Create final settings object
    let validated_settings = DateWidgetSettings {
        center_x: validated_center_x,
        center_y: validated_center_y,
        position_x: window_x,
        position_y: window_y,
        enabled: true,
        ..settings
    };

    // Serialize settings
    let settings_json = serde_json::to_string(&validated_settings).map_err(|e| e.to_string())?;
    let encoded_settings = urlencoding::encode(&settings_json);
    
    // Create window with EXACT calculated position
    let widget_url = format!("date-widget.html?settings={}", encoded_settings);
    let date_window = tauri::WebviewWindowBuilder::new(
        &app,
        window_label,
        WebviewUrl::App(widget_url.into()),
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
    .inner_size(WIDGET_WIDTH, WIDGET_HEIGHT)
    .position(window_x, window_y)  // Use exact calculated position
    .build()
    .map_err(|e| format!("Failed to create date widget window: {}", e))?;

    #[cfg(debug_assertions)]
    if let Ok(pos_after_build) = date_window.outer_position() {
        println!("Position immediately after build: x={}, y={}", pos_after_build.x, pos_after_build.y);
    }

    // Show window
    date_window.show().map_err(|e| format!("Failed to show date widget: {}", e))?;
    
    #[cfg(debug_assertions)]
    if let Ok(pos_after_show) = date_window.outer_position() {
        println!("Position after show: x={}, y={}", pos_after_show.x, pos_after_show.y);
    }

    // DISABLE Windows platform code temporarily to test
    #[cfg(target_os = "windows")]
    {
        println!("Skipping Windows platform code for position testing");
        // Commenting out to isolate the issue        
        let date_window_clone = date_window.clone();
        let _ = tokio::task::spawn_blocking(move || {
            crate::platform::windows::set_widget_on_desktop(&date_window_clone)
        }).await;
    }
    
    #[cfg(debug_assertions)]
    if let Ok(pos_after_delay) = date_window.outer_position() {
        println!("Position after delay: x={}, y={}", pos_after_delay.x, pos_after_delay.y);
    }

    // Force set position to exact coordinates as final step
    date_window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: window_x as i32,
        y: window_y as i32,
    })).map_err(|e| format!("Failed to force set position: {}", e))?;

    // Final position verification
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    
    if let Ok(final_pos) = date_window.outer_position() {
        let (actual_center_x, actual_center_y) = position_to_center(final_pos.x as f64, final_pos.y as f64);
        println!("FINAL position: x={}, y={} (center: {}, {}) - Expected center: ({}, {})", 
                final_pos.x, final_pos.y, actual_center_x, actual_center_y,
                validated_center_x, validated_center_y);
        
        // Check if position is correct
        let position_error_x = (final_pos.x as f64 - window_x).abs();
        let position_error_y = (final_pos.y as f64 - window_y).abs();
        
        if position_error_x > 5.0 || position_error_y > 5.0 {
            println!("WARNING: Position error detected! Expected ({}, {}), got ({}, {})", 
                    window_x, window_y, final_pos.x, final_pos.y);
        }
    }

    // Set up movement tracking
    let app_clone = app.clone();
    date_window.on_window_event(move |event| {
        if let tauri::WindowEvent::Moved(position) = event {
            let app_handle = app_clone.clone();
            let pos = *position;
            
            let (center_x, center_y) = position_to_center(pos.x as f64, pos.y as f64);
            
            std::thread::spawn(move || {
                tauri::async_runtime::block_on(async move {
                    if let Ok(current_state) = crate::commands::load_app_state(app_handle.clone()).await {
                        if let Some(mut widget_settings) = current_state.date_widget_settings {
                            widget_settings.center_x = center_x;
                            widget_settings.center_y = center_y;
                            widget_settings.position_x = pos.x as f64;
                            widget_settings.position_y = pos.y as f64;
                            
                            if let Err(e) = update_date_widget_state(app_handle.clone(), widget_settings).await {
                                #[cfg(debug_assertions)]
                                eprintln!("Failed to save center position: {}", e);
                            }
                            
                            #[cfg(debug_assertions)]
                            println!("Center position saved: center_x={}, center_y={} (from window pos: x={}, y={})", 
                                    center_x, center_y, pos.x, pos.y);
                        }
                    }
                });
            });
        }
    });

    // Save validated settings
    let _ = update_date_widget_state(app.clone(), validated_settings).await;

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
    let window_label = {
        let date_widgets = state.date_widgets.lock().unwrap();
        date_widgets.get("current").cloned()
    };
    
    if let Some(label) = window_label {
        if let Some(window) = app.get_webview_window(&label) {
            window.close().map_err(|e| format!("Failed to close date widget: {}", e))?;
        }
        let mut date_widgets = state.date_widgets.lock().unwrap();
        date_widgets.remove("current");
    }
    
    // Update state to reflect widget is disabled
    let current_state = crate::commands::load_app_state(app.clone()).await.unwrap_or_default();
    if let Some(mut widget_settings) = current_state.date_widget_settings {
        widget_settings.enabled = false;
        let _ = update_date_widget_state(app, widget_settings).await;
    }
    
    Ok("Date widget closed".to_string())
}

#[tauri::command]
pub async fn update_widget_property(
    state: State<'_, AppState>,
    app: AppHandle<Wry>,
    key: String,
    value: String
) -> Result<String, String> {
    let window_label = {
        let date_widgets = state.date_widgets.lock().unwrap();
        date_widgets.get("current").cloned()
    };

    if let Some(label) = window_label {
        if let Some(window) = app.get_webview_window(&label) {
            let value_js = match key.as_str() {
                // booleans, numbers, etc. - don't quote
                "scale" => value.clone(),
                "bold_text" | "locked" | "show_time" => value.clone(), // if always "true"/"false" as bool
                _ => format!("\"{}\"", value),
            };
            let js = format!(
                "settings['{key}'] = {value_js}; if (window.applySettings) window.applySettings();",
                key = key,
                value_js = value_js
            );
            window.eval(&js).map_err(|e| format!("Failed: {}", e))?;
        } else {
            return Err("Date widget window not found".to_string());     
        }
    }

    Ok("Updated".to_string())
}