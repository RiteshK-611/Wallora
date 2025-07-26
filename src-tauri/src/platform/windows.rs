#[cfg(target_os = "windows")]
pub fn set_wallpaper_behind_desktop_sync(window: &tauri::WebviewWindow) -> Result<(), String> {
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

    // Brief wait for WorkerW to spawn
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
    
    // Fallback: Look for WorkerW under Progman
    if worker_w.is_null() {
        worker_w = unsafe { FindWindowExA(progman, std::ptr::null_mut(), workerw_class.as_ptr(), std::ptr::null()) };
        
        let mut attempts = 0;
        while worker_w.is_null() && attempts < 10 {
            attempts += 1;
            std::thread::sleep(std::time::Duration::from_millis(100));
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

#[cfg(target_os = "windows")]
pub fn set_widget_above_wallpaper(window: &tauri::WebviewWindow) -> Result<(), String> {
    use winapi::um::winuser::{SetWindowPos, HWND_BOTTOM, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE};
    use winapi::shared::windef::HWND;

    // Get window handle
    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0 as HWND;

    // Set window to bottom of Z-order (above wallpaper, below apps)
    unsafe {
        let result = SetWindowPos(
            hwnd,
            HWND_BOTTOM,
            0, 0, 0, 0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE
        );
        
        if result == 0 {
            return Err("Failed to position widget above wallpaper".to_string());
        }
    }

    Ok(())
}