use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub current_wallpaper: Mutex<Option<String>>,
    pub wallpaper_list: Mutex<Vec<crate::types::WallpaperInfo>>,
    pub video_windows: Mutex<HashMap<String, String>>,
}