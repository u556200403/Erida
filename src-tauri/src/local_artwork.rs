use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::Path,
    sync::atomic::{AtomicUsize, Ordering},
};

use tauri::Manager;

const MAX_ARTWORK_BYTES: u64 = 10 * 1024 * 1024;
const ARTWORK_DIRECTORY: &str = "artwork/local";
const CANDIDATE_FILENAMES: [&str; 4] = ["cover.jpg", "cover.png", "folder.jpg", "folder.png"];
static TEMPORARY_FILE_COUNTER: AtomicUsize = AtomicUsize::new(0);

#[tauri::command]
pub async fn extract_local_artwork(
    app: tauri::AppHandle,
    locator: String,
    track_id: String,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        extract_local_artwork_in(&locator, &app_data_dir, &track_id)
    })
    .await
    .map_err(|error| format!("local artwork task failed: {error}"))?
}

fn extract_local_artwork_in(
    locator: &str,
    app_data_dir: &Path,
    track_id: &str,
) -> Result<Option<String>, String> {
    if !is_safe_track_id(track_id) {
        return Err("invalid track ID for artwork cache".into());
    }

    let Some((extension, image_data)) = find_local_artwork(locator)? else {
        return Ok(None);
    };

    let filename = format!("{track_id}.{extension}");
    let cache_directory = app_data_dir.join(ARTWORK_DIRECTORY);
    fs::create_dir_all(&cache_directory).map_err(|error| error.to_string())?;
    write_cache_file(&cache_directory, &filename, &image_data)?;

    Ok(Some(format!("local/{filename}")))
}

fn find_local_artwork(locator: &str) -> Result<Option<(String, Vec<u8>)>, String> {
    let Some(directory) = Path::new(locator).parent() else {
        return Ok(None);
    };
    let mut candidates = fs::read_dir(directory)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let file_name = entry.file_name().to_str()?.to_ascii_lowercase();
            let priority = CANDIDATE_FILENAMES
                .iter()
                .position(|candidate| *candidate == file_name)?;
            entry
                .file_type()
                .ok()?
                .is_file()
                .then_some((priority, entry.path()))
        })
        .collect::<Vec<_>>();
    candidates.sort_by_key(|(priority, _)| *priority);

    for (_, source_path) in candidates {
        let Some(extension) = source_path
            .extension()
            .and_then(|extension| extension.to_str())
            .map(str::to_ascii_lowercase)
            .filter(|extension| extension == "jpg" || extension == "png")
        else {
            continue;
        };
        let Ok(image_data) = fs::read(source_path) else {
            continue;
        };

        if image_data.len() as u64 <= MAX_ARTWORK_BYTES
            && has_expected_signature(&extension, &image_data)
        {
            return Ok(Some((extension, image_data)));
        }
    }

    Ok(None)
}

fn has_expected_signature(extension: &str, data: &[u8]) -> bool {
    match extension {
        "jpg" => data.starts_with(&[0xFF, 0xD8, 0xFF]),
        "png" => data.starts_with(b"\x89PNG\r\n\x1A\n"),
        _ => false,
    }
}

