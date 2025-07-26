use std::path::PathBuf;
use walkdir::WalkDir;
use crate::types::WallpaperInfo;
use crate::utils::file_utils::get_supported_extensions;

#[tauri::command]
pub async fn get_wallpaper_files(directory: String) -> Result<Vec<WallpaperInfo>, String> {
    let mut wallpapers = Vec::new();
    let supported_extensions = get_supported_extensions();

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
pub async fn get_files_info(file_paths: Vec<String>) -> Result<Vec<WallpaperInfo>, String> {
    let mut wallpapers = Vec::new();
    let supported_extensions = get_supported_extensions();

    for file_path in file_paths {
        let path = PathBuf::from(&file_path);
        
        if !path.exists() {
            eprintln!("File does not exist: {}", file_path);
            continue;
        }
        
        if !path.is_file() {
            eprintln!("Path is not a file: {}", file_path);
            continue;
        }
        
        if let Some(extension) = path.extension() {
            if let Some(ext_str) = extension.to_str() {
                let ext_lower = ext_str.to_lowercase();
                if supported_extensions.contains(&ext_lower.as_str()) {
                    if let Ok(metadata) = std::fs::metadata(&path) {
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
                } else {
                    eprintln!("Unsupported file type: {}", ext_str);
                }
            }
        }
    }

    Ok(wallpapers)
}