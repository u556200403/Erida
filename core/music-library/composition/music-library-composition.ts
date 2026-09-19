import { ImportLocalTracks, type TrackIdGenerator } from '../application/import-local-tracks'
import { LocalMusicImportFacade } from '../application/local-music-import-facade'
import type { MusicLibraryRepository } from '../domain/music-library-repository'
import { TauriAudioMetadataReader } from '../infrastructure/tauri/tauri-audio-metadata-reader'
import { TauriLocalMusicFileDiscovery } from '../infrastructure/tauri/tauri-local-music-file-discovery'
import { TauriLocalMusicFilePicker } from '../infrastructure/tauri/tauri-local-music-file-picker'
import { TauriMusicLibraryRepository } from '../infrastructure/tauri/tauri-music-library-repository'

export interface MusicLibraryApplication {
  musicLibraryRepository: MusicLibraryRepository
  localMusicImportFacade: LocalMusicImportFacade
}

export function createMusicLibraryApplication(): MusicLibraryApplication {
  const musicLibraryRepository = new TauriMusicLibraryRepository()
  const fileDiscovery = new TauriLocalMusicFileDiscovery()
  const filePicker = new TauriLocalMusicFilePicker(undefined, undefined, fileDiscovery)
  const metadataReader = new TauriAudioMetadataReader()
  const generateTrackId: TrackIdGenerator = () => crypto.randomUUID()
  const importLocalTracks = new ImportLocalTracks(
    musicLibraryRepository,
    metadataReader,
    generateTrackId,
  )

  return {
    musicLibraryRepository,
    localMusicImportFacade: new LocalMusicImportFacade(filePicker, fileDiscovery, importLocalTracks),
  }
}
