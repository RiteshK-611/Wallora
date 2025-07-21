#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State, Window, Wry, AppHandle,
};
use walkdir::WalkDir;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct WallpaperInfo {
    pub path: String,
    pub name: String,
    pub file_type: String,
    pub size: u64,
}

#[derive(Default)]
pub struct AppState {
    pub current_wallpaper: Mutex<Option<String>>,
    pub wallpaper_list: Mutex<Vec<WallpaperInfo>>,
    pub video_windows: Mutex<HashMap<String, String>>,
}

#[tauri::command]
async fn set_static_wallpaper(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        use std::ffi::CString;
        use winapi::um::winuser::{SystemParametersInfoA, SPI_SETDESKWALLPAPER, SPIF_UPDATEINIFILE, SPIF_SENDCHANGE};
        
        let path_cstring = CString::new(file_path.clone())
            .map_err(|_| "Invalid file path".to_string())?;
        
        unsafe {
            let result = SystemParametersInfoA(
                SPI_SETDESKWALLPAPER,
                0,
                path_cstring.as_ptr() as *mut _,
                SPIF_UPDATEINIFILE | SPIF_SENDCHANGE,
            );
            
            if result == 0 {
                return Err("Failed to set wallpaper".to_string());
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        let output = Command::new("osascript")
            .arg("-e")
            .arg(format!("tell application \"Finder\" to set desktop picture to POSIX file \"{}\"", file_path))
            .output()
            .map_err(|e| format!("Failed to execute osascript: {}", e))?;

        if !output.status.success() {
            return Err("Failed to set wallpaper on macOS".to_string());
        }
    }

    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        
        let desktop_commands = [
            ("gsettings", vec!["set", "org.gnome.desktop.background", "picture-uri", &format!("file://{}", file_path)]),
            ("feh", vec!["--bg-fill", &file_path]),
            ("nitrogen", vec!["--set-scaled", &file_path]),
            ("xfconf-query", vec!["-c", "xfce4-desktop", "-p", "/backdrop/screen0/monitor0/workspace0/last-image", "-s", &file_path]),
        ];

        let mut success = false;
        for (cmd, args) in desktop_commands.iter() {
            if Command::new(cmd).args(args).output().is_ok() {
                success = true;
                break;
            }
        }
        
        if !success {
            return Err("Failed to set wallpaper on Linux".to_string());
        }
    }

    Ok(format!("Wallpaper set successfully: {}", file_path))
}

