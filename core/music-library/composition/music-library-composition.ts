import { ImportLocalTracks, type TrackIdGenerator } from '../application/import-local-tracks'
import { LocalMusicImportFacade } from '../application/local-music-import-facade'
import type { MusicLibraryRepository } from '../domain/music-library-repository'
import { InMemoryMusicLibraryRepository } from '../infrastructure/in-memory-music-library-repository'
import { TauriAudioMetadataReader } from '../infrastructure/tauri/tauri-audio-metadata-reader'
import { TauriLocalMusicFilePicker } from '../infrastructure/tauri/tauri-local-music-file-picker'

export interface MusicLibraryApplication {
  musicLibraryRepository: MusicLibraryRepository
  localMusicImportFacade: LocalMusicImportFacade
}

export function createMusicLibraryApplication(): MusicLibraryApplication {
  const musicLibraryRepository = new InMemoryMusicLibraryRepository()
  const filePicker = new TauriLocalMusicFilePicker()
  const metadataReader = new TauriAudioMetadataReader()
  const generateTrackId: TrackIdGenerator = () => crypto.randomUUID()
  const importLocalTracks = new ImportLocalTracks(
    musicLibraryRepository,
    metadataReader,
    generateTrackId,
  )

  return {
    musicLibraryRepository,
    localMusicImportFacade: new LocalMusicImportFacade(filePicker, importLocalTracks),
  }
}
