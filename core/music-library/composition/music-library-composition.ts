import { ImportLocalTracks, type TrackIdGenerator } from '../application/import-local-tracks'
import { LoadLibraryTracks } from '../application/load-library-tracks'
import { LocalMusicImportFacade } from '../application/local-music-import-facade'
import type { ArtworkUrlResolver } from '../application/artwork-url-resolver'
import type { MusicLibraryRepository } from '../domain/music-library-repository'
import { TauriAudioMetadataReader } from '../infrastructure/tauri/tauri-audio-metadata-reader'
import { TauriArtworkUrlResolver } from '../infrastructure/tauri/tauri-artwork-url-resolver'
import { TauriEmbeddedArtworkExtractor } from '../infrastructure/tauri/tauri-embedded-artwork-extractor'
import { TauriLocalArtworkExtractor } from '../infrastructure/tauri/tauri-local-artwork-extractor'
import { TauriLocalMusicFileDiscovery } from '../infrastructure/tauri/tauri-local-music-file-discovery'
import { TauriLocalMusicFilePicker } from '../infrastructure/tauri/tauri-local-music-file-picker'
import { TauriLocalTrackAvailabilityChecker } from '../infrastructure/tauri/tauri-local-track-availability-checker'
import { TauriMusicLibraryRepository } from '../infrastructure/tauri/tauri-music-library-repository'

export interface MusicLibraryApplication {
  musicLibraryRepository: MusicLibraryRepository
  loadLibraryTracks: LoadLibraryTracks
  localMusicImportFacade: LocalMusicImportFacade
  artworkUrlResolver: ArtworkUrlResolver
}

export function createMusicLibraryApplication(): MusicLibraryApplication {
  const musicLibraryRepository = new TauriMusicLibraryRepository()
  const fileDiscovery = new TauriLocalMusicFileDiscovery()
  const filePicker = new TauriLocalMusicFilePicker(undefined, undefined, fileDiscovery)
  const metadataReader = new TauriAudioMetadataReader()
  const artworkExtractor = new TauriEmbeddedArtworkExtractor()
  const localArtworkExtractor = new TauriLocalArtworkExtractor()
  const localTrackAvailabilityChecker = new TauriLocalTrackAvailabilityChecker()
  const loadLibraryTracks = new LoadLibraryTracks(
    musicLibraryRepository,
    localTrackAvailabilityChecker,
  )
  const artworkUrlResolver = new TauriArtworkUrlResolver()
  const generateTrackId: TrackIdGenerator = () => crypto.randomUUID()
  const importLocalTracks = new ImportLocalTracks(
    musicLibraryRepository,
    metadataReader,
    artworkExtractor,
    localArtworkExtractor,
    generateTrackId,
  )

  return {
    musicLibraryRepository,
    loadLibraryTracks,
    localMusicImportFacade: new LocalMusicImportFacade(filePicker, fileDiscovery, importLocalTracks),
    artworkUrlResolver,
  }
}
