mod commands;

use commands::email;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            email::generate_temp_email,
            email::get_emails,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
