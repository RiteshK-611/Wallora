// Linux-specific functionality can be added here
// For example, different desktop environment integrations

#[cfg(target_os = "linux")]
pub fn set_linux_wallpaper(file_path: &str) -> Result<(), String> {
    use std::process::Command;
    
    let desktop_commands = [
        ("gsettings", vec!["set", "org.gnome.desktop.background", "picture-uri", &format!("file://{}", file_path)]),
        ("feh", vec!["--bg-fill", file_path]),
        ("nitrogen", vec!["--set-scaled", file_path]),
        ("xfconf-query", vec!["-c", "xfce4-desktop", "-p", "/backdrop/screen0/monitor0/workspace0/last-image", "-s", file_path]),
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

    Ok(())
}