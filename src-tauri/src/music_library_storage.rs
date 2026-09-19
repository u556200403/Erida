use std::{
    fmt, fs,
    path::{Path, PathBuf},
    time::Duration,
};

use rusqlite::{params, Connection, TransactionBehavior};
use serde::{Deserialize, Serialize};
use tauri::Manager;

const INITIAL_SCHEMA_VERSION: i64 = 1;
const DATABASE_FILE_NAME: &str = "music-library.sqlite3";
const DATABASE_BUSY_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryTrackDto {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: Option<String>,
    pub duration_seconds: Option<f64>,
    pub source: TrackSourceDto,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind")]
pub enum TrackSourceDto {
    Local {
        locator: String,
    },
    Service {
        provider: String,
        external_id: String,
    },
}

pub struct MusicLibraryStorage {
    connection: Connection,
}

#[derive(Debug)]
pub enum StorageError {
    ApplicationDataDirectory(tauri::Error),
    CreateDataDirectory {
        path: PathBuf,
        source: std::io::Error,
    },
    Database(rusqlite::Error),
    InvalidDurationSeconds,
    UnsupportedSchemaVersion(i64),
}

impl fmt::Display for StorageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ApplicationDataDirectory(error) => {
                write!(
                    formatter,
                    "failed to resolve music library application data directory: {error}"
                )
            }
            Self::CreateDataDirectory { path, source } => write!(
                formatter,
                "failed to create music library data directory {}: {source}",
                path.display()
            ),
            Self::Database(error) => write!(formatter, "music library database error: {error}"),
            Self::InvalidDurationSeconds => write!(
                formatter,
                "duration_seconds must be finite and non-negative"
            ),
            Self::UnsupportedSchemaVersion(version) => write!(
                formatter,
                "music library database schema version {version} is newer than supported"
            ),
        }
    }
}

impl std::error::Error for StorageError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::ApplicationDataDirectory(error) => Some(error),
            Self::CreateDataDirectory { source, .. } => Some(source),
            Self::Database(error) => Some(error),
            Self::InvalidDurationSeconds => None,
            Self::UnsupportedSchemaVersion(_) => None,
        }
    }
}

impl From<rusqlite::Error> for StorageError {
    fn from(error: rusqlite::Error) -> Self {
        Self::Database(error)
    }
}

impl MusicLibraryStorage {
    pub fn open(database_path: impl AsRef<Path>) -> Result<Self, StorageError> {
        let database_path = database_path.as_ref();
        if let Some(parent) = database_path.parent() {
            fs::create_dir_all(parent).map_err(|source| StorageError::CreateDataDirectory {
                path: parent.to_path_buf(),
                source,
            })?;
        }

        let mut connection = Connection::open(database_path)?;
        connection.busy_timeout(DATABASE_BUSY_TIMEOUT)?;
        apply_migrations(&mut connection)?;

        Ok(Self { connection })
    }

    pub fn add_track(&self, track: &LibraryTrackDto) -> Result<(), StorageError> {
        validate_track(track)?;

        let (source_kind, local_locator, service_provider, service_external_id) =
            match &track.source {
                TrackSourceDto::Local { locator } => ("local", Some(locator), None, None),
                TrackSourceDto::Service {
                    provider,
                    external_id,
                } => ("service", None, Some(provider), Some(external_id)),
            };

        self.connection.execute(
            "
            INSERT INTO tracks (
                id,
                title,
                artist,
                album,
                duration_seconds,
                source_kind,
                local_locator,
                service_provider,
                service_external_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ",
            params![
                track.id,
                track.title,
                track.artist,
                track.album,
                track.duration_seconds,
                source_kind,
                local_locator,
                service_provider,
                service_external_id,
            ],
        )?;

        Ok(())
    }

    pub fn remove_track(&self, id: &str) -> Result<(), StorageError> {
        self.connection
            .execute("DELETE FROM tracks WHERE id = ?", params![id])?;

        Ok(())
    }

    pub fn list_tracks(&self) -> Result<Vec<LibraryTrackDto>, StorageError> {
        let mut statement = self.connection.prepare(
            "
            SELECT
                id,
                title,
                artist,
                album,
                duration_seconds,
                source_kind,
                local_locator,
                service_provider,
                service_external_id
            FROM tracks
            ORDER BY insertion_order ASC
            ",
        )?;
        let tracks = statement
            .query_map([], |row| {
                let source_kind: String = row.get(5)?;
                let source = match source_kind.as_str() {
                    "local" => TrackSourceDto::Local {
                        locator: row.get(6)?,
                    },
                    "service" => TrackSourceDto::Service {
                        provider: row.get(7)?,
                        external_id: row.get(8)?,
                    },
                    _ => {
                        return Err(rusqlite::Error::InvalidColumnType(
                            5,
                            "source_kind".into(),
                            rusqlite::types::Type::Text,
                        ));
                    }
                };

                Ok(LibraryTrackDto {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    artist: row.get(2)?,
                    album: row.get(3)?,
                    duration_seconds: row.get(4)?,
                    source,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(tracks)
    }
}

#[tauri::command]
pub async fn add_library_track(
    app: tauri::AppHandle,
    track: LibraryTrackDto,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let storage = open_application_storage(&app)?;
        storage.add_track(&track)
    })
    .await
    .map_err(|error| format!("music library task failed: {error}"))?
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn list_library_tracks(app: tauri::AppHandle) -> Result<Vec<LibraryTrackDto>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let storage = open_application_storage(&app)?;
        storage.list_tracks()
    })
    .await
    .map_err(|error| format!("music library task failed: {error}"))?
    .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn remove_library_track(app: tauri::AppHandle, id: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let storage = open_application_storage(&app)?;
        storage.remove_track(&id)
    })
    .await
    .map_err(|error| format!("music library task failed: {error}"))?
    .map_err(|error| error.to_string())
}

