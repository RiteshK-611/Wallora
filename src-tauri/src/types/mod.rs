use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct WallpaperInfo {
    pub path: String,
    pub name: String,
    pub file_type: String,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DateWidgetSettings {
    pub enabled: bool,
    pub locked: bool,
    pub show_time: bool,
    pub bold_text: bool,
    pub scale: f64,
    pub color: String,
    pub font: String,
    pub alignment: String,
}