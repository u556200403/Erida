use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::Path,
    sync::atomic::{AtomicUsize, Ordering},
};

use lofty::{
    config::ParseOptions,
    picture::{MimeType, PictureType},
    prelude::TaggedFileExt,
    probe::Probe,
};
use tauri::Manager;

const MAX_ARTWORK_BYTES: usize = 10 * 1024 * 1024;
const ARTWORK_DIRECTORY: &str = "artwork/embedded";
static TEMPORARY_FILE_COUNTER: AtomicUsize = AtomicUsize::new(0);

#[tauri::command]
pub async fn extract_embedded_artwork(
    app: tauri::AppHandle,
    locator: String,
    track_id: String,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
        extract_embedded_artwork_in(&locator, &app_data_dir, &track_id)
    })
    .await
    .map_err(|error| format!("embedded artwork task failed: {error}"))?
}

fn extract_embedded_artwork_in(
    locator: &str,
    app_data_dir: &Path,
    track_id: &str,
) -> Result<Option<String>, String> {
    if !is_safe_track_id(track_id) {
        return Err("invalid track ID for artwork cache".into());
    }

    let tagged_file = Probe::open(locator)
        .map_err(|error| error.to_string())?
        .options(
            ParseOptions::new()
                .implicit_conversions(false)
                .read_cover_art(true),
        )
        .read()
        .map_err(|error| error.to_string())?;
    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());
    let Some(picture) = tag.and_then(select_picture) else {
        return Ok(None);
    };
    let Some(extension) = extension_for_mime_type(picture.mime_type()) else {
        return Ok(None);
    };

    let relative_ref = format!("embedded/{track_id}.{extension}");
    let cache_directory = app_data_dir.join(ARTWORK_DIRECTORY);
    fs::create_dir_all(&cache_directory).map_err(|error| error.to_string())?;
    write_cache_file(&cache_directory, &format!("{track_id}.{extension}"), picture.data())?;

    Ok(Some(relative_ref))
}

fn select_picture(tag: &lofty::tag::Tag) -> Option<&lofty::picture::Picture> {
    tag.get_picture_type(PictureType::CoverFront)
        .filter(|picture| is_allowed_picture(picture))
        .or_else(|| tag.pictures().iter().find(|picture| is_allowed_picture(picture)))
}

fn is_allowed_picture(picture: &lofty::picture::Picture) -> bool {
    !picture.data().is_empty()
        && picture.data().len() <= MAX_ARTWORK_BYTES
        && has_expected_signature(picture.mime_type(), picture.data())
}

