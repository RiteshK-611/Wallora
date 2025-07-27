use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct WallpaperInfo {
    pub path: String,
    pub name: String,
    pub file_type: String,
    pub size: u64,
}