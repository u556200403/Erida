mod audio_metadata;
mod music_library_storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            audio_metadata::read_audio_metadata,
            music_library_storage::add_library_track,
            music_library_storage::list_library_tracks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