fn open_application_storage(app: &tauri::AppHandle) -> Result<MusicLibraryStorage, StorageError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(StorageError::ApplicationDataDirectory)?;
    MusicLibraryStorage::open(app_data_dir.join(DATABASE_FILE_NAME))
}

fn apply_migrations(connection: &mut Connection) -> Result<(), StorageError> {
    let transaction = connection.transaction_with_behavior(TransactionBehavior::Immediate)?;
    let schema_version: i64 =
        transaction.pragma_query_value(None, "user_version", |row| row.get(0))?;

    match schema_version {
        0 => {
            transaction.execute_batch(
                "
                CREATE TABLE tracks (
                    insertion_order INTEGER PRIMARY KEY,
                    id TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    artist TEXT NOT NULL,
                    album TEXT,
                    duration_seconds REAL CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
                    source_kind TEXT NOT NULL CHECK (source_kind IN ('local', 'service')),
                    local_locator TEXT,
                    service_provider TEXT,
                    service_external_id TEXT,
                    CHECK (
                        (source_kind = 'local'
                            AND local_locator IS NOT NULL
                            AND service_provider IS NULL
                            AND service_external_id IS NULL)
                        OR
                        (source_kind = 'service'
                            AND local_locator IS NULL
                            AND service_provider IS NOT NULL
                            AND service_external_id IS NOT NULL)
                    )
                );
                ",
            )?;
            transaction.pragma_update(None, "user_version", INITIAL_SCHEMA_VERSION)?;
        }
        INITIAL_SCHEMA_VERSION => {}
        version => return Err(StorageError::UnsupportedSchemaVersion(version)),
    }

    transaction.commit()?;

    Ok(())
}

