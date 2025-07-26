use std::path::Path;

pub fn get_supported_extensions() -> [&'static str; 13] {
    [
        "jpg", "jpeg", "png", "bmp", "webp", "tiff", "tga",
        "mp4", "webm", "avi", "mov", "mkv", "gif"
    ]
}

// Utility function to check if a file is a video type
pub fn is_video_type(file_type: &str) -> bool {
    matches!(file_type.to_lowercase().as_str(), "mp4" | "webm" | "avi" | "mov" | "mkv")
}

// Utility function to check if a file is a GIF
pub fn is_gif_type(file_type: &str) -> bool {
    file_type.to_lowercase() == "gif"
}

pub fn get_mime_type(file_path: &str) -> String {
    let path = Path::new(file_path);
    let file_extension = path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    if file_extension == "gif" {
        "image/gif".to_string()
    } else {
        match file_extension.as_str() {
            "mp4" => "video/mp4",
            "webm" => "video/webm",
            "avi" => "video/avi",
            "mov" => "video/quicktime",
            "mkv" => "video/x-matroska",
            _ => "video/mp4",
        }.to_string()
    }
}