#[tauri::command]
async fn create_video_wallpaper(
    app: AppHandle<Wry>,
    file_path: String,
    converted_path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Err("Video file does not exist".to_string());
    }

    // Create unique window label
    let window_label = format!("wallpaper-{}", 
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
    );

    // Handle video windows state
    {
        let mut video_windows = state.video_windows.lock().unwrap();
        if let Some(existing_label) = video_windows.get("current") {
            if let Some(window) = app.get_webview_window(existing_label) {
                let _ = window.close();
            }
        }
        video_windows.insert("current".to_string(), window_label.clone());
    }

    // Get file extension and determine MIME type
    let file_extension = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let mime_type = if file_extension == "gif" {
        "image/gif"
    } else {
        match file_extension.as_str() {
            "mp4" => "video/mp4",
            "webm" => "video/webm",
            "avi" => "video/avi",
            "mov" => "video/quicktime",
            "mkv" => "video/x-matroska",
            _ => "video/mp4",
        }
    };

    // Create wallpaper window URL with parameters
    let wallpaper_url = format!(
        "wallpaper.html?path={}&type={}",
        urlencoding::encode(&converted_path),
        urlencoding::encode(mime_type)
    );

    // Create wallpaper window
    let video_window = tauri::WebviewWindowBuilder::new(
        &app,
        &window_label,
        tauri::WebviewUrl::App(wallpaper_url.into()),
    )
    .title("Video Wallpaper")
    .minimizable(false)
    .maximizable(false)
    .closable(false)
    .resizable(false)
    .decorations(false)
    .shadow(false)
    .visible(false)
    .skip_taskbar(true)
    .fullscreen(true)
    .build()
    .map_err(|e| format!("Failed to create wallpaper window: {}", e))?;

    // Set window to always be on bottom
    video_window.set_always_on_bottom(true)
        .map_err(|e| format!("Failed to set always on bottom: {}", e))?;

    // Show window after setup
    video_window.show()
        .map_err(|e| format!("Failed to show window: {}", e))?;

    // Wait for window to be ready
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    // Windows-specific: Use blocking task to avoid Send issues
    #[cfg(target_os = "windows")]
    {
        let video_window_clone = video_window.clone();
        
        // Spawn blocking task for Windows API calls - no Send trait required
        let result = tokio::task::spawn_blocking(move || {
            set_wallpaper_behind_desktop_sync(&video_window_clone)
        }).await;
        
        match result {
            Ok(Ok(_)) => {
                #[cfg(debug_assertions)]
                println!("Successfully set wallpaper behind desktop");
            }
            Ok(Err(_e)) => {
                #[cfg(debug_assertions)]
                eprintln!("Failed to set wallpaper behind desktop: {}", _e);
            }
            Err(_e) => {
                #[cfg(debug_assertions)]
                eprintln!("Failed to execute desktop integration task: {}", _e);
            }
        }
    }

    Ok(format!("Video wallpaper created successfully: {}", file_path))
}

// Synchronous Windows API function - no async, no Send trait issues
#[cfg(target_os = "windows")]
fn set_wallpaper_behind_desktop_sync(window: &tauri::WebviewWindow) -> Result<(), String> {
    use winapi::um::winuser::{FindWindowA, FindWindowExA, PostMessageW, SetParent};
    use winapi::shared::windef::HWND;
    use std::ffi::CString;

    // Get window handle
    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as HWND;

    // Get Progman window
    let progman_class = CString::new("Progman").map_err(|e| e.to_string())?;
    let progman = unsafe { FindWindowA(progman_class.as_ptr(), std::ptr::null()) };
    
    if progman.is_null() {
        return Err("Failed to find Progman window".to_string());
    }

    // Send message to spawn WorkerW
    unsafe { 
        PostMessageW(progman, 0x052C, 0xD, 0x1);
    }

    // Synchronous wait instead of async sleep
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Find WorkerW window
    let workerw_class = CString::new("WorkerW").map_err(|e| e.to_string())?;
    let shelldll_class = CString::new("SHELLDLL_DefView").map_err(|e| e.to_string())?;
    
    let mut worker_w = std::ptr::null_mut();
    
    // Find WorkerW that contains SHELLDLL_DefView
    let mut current_window = unsafe { FindWindowExA(std::ptr::null_mut(), std::ptr::null_mut(), workerw_class.as_ptr(), std::ptr::null()) };
    
    while !current_window.is_null() {
        let shell_view = unsafe { FindWindowExA(current_window, std::ptr::null_mut(), shelldll_class.as_ptr(), std::ptr::null()) };
        if !shell_view.is_null() {
            worker_w = unsafe { FindWindowExA(std::ptr::null_mut(), current_window, workerw_class.as_ptr(), std::ptr::null()) };
            break;
        }
        current_window = unsafe { FindWindowExA(std::ptr::null_mut(), current_window, workerw_class.as_ptr(), std::ptr::null()) };
    }
    
    // Case 2 fallback
    if worker_w.is_null() {
        worker_w = unsafe { FindWindowExA(progman, std::ptr::null_mut(), workerw_class.as_ptr(), std::ptr::null()) };
        
        let mut attempts = 0;
        while worker_w.is_null() && attempts < 10 {
            attempts += 1;
            std::thread::sleep(std::time::Duration::from_millis(100)); // Synchronous sleep
            worker_w = unsafe { FindWindowExA(progman, std::ptr::null_mut(), workerw_class.as_ptr(), std::ptr::null()) };
        }
    }

    if worker_w.is_null() {
        return Err("Failed to find WorkerW window".to_string());
    }

    // Set window as child of WorkerW
    unsafe {
        if SetParent(hwnd, worker_w).is_null() {
            return Err("Failed to set window parent".to_string());
        }
    }

    Ok(())
}