fn validate_track(track: &LibraryTrackDto) -> Result<(), StorageError> {
    if track
        .duration_seconds
        .is_some_and(|duration| !duration.is_finite() || duration < 0.0)
    {
        return Err(StorageError::InvalidDurationSeconds);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{LibraryTrackDto, MusicLibraryStorage, TrackSourceDto, INITIAL_SCHEMA_VERSION};
    use rusqlite::{params, Connection};
    use std::{
        fs,
        path::{Path, PathBuf},
        sync::{
            atomic::{AtomicUsize, Ordering},
            Arc, Barrier,
        },
        thread,
    };

    static DATABASE_COUNTER: AtomicUsize = AtomicUsize::new(0);

    struct TemporaryDatabase {
        path: PathBuf,
    }

    impl TemporaryDatabase {
        fn new() -> Self {
            let id = DATABASE_COUNTER.fetch_add(1, Ordering::Relaxed);
            let directory = std::env::temp_dir().join(format!(
                "erida-music-library-storage-{}-{id}",
                std::process::id()
            ));
            Self {
                path: directory.join("library.sqlite3"),
            }
        }

        fn path(&self) -> &Path {
            &self.path
        }
    }

    impl Drop for TemporaryDatabase {
        fn drop(&mut self) {
            if let Some(directory) = self.path.parent() {
                let _ = fs::remove_dir_all(directory);
            }
        }
    }

    fn local_track(id: &str, locator: &str) -> LibraryTrackDto {
        LibraryTrackDto {
            id: id.into(),
            title: format!("Title {id}"),
            artist: format!("Artist {id}"),
            album: Some(format!("Album {id}")),
            duration_seconds: Some(123.456_789),
            source: TrackSourceDto::Local {
                locator: locator.into(),
            },
        }
    }

    fn service_track(id: &str) -> LibraryTrackDto {
        LibraryTrackDto {
            id: id.into(),
            title: format!("Title {id}"),
            artist: format!("Artist {id}"),
            album: None,
            duration_seconds: None,
            source: TrackSourceDto::Service {
                provider: "spotify".into(),
                external_id: format!("external-{id}"),
            },
        }
    }

    #[test]
    fn fresh_database_returns_no_tracks() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");

        assert_eq!(storage.list_tracks().expect("tracks should list"), []);
    }

    #[test]
    fn local_track_source_round_trips_without_reinterpreting_its_locator() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");
        let track = local_track("local-1", "opaque://C:\\Music\\missing.mp3?value=%2F");

        storage.add_track(&track).expect("track should insert");

        assert_eq!(storage.list_tracks().expect("tracks should list"), [track]);
    }

    #[test]
    fn service_track_source_round_trips() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");
        let track = service_track("service-1");

        storage.add_track(&track).expect("track should insert");

        assert_eq!(storage.list_tracks().expect("tracks should list"), [track]);
    }

    #[test]
    fn nullable_fields_and_fractional_duration_round_trip() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");
        let nullable_track = service_track("nullable");
        let fractional_track = local_track("fractional", "locator");

        storage
            .add_track(&nullable_track)
            .expect("track should insert");
        storage
            .add_track(&fractional_track)
            .expect("track should insert");

        assert_eq!(
            storage.list_tracks().expect("tracks should list"),
            [nullable_track, fractional_track]
        );
    }

    #[test]
    fn listing_preserves_insertion_order() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");
        let first = local_track("first", "first");
        let second = service_track("second");
        let third = local_track("third", "third");

        storage.add_track(&first).expect("track should insert");
        storage.add_track(&second).expect("track should insert");
        storage.add_track(&third).expect("track should insert");

        assert_eq!(
            storage.list_tracks().expect("tracks should list"),
            [first, second, third]
        );
    }

    #[test]
    fn removing_a_track_deletes_only_its_library_record_and_ignores_missing_ids() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");
        let removed = local_track("removed", "C:\\Music\\keep-this-file.mp3");
        let retained = service_track("retained");

        storage.add_track(&removed).expect("track should insert");
        storage.add_track(&retained).expect("track should insert");

        storage.remove_track(&removed.id).expect("track should remove");
        storage
            .remove_track("missing-track")
            .expect("missing track removal should succeed");

        assert_eq!(storage.list_tracks().expect("tracks should list"), [retained]);
    }

    #[test]
    fn duplicate_track_id_fails() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");
        storage
            .add_track(&local_track("same-id", "first"))
            .expect("first track should insert");

        assert!(storage.add_track(&service_track("same-id")).is_err());
    }

    #[test]
    fn duplicate_local_locator_is_allowed() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");
        let first = local_track("first", "same locator");
        let second = local_track("second", "same locator");

        storage
            .add_track(&first)
            .expect("first track should insert");
        storage
            .add_track(&second)
            .expect("second track should insert");

        assert_eq!(
            storage.list_tracks().expect("tracks should list"),
            [first, second]
        );
    }

    #[test]
    fn data_survives_closing_and_reopening_the_database() {
        let database = TemporaryDatabase::new();
        let track = local_track("persisted", "missing-file-is-still-a-record");
        {
            let storage =
                MusicLibraryStorage::open(database.path()).expect("database should initialize");
            storage.add_track(&track).expect("track should insert");
        }

        let reopened = MusicLibraryStorage::open(database.path()).expect("database should reopen");
        assert_eq!(reopened.list_tracks().expect("tracks should list"), [track]);
    }

    #[test]
    fn migration_initialization_is_idempotent() {
        let database = TemporaryDatabase::new();
        MusicLibraryStorage::open(database.path()).expect("first initialization should succeed");
        MusicLibraryStorage::open(database.path()).expect("second initialization should succeed");

        let connection = Connection::open(database.path()).expect("database should open");
        let schema_version: i64 = connection
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .expect("schema version should read");
        assert_eq!(schema_version, INITIAL_SCHEMA_VERSION);
    }

    #[test]
    fn concurrent_initialization_applies_the_initial_migration_once() {
        let database = TemporaryDatabase::new();
        let path = database.path().to_path_buf();
        let barrier = Arc::new(Barrier::new(3));
        let handles = (0..2)
            .map(|_| {
                let path = path.clone();
                let barrier = Arc::clone(&barrier);
                thread::spawn(move || {
                    barrier.wait();
                    MusicLibraryStorage::open(path)
                })
            })
            .collect::<Vec<_>>();

        barrier.wait();
        for handle in handles {
            handle
                .join()
                .expect("initialization thread should not panic")
                .expect("concurrent initialization should succeed");
        }

        let connection = Connection::open(database.path()).expect("database should open");
        let schema_version: i64 = connection
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .expect("schema version should read");
        assert_eq!(schema_version, INITIAL_SCHEMA_VERSION);
    }

    #[test]
    fn invalid_duration_values_are_rejected() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");

        for duration in [-1.0, f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
            let mut track = local_track("invalid-duration", "locator");
            track.duration_seconds = Some(duration);

            assert!(storage.add_track(&track).is_err());
        }

        assert_eq!(storage.list_tracks().expect("tracks should list"), []);
    }

    #[test]
    fn database_rejects_negative_duration() {
        let database = TemporaryDatabase::new();
        let storage =
            MusicLibraryStorage::open(database.path()).expect("database should initialize");

        assert!(storage
            .connection
            .execute(
                "
                INSERT INTO tracks (
                    id,
                    title,
                    artist,
                    duration_seconds,
                    source_kind,
                    local_locator
                ) VALUES (?, ?, ?, ?, ?, ?)
                ",
                params!["negative", "Title", "Artist", -1.0, "local", "locator"],
            )
            .is_err());
    }
}