fn has_expected_signature(mime_type: Option<&MimeType>, data: &[u8]) -> bool {
    match mime_type {
        Some(MimeType::Jpeg) => data.starts_with(&[0xFF, 0xD8, 0xFF]),
        Some(MimeType::Png) => data.starts_with(b"\x89PNG\r\n\x1A\n"),
        Some(MimeType::Gif) => data.starts_with(b"GIF87a") || data.starts_with(b"GIF89a"),
        Some(MimeType::Bmp) => data.starts_with(b"BM"),
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

fn extension_for_mime_type(mime_type: Option<&MimeType>) -> Option<&'static str> {
    match mime_type {
        Some(MimeType::Jpeg) => Some("jpg"),
        Some(MimeType::Png) => Some("png"),
        Some(MimeType::Gif) => Some("gif"),
        Some(MimeType::Bmp) => Some("bmp"),
        _ => None,
    }
}

fn is_safe_track_id(track_id: &str) -> bool {
    !track_id.is_empty()
        && track_id
            .bytes()
            .all(|character| character.is_ascii_alphanumeric() || character == b'-' || character == b'_')
}

#[cfg(test)]
mod tests {
    use super::{
        extract_embedded_artwork_in, extension_for_mime_type, select_picture, MAX_ARTWORK_BYTES,
    };
    use lofty::{
        picture::{MimeType, Picture, PictureType},
        tag::{Tag, TagType},
    };
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
                "erida-embedded-artwork-{}-{id}",
                std::process::id()
            ));
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

    fn synchsafe_bytes(size: usize) -> [u8; 4] {
        [
            ((size >> 21) & 0x7F) as u8,
            ((size >> 14) & 0x7F) as u8,
            ((size >> 7) & 0x7F) as u8,
            (size & 0x7F) as u8,
        ]
    }

    fn mp3_with_apic(image_data: &[u8]) -> Vec<u8> {
        let source = fs::read(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/tests/fixtures/lofty-0.22.4-issue-82.mp3"
        ))
        .expect("fixture should be readable");
        let tag_size = source[6..10]
            .iter()
            .fold(0usize, |size, byte| (size << 7) | usize::from(byte & 0x7F));
        let audio_body = &source[10 + tag_size..];

        let mut apic = vec![0, b'i', b'm', b'a', b'g', b'e', b'/', b'j', b'p', b'e', b'g', 0, 3, 0];
        apic.extend(image_data);
        let mut frame = b"APIC".to_vec();
        frame.extend((apic.len() as u32).to_be_bytes());
        frame.extend([0, 0]);
        frame.extend(apic);

        let mut bytes = b"ID3\x03\x00\x00".to_vec();
        bytes.extend(synchsafe_bytes(frame.len()));
        bytes.extend(frame);
        bytes.extend(audio_body);
        bytes
    }

    #[test]
    fn extracts_a_front_cover_into_the_track_cache() {
        let directory = TemporaryDirectory::new();
        let source = directory.path().join("track.mp3");
        let image_data = [0xFF, 0xD8, 0xFF, 0xD9];
        fs::write(&source, mp3_with_apic(&image_data)).expect("fixture should be written");

        let artwork_ref = extract_embedded_artwork_in(
            &source.to_string_lossy(),
            directory.path(),
            "track-1",
        )
        .expect("extraction should succeed");

        assert_eq!(artwork_ref.as_deref(), Some("embedded/track-1.jpg"));
        assert_eq!(
            fs::read(directory.path().join("artwork/embedded/track-1.jpg"))
                .expect("cached artwork should exist"),
            image_data
        );
    }

    #[test]
    fn ignores_embedded_artwork_larger_than_the_limit() {
        let directory = TemporaryDirectory::new();
        let source = directory.path().join("large.mp3");
        fs::write(&source, mp3_with_apic(&vec![0; MAX_ARTWORK_BYTES + 1]))
            .expect("fixture should be written");

        let artwork_ref = extract_embedded_artwork_in(
            &source.to_string_lossy(),
            directory.path(),
            "track-1",
        )
        .expect("oversized artwork should not fail extraction");

        assert_eq!(artwork_ref, None);
    }

    #[test]
    fn ignores_empty_or_mime_mismatched_embedded_artwork() {
        let directory = TemporaryDirectory::new();

        for (name, image_data) in [("empty", &[][..]), ("mismatched", b"GIF89a" as &[u8])] {
            let source = directory.path().join(format!("{name}.mp3"));
            fs::write(&source, mp3_with_apic(image_data)).expect("fixture should be written");

            let artwork_ref = extract_embedded_artwork_in(
                &source.to_string_lossy(),
                directory.path(),
                name,
            )
            .expect("invalid artwork should not fail extraction");

            assert_eq!(artwork_ref, None);
            assert!(!directory.path().join(format!("artwork/embedded/{name}.jpg")).exists());
        }
    }

    #[test]
    fn keeps_an_existing_completed_cache_entry() {
        let directory = TemporaryDirectory::new();
        let source = directory.path().join("track.mp3");
        fs::write(&source, mp3_with_apic(&[0xFF, 0xD8, 0xFF, 0xD9]))
            .expect("fixture should be written");
        let cache_directory = directory.path().join("artwork/embedded");
        fs::create_dir_all(&cache_directory).expect("cache directory should be created");
        let cache_file = cache_directory.join("track-1.jpg");
        fs::write(&cache_file, b"existing artwork").expect("existing artwork should be written");

        let artwork_ref = extract_embedded_artwork_in(
            &source.to_string_lossy(),
            directory.path(),
            "track-1",
        )
        .expect("extraction should succeed");

        assert_eq!(artwork_ref.as_deref(), Some("embedded/track-1.jpg"));
        assert_eq!(fs::read(cache_file).expect("cache file should exist"), b"existing artwork");
    }

    #[test]
    fn permits_only_browser_safe_mime_types() {
        assert_eq!(extension_for_mime_type(Some(&MimeType::Jpeg)), Some("jpg"));
        assert_eq!(extension_for_mime_type(Some(&MimeType::Png)), Some("png"));
        assert_eq!(extension_for_mime_type(Some(&MimeType::Gif)), Some("gif"));
        assert_eq!(extension_for_mime_type(Some(&MimeType::Bmp)), Some("bmp"));
        assert_eq!(extension_for_mime_type(Some(&MimeType::Tiff)), None);
    }

    #[test]
    fn falls_back_to_the_first_allowed_picture_when_front_cover_is_not_allowed() {
        let mut tag = Tag::new(TagType::Id3v2);
        tag.push_picture(Picture::new_unchecked(
            PictureType::CoverFront,
            Some(MimeType::Tiff),
            None,
            vec![1],
        ));
        tag.push_picture(Picture::new_unchecked(
            PictureType::CoverBack,
            Some(MimeType::Png),
            None,
            b"\x89PNG\r\n\x1A\n".to_vec(),
        ));

        let picture = select_picture(&tag).expect("an allowed fallback picture should be selected");

        assert_eq!(picture.mime_type(), Some(&MimeType::Png));
    }
}