#[tauri::command]
async fn stop_video_wallpaper(state: State<'_, AppState>, app: AppHandle<Wry>) -> Result<String, String> {
    let mut video_windows = state.video_windows.lock().unwrap();
    if let Some(window_label) = video_windows.get("current") {
        if let Some(window) = app.get_webview_window(window_label) {
            window.close().map_err(|e| format!("Failed to close video window: {}", e))?;
        }
        video_windows.remove("current");
    }
    
    // Clean up temporary files
    let temp_dir = std::env::temp_dir().join("wallpaper_manager");
    if temp_dir.exists() {
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
    
    Ok("Video wallpaper stopped and cleaned up".to_string())
}

#[tauri::command]
async fn get_wallpaper_files(directory: String) -> Result<Vec<WallpaperInfo>, String> {
    let mut wallpapers = Vec::new();
    let supported_extensions = [
        "jpg", "jpeg", "png", "bmp", "webp", "tiff", "tga",
        "mp4", "webm", "avi", "mov", "mkv", "gif"
    ];

    for entry in WalkDir::new(directory)
        .follow_links(true)
        .max_depth(2)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        if let Some(extension) = path.extension() {
            if let Some(ext_str) = extension.to_str() {
                let ext_lower = ext_str.to_lowercase();
                if supported_extensions.contains(&ext_lower.as_str()) {
                    if let Ok(metadata) = std::fs::metadata(path) {
                        if metadata.is_file() {
                            wallpapers.push(WallpaperInfo {
                                path: path.to_string_lossy().to_string(),
                                name: path.file_name()
                                    .unwrap_or_default()
                                    .to_string_lossy()
                                    .to_string(),
                                file_type: ext_lower,
                                size: metadata.len(),
                            });
                        }
                    }
                }
            }
        }
    }

    wallpapers.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(wallpapers)
}

#[tauri::command]
async fn get_single_file_info(file_path: String) -> Result<WallpaperInfo, String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    
    if !metadata.is_file() {
        return Err("Path is not a file".to_string());
    }
    
    let file_extension = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let supported_extensions = [
        "jpg", "jpeg", "png", "bmp", "webp", "tiff", "tga",
        "mp4", "webm", "avi", "mov", "mkv", "gif"
    ];
    
    if !supported_extensions.contains(&file_extension.as_str()) {
        return Err("Unsupported file type".to_string());
    }
    
    Ok(WallpaperInfo {
        path: path.to_string_lossy().to_string(),
        name: path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        file_type: file_extension,
        size: metadata.len(),
    })
}


#[tauri::command]
async fn show_main_window(window: Window) -> Result<(), String> {
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn hide_main_window(window: Window) -> Result<(), String> {
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    let app_state = AppState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .setup(|app| {
            // Create tray menu
            let show = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
            let stop_video = MenuItem::with_id(app, "stop_video", "Stop Video Wallpaper", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &stop_video, &quit])?;

            // Create tray icon with event handling
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Wallpaper Manager")
                .on_menu_event(move |app, event| match event.id().as_ref() {
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
                            // Fixed: Use if let Some instead of if let Ok
                            if let Some(state) = app_clone.try_state::<AppState>() {
                                let _ = stop_video_wallpaper(state, app_clone.clone()).await;
                            }
                        });
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
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
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            set_static_wallpaper,
            create_video_wallpaper,
            stop_video_wallpaper,
            get_wallpaper_files,
            get_single_file_info,
            show_main_window,
            hide_main_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
