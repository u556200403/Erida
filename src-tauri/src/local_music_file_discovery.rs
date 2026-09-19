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
pub async fn discover_audio_files(paths: Vec<String>) -> Result<Vec<LocalMusicFileDto>, String> {
    tauri::async_runtime::spawn_blocking(move || discover_audio_files_in(&paths))
        .await
        .map_err(|error| format!("local music discovery task failed: {error}"))?
        .map_err(|error| error.to_string())
}

fn discover_audio_files_in(roots: &[String]) -> Result<Vec<LocalMusicFileDto>, std::io::Error> {
    let mut paths = Vec::new();

    for root in roots {
        let path = Path::new(root);
        let file_type = fs::metadata(path)?.file_type();

        if file_type.is_dir() {
            collect_audio_files(path, &mut paths)?;
        } else if file_type.is_file() && has_supported_extension(path) {
            paths.push(path.to_path_buf());
        }
    }

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

    #[cfg(unix)]
    fn create_directory_symlink(target: &Path, link: &Path) -> Result<(), std::io::Error> {
        std::os::unix::fs::symlink(target, link)
    }

    #[cfg(windows)]
    fn create_directory_symlink(target: &Path, link: &Path) -> Result<(), std::io::Error> {
        std::os::windows::fs::symlink_dir(target, link)
    }

    fn create_directory_symlink_or_skip(target: &Path, link: &Path) -> bool {
        match create_directory_symlink(target, link) {
            Ok(()) => true,
            Err(error)
                if error.kind() == std::io::ErrorKind::PermissionDenied
                    || error.raw_os_error() == Some(1314) =>
            {
                false
            }
            Err(error) => panic!("directory symlink should be created: {error}"),
        }
    }

    fn discover(paths: &[&Path]) -> Result<Vec<super::LocalMusicFileDto>, std::io::Error> {
        let roots = paths
            .iter()
            .map(|path| path.to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        discover_audio_files_in(&roots)
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

        let files = discover(&[directory.path()]).expect("discovery should succeed");

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

        assert_eq!(discover(&[directory.path()]).unwrap(), []);
    }

    #[test]
    fn discovers_a_single_supported_file_root() {
        let directory = TemporaryDirectory::new();
        let file = directory.create_file("Single.wav");

        let files = discover(&[&file]).expect("file should be discovered");

        assert_eq!(
            files,
            vec![super::LocalMusicFileDto {
                locator: file.to_string_lossy().into_owned(),
                filename: "Single.wav".into(),
            }]
        );
    }

    #[test]
    fn discovers_supported_file_roots_and_ignores_unsupported_files() {
        let directory = TemporaryDirectory::new();
        let first = directory.create_file("First.MP3");
        let second = directory.create_file("Second.flac");
        directory.create_file("ignored.ogg");
        directory.create_file("notes.txt");

        let files = discover(&[&second, &first, &directory.path().join("ignored.ogg")])
            .expect("files should be discovered");

        assert_eq!(
            files,
            vec![
                super::LocalMusicFileDto {
                    locator: first.to_string_lossy().into_owned(),
                    filename: "First.MP3".into(),
                },
                super::LocalMusicFileDto {
                    locator: second.to_string_lossy().into_owned(),
                    filename: "Second.flac".into(),
                },
            ]
        );
    }

    #[test]
    fn discovers_multiple_folders_and_mixed_roots_recursively() {
        let directory = TemporaryDirectory::new();
        let first_folder = directory.path().join("first");
        let second_folder = directory.path().join("second");
        let first = directory.create_file("first/nested/First.wav");
        let second = directory.create_file("second/Second.m4a");
        let direct = directory.create_file("Direct.flac");
        directory.create_file("second/ignored.txt");

        let files = discover(&[&second_folder, &direct, &first_folder])
            .expect("mixed roots should be discovered");

        assert_eq!(
            files,
            vec![
                super::LocalMusicFileDto {
                    locator: direct.to_string_lossy().into_owned(),
                    filename: "Direct.flac".into(),
                },
                super::LocalMusicFileDto {
                    locator: first.to_string_lossy().into_owned(),
                    filename: "First.wav".into(),
                },
                super::LocalMusicFileDto {
                    locator: second.to_string_lossy().into_owned(),
                    filename: "Second.m4a".into(),
                },
            ]
        );
    }

    #[test]
    fn follows_a_root_directory_symlink() {
        let directory = TemporaryDirectory::new();
        let target = directory.path().join("target");
        let link = directory.path().join("root-link");
        directory.create_file("target/Linked.mp3");

        if !create_directory_symlink_or_skip(&target, &link) {
            return;
        }

        let files = discover(&[&link]).expect("root symlink should be discovered");

        assert_eq!(
            files,
            vec![super::LocalMusicFileDto {
                locator: link.join("Linked.mp3").to_string_lossy().into_owned(),
                filename: "Linked.mp3".into(),
            }]
        );
    }

    #[test]
    fn does_not_follow_nested_directory_symlinks() {
        let directory = TemporaryDirectory::new();
        let library = directory.path().join("library");
        let target = directory.path().join("target");
        let nested_link = library.join("nested-link");
        let visible = directory.create_file("library/Visible.flac");
        directory.create_file("target/Hidden.mp3");

        if !create_directory_symlink_or_skip(&target, &nested_link) {
            return;
        }

        let files = discover(&[&library]).expect("library should be discovered");

        assert_eq!(
            files,
            vec![super::LocalMusicFileDto {
                locator: visible.to_string_lossy().into_owned(),
                filename: "Visible.flac".into(),
            }]
        );
    }

    #[test]
    fn propagates_directory_traversal_errors() {
        let missing_directory = std::env::temp_dir().join(format!(
            "erida-missing-local-music-directory-{}",
            std::process::id()
        ));

        assert!(discover(&[&missing_directory]).is_err());
    }
}
