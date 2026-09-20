use std::{fs, path::Path};

#[tauri::command]
pub async fn check_local_track_availability(locator: String) -> bool {
    tauri::async_runtime::spawn_blocking(move || is_local_track_available(Path::new(&locator)))
        .await
        .unwrap_or(false)
}

fn is_local_track_available(path: &Path) -> bool {
    fs::metadata(path).is_ok_and(|metadata| metadata.is_file())
}

#[cfg(test)]
mod tests {
    use super::is_local_track_available;
    use std::{fs, path::PathBuf, sync::atomic::{AtomicUsize, Ordering}};

    static FILE_COUNTER: AtomicUsize = AtomicUsize::new(0);

    fn temporary_path(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "erida-local-track-availability-{}-{}-{name}",
            std::process::id(),
            FILE_COUNTER.fetch_add(1, Ordering::Relaxed),
        ))
    }

    #[test]
    fn existing_local_file_is_available() {
        let path = temporary_path("existing.mp3");
        fs::write(&path, []).expect("fixture should be created");

        assert!(is_local_track_available(&path));

        let _ = fs::remove_file(path);
    }

    #[test]
    fn missing_local_file_is_unavailable() {
        assert!(!is_local_track_available(&temporary_path("missing.mp3")));
    }
}
