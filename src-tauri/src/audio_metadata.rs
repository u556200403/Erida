use std::time::Duration;

use lofty::{
    config::ParseOptions,
    prelude::{Accessor, AudioFile, TaggedFileExt},
    probe::Probe,
};
use serde::Serialize;

#[derive(Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioMetadataDto {
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration_seconds: Option<f64>,
}

#[tauri::command]
pub fn read_audio_metadata(locator: String) -> Result<AudioMetadataDto, String> {
    let tagged_file = Probe::open(locator)
        .map_err(|error| error.to_string())?
        .options(ParseOptions::new().implicit_conversions(false))
        .read()
        .map_err(|error| error.to_string())?;

    Ok(metadata_from_tagged_file(&tagged_file))
}

fn metadata_from_tagged_file(tagged_file: &lofty::file::TaggedFile) -> AudioMetadataDto {
    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    metadata_dto(
        tag.and_then(|tag| tag.title())
            .map(|value| value.into_owned()),
        tag.and_then(|tag| tag.artist())
            .map(|value| value.into_owned()),
        tag.and_then(|tag| tag.album())
            .map(|value| value.into_owned()),
        Some(tagged_file.properties().duration()),
    )
}

fn metadata_dto(
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
    duration: Option<Duration>,
) -> AudioMetadataDto {
    AudioMetadataDto {
        title,
        artist,
        album,
        duration_seconds: duration.map(|value| value.as_secs_f64()),
    }
}

#[cfg(test)]
mod tests {
    use super::{metadata_dto, read_audio_metadata};
    use lofty::{config::ParseOptions, probe::Probe};
    use std::{
        fs,
        path::{Path, PathBuf},
        sync::atomic::{AtomicUsize, Ordering},
    };

    static SYNTHETIC_FIXTURE_COUNTER: AtomicUsize = AtomicUsize::new(0);

    struct SyntheticMp3Fixture {
        path: PathBuf,
    }

    impl SyntheticMp3Fixture {
        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for SyntheticMp3Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.path);
        }
    }

    fn synthetic_mp3_with_dotted_tyer() -> SyntheticMp3Fixture {
        let source = fs::read(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/tests/fixtures/lofty-0.22.4-issue-82.mp3"
        ))
        .expect("the official Lofty fixture should be readable");
        let source_tag_size = synchsafe_u32(&source[6..10]) as usize;
        let audio_body = &source[10 + source_tag_size..];

        let mut tag = Vec::new();
        tag.extend(id3v23_text_frame(
            *b"TIT2",
            utf16le_text("断罪ヤマザナドゥ！"),
        ));
        tag.extend(id3v23_text_frame(*b"TPE1", utf16le_text("山本椛")));
        tag.extend(id3v23_text_frame(
            *b"TALB",
            utf16le_text("Synthetic Regression Album"),
        ));
        tag.extend(id3v23_text_frame(*b"TYER", latin1_text("2014.02.02")));

        let mut bytes = b"ID3\x03\x00\x00".to_vec();
        bytes.extend(synchsafe_bytes(tag.len()));
        bytes.extend(tag);
        bytes.extend(audio_body);

        let fixture_id = SYNTHETIC_FIXTURE_COUNTER.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "erida-dotted-tyer-{}-{fixture_id}.mp3",
            std::process::id()
        ));
        fs::write(&path, bytes).expect("the synthetic regression fixture should be writable");

        SyntheticMp3Fixture { path }
    }

    fn id3v23_text_frame(identifier: [u8; 4], payload: Vec<u8>) -> Vec<u8> {
        let mut frame = identifier.to_vec();
        frame.extend((payload.len() as u32).to_be_bytes());
        frame.extend([0, 0]);
        frame.extend(payload);
        frame
    }

    fn utf16le_text(value: &str) -> Vec<u8> {
        let mut bytes = vec![1, 0xFF, 0xFE];
        bytes.extend(value.encode_utf16().flat_map(u16::to_le_bytes));
        bytes
    }

    fn latin1_text(value: &str) -> Vec<u8> {
        let mut bytes = vec![0];
        bytes.extend(value.bytes());
        bytes
    }

    fn synchsafe_bytes(size: usize) -> [u8; 4] {
        assert!(size <= 0x0FFF_FFFF);
        [
            ((size >> 21) & 0x7F) as u8,
            ((size >> 14) & 0x7F) as u8,
            ((size >> 7) & 0x7F) as u8,
            (size & 0x7F) as u8,
        ]
    }

    fn synchsafe_u32(bytes: &[u8]) -> u32 {
        bytes
            .iter()
            .fold(0, |value, byte| (value << 7) | u32::from(byte & 0x7F))
    }

    #[test]
    fn maps_missing_textual_metadata_to_null() {
        assert_eq!(
            metadata_dto(None, None, None, Some(std::time::Duration::from_secs(42))),
            super::AudioMetadataDto {
                title: None,
                artist: None,
                album: None,
                duration_seconds: Some(42.0),
            }
        );
    }

    #[test]
    fn reads_the_lofty_mp3_fixture() {
        // Copied from Lofty v0.22.4's issue_82_solidus_in_tag.mp3 test asset,
        // which is distributed under Lofty's MIT or Apache-2.0 license.
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/tests/fixtures/lofty-0.22.4-issue-82.mp3"
        );

        let metadata =
            read_audio_metadata(path.into()).expect("Lofty should read its official MP3 fixture");
        assert!(metadata
            .duration_seconds
            .is_some_and(|duration| duration > 0.0));
    }

    #[test]
    fn reads_id3v23_with_dotted_tyer_without_implicit_conversions() {
        let fixture = synthetic_mp3_with_dotted_tyer();

        let default_error = Probe::open(fixture.path())
            .expect("the synthetic fixture should open")
            .options(ParseOptions::new())
            .read()
            .err()
            .expect("Lofty default options should reject dotted ID3v2.3 TYER");
        assert_eq!(
            default_error.to_string(),
            "Encountered an invalid timestamp: Expected a separator"
        );

        let metadata = read_audio_metadata(fixture.path().to_string_lossy().into_owned())
            .expect("Erida should read the synthetic fixture");
        assert_eq!(metadata.title.as_deref(), Some("断罪ヤマザナドゥ！"));
        assert_eq!(metadata.artist.as_deref(), Some("山本椛"));
        assert_eq!(
            metadata.album.as_deref(),
            Some("Synthetic Regression Album")
        );
        assert!(metadata
            .duration_seconds
            .is_some_and(|duration| duration > 0.0));
    }

    #[test]
    fn returns_an_error_for_a_missing_file() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/missing.mp3");

        assert!(read_audio_metadata(path.into()).is_err());
    }
}
