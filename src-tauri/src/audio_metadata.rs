use std::time::Duration;

use lofty::{
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
    fn returns_an_error_for_a_missing_file() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/fixtures/missing.mp3");

        assert!(read_audio_metadata(path.into()).is_err());
    }
}
