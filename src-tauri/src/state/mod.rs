use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    pub video_windows: Mutex<HashMap<String, String>>,
}