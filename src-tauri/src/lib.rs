mod audio_metadata;
mod embedded_artwork;
mod local_artwork;
mod local_music_file_discovery;
mod music_library_storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            audio_metadata::read_audio_metadata,
            embedded_artwork::extract_embedded_artwork,
            local_artwork::extract_local_artwork,
            local_music_file_discovery::discover_audio_files,
            music_library_storage::add_library_track,
            music_library_storage::list_library_tracks,
            music_library_storage::remove_library_track,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