fn write_cache_file(cache_directory: &Path, filename: &str, data: &[u8]) -> Result<(), String> {
    let final_path = cache_directory.join(filename);
    if final_path.exists() {
        return Ok(());
    }

    let temporary_path = cache_directory.join(format!(
        ".{filename}.tmp-{}-{}",
        std::process::id(),
        TEMPORARY_FILE_COUNTER.fetch_add(1, Ordering::Relaxed)
    ));
    let write_result = (|| -> Result<(), std::io::Error> {
        let mut temporary_file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary_path)?;
        temporary_file.write_all(data)?;
        temporary_file.sync_all()?;
        if final_path.exists() {
            return Ok(());
        }
        fs::rename(&temporary_path, &final_path)
    })();

    if write_result.is_err() || temporary_path.exists() {
        let _ = fs::remove_file(&temporary_path);
    }

    match write_result {
        Ok(()) => Ok(()),
        Err(_) if final_path.exists() => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn is_safe_track_id(track_id: &str) -> bool {
    !track_id.is_empty()
        && track_id.bytes().all(|character| {
            character.is_ascii_alphanumeric() || character == b'-' || character == b'_'
        })
}

#[cfg(test)]
mod tests {
    use super::extract_local_artwork_in;
    use std::{
        fs,
        path::{Path, PathBuf},
        sync::atomic::{AtomicUsize, Ordering},
    };

    static DIRECTORY_COUNTER: AtomicUsize = AtomicUsize::new(0);

    struct TemporaryDirectory {
        path: PathBuf,
    }

    impl TemporaryDirectory {
        fn new() -> Self {
            let id = DIRECTORY_COUNTER.fetch_add(1, Ordering::Relaxed);
            let path = std::env::temp_dir()
                .join(format!("erida-local-artwork-{}-{id}", std::process::id()));
            fs::create_dir_all(&path).expect("temporary directory should be created");
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TemporaryDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn caches_the_case_insensitive_cover_file_without_modifying_it() {
        let directory = TemporaryDirectory::new();
        let source = directory.path().join("Track.mp3");
        let cover = directory.path().join("CoVeR.PNG");
        let image_data = b"\x89PNG\r\n\x1A\nsource image";
        fs::write(&source, b"audio").expect("source should be written");
        fs::write(&cover, image_data).expect("cover should be written");

        let artwork_ref =
            extract_local_artwork_in(&source.to_string_lossy(), directory.path(), "track-1")
                .expect("lookup should succeed");

        assert_eq!(artwork_ref.as_deref(), Some("local/track-1.png"));
        assert_eq!(
            fs::read(&cover).expect("source image should remain"),
            image_data
        );
        assert_eq!(
            fs::read(directory.path().join("artwork/local/track-1.png"))
                .expect("cached image should exist"),
            image_data
        );
    }

    #[test]
    fn prefers_cover_over_folder_and_jpg_over_png() {
        let directory = TemporaryDirectory::new();
        let source = directory.path().join("Track.mp3");
        fs::write(&source, b"audio").expect("source should be written");
        fs::write(
            directory.path().join("folder.png"),
            b"\x89PNG\r\n\x1A\nfolder",
        )
        .expect("folder should be written");
        fs::write(
            directory.path().join("cover.png"),
            b"\x89PNG\r\n\x1A\ncover png",
        )
        .expect("cover png should be written");
        fs::write(directory.path().join("cover.jpg"), [0xFF, 0xD8, 0xFF, 0xD9])
            .expect("cover jpg should be written");

        let artwork_ref =
            extract_local_artwork_in(&source.to_string_lossy(), directory.path(), "track-1")
                .expect("lookup should succeed");

        assert_eq!(artwork_ref.as_deref(), Some("local/track-1.jpg"));
    }

    #[test]
    fn ignores_missing_or_invalid_local_artwork() {
        let directory = TemporaryDirectory::new();
        let source = directory.path().join("Track.mp3");
        fs::write(&source, b"audio").expect("source should be written");
        assert_eq!(
            extract_local_artwork_in(&source.to_string_lossy(), directory.path(), "track-1")
                .unwrap(),
            None
        );

        fs::write(directory.path().join("folder.jpg"), b"not a jpeg")
            .expect("invalid image should be written");
        assert_eq!(
            extract_local_artwork_in(&source.to_string_lossy(), directory.path(), "track-1")
                .unwrap(),
            None
        );
    }

    #[test]
    fn skips_an_invalid_higher_priority_file_for_a_valid_fallback() {
        let directory = TemporaryDirectory::new();
        let source = directory.path().join("Track.mp3");
        fs::write(&source, b"audio").expect("source should be written");
        fs::write(directory.path().join("cover.jpg"), b"not a jpeg")
            .expect("invalid cover should be written");
        fs::write(
            directory.path().join("folder.png"),
            b"\x89PNG\r\n\x1A\nfallback",
        )
        .expect("fallback should be written");

        let artwork_ref =
            extract_local_artwork_in(&source.to_string_lossy(), directory.path(), "track-1")
                .expect("lookup should succeed");

        assert_eq!(artwork_ref.as_deref(), Some("local/track-1.png"));
    }
}
