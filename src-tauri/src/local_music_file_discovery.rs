use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::Serialize;

const SUPPORTED_EXTENSIONS: [&str; 4] = ["mp3", "flac", "m4a", "wav"];

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalMusicFileDto {
    locator: String,
    filename: String,
}

#[tauri::command]
pub async fn discover_audio_files(directory: String) -> Result<Vec<LocalMusicFileDto>, String> {
    tauri::async_runtime::spawn_blocking(move || discover_audio_files_in(Path::new(&directory)))
        .await
        .map_err(|error| format!("local music discovery task failed: {error}"))?
        .map_err(|error| error.to_string())
}

fn discover_audio_files_in(directory: &Path) -> Result<Vec<LocalMusicFileDto>, std::io::Error> {
    let mut paths = Vec::new();
    collect_audio_files(directory, &mut paths)?;
    paths.sort();

    Ok(paths.into_iter().map(local_music_file_from_path).collect())
}

fn collect_audio_files(directory: &Path, paths: &mut Vec<PathBuf>) -> Result<(), std::io::Error> {
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let path = entry.path();
        let file_type = entry.file_type()?;

        if file_type.is_dir() {
            collect_audio_files(&path, paths)?;
        } else if file_type.is_file() && has_supported_extension(&path) {
            paths.push(path);
        }
    }

    Ok(())
}

fn has_supported_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            SUPPORTED_EXTENSIONS
                .iter()
                .any(|supported| extension.eq_ignore_ascii_case(supported))
        })
}

fn local_music_file_from_path(path: PathBuf) -> LocalMusicFileDto {
    LocalMusicFileDto {
        locator: path.to_string_lossy().into_owned(),
        filename: path
            .file_name()
            .map(|filename| filename.to_string_lossy().into_owned())
            .unwrap_or_default(),
    }
}

#[cfg(test)]
mod tests {
    use super::discover_audio_files_in;
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
            let path = std::env::temp_dir().join(format!(
                "erida-local-music-discovery-{}-{id}",
                std::process::id()
            ));
            fs::create_dir_all(&path).expect("temporary directory should be created");
            Self { path }
        }

        fn path(&self) -> &Path {
            &self.path
        }

        fn create_file(&self, relative_path: &str) -> PathBuf {
            let path = relative_path
                .split('/')
                .fold(self.path.clone(), |path, component| path.join(component));
            fs::create_dir_all(path.parent().expect("file should have a parent"))
                .expect("nested directories should be created");
            fs::write(&path, []).expect("fixture file should be created");
            path
        }
    }

    impl Drop for TemporaryDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.path);
        }
    }

    #[test]
    fn recursively_discovers_supported_audio_files_and_maps_native_paths() {
        let directory = TemporaryDirectory::new();
        let first = directory.create_file("First.MP3");
        let nested = directory.create_file("nested/Second.flac");
        let third = directory.create_file("nested/deeper/Third.M4A");
        let fourth = directory.create_file("Fourth.wav");
        directory.create_file("nested/ignored.ogg");
        directory.create_file("notes.txt");

        let files = discover_audio_files_in(directory.path()).expect("discovery should succeed");

        assert_eq!(
            files,
            vec![
                super::LocalMusicFileDto {
                    locator: first.to_string_lossy().into_owned(),
                    filename: "First.MP3".into(),
                },
                super::LocalMusicFileDto {
                    locator: fourth.to_string_lossy().into_owned(),
                    filename: "Fourth.wav".into(),
                },
                super::LocalMusicFileDto {
                    locator: nested.to_string_lossy().into_owned(),
                    filename: "Second.flac".into(),
                },
                super::LocalMusicFileDto {
                    locator: third.to_string_lossy().into_owned(),
                    filename: "Third.M4A".into(),
                },
            ]
        );
    }

    #[test]
    fn returns_an_empty_list_for_an_empty_directory() {
        let directory = TemporaryDirectory::new();

        assert_eq!(discover_audio_files_in(directory.path()).unwrap(), []);
    }

    #[test]
    fn propagates_directory_traversal_errors() {
        let missing_directory = std::env::temp_dir().join(format!(
            "erida-missing-local-music-directory-{}",
            std::process::id()
        ));

        assert!(discover_audio_files_in(&missing_directory).is_err());
    }
}
