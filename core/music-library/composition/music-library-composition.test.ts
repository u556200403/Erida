import { describe, expect, it, vi } from 'vitest'

const { pickFiles, readMetadata, repositoryInstances } = vi.hoisted(() => ({
  pickFiles: vi.fn(),
  readMetadata: vi.fn(),
  repositoryInstances: [] as Array<{
    tracks: unknown[]
    addTrack: ReturnType<typeof vi.fn>
    listTracks: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock('../infrastructure/tauri/tauri-local-music-file-picker', () => ({
  TauriLocalMusicFilePicker: class {
    pickFiles = pickFiles
  },
}))

vi.mock('../infrastructure/tauri/tauri-audio-metadata-reader', () => ({
  TauriAudioMetadataReader: class {
    read = readMetadata
  },
}))

vi.mock('../infrastructure/tauri/tauri-music-library-repository', () => ({
  TauriMusicLibraryRepository: class {
    tracks: unknown[] = []
    addTrack = vi.fn(async (track: unknown) => {
      this.tracks.push(track)
    })
    listTracks = vi.fn(async () => this.tracks)

    constructor() {
      repositoryInstances.push(this)
    }
  },
}))

import { createMusicLibraryApplication } from './music-library-composition'
import { TauriMusicLibraryRepository } from '../infrastructure/tauri/tauri-music-library-repository'

describe('createMusicLibraryApplication', () => {
  it('uses a persistent Tauri repository shared by imports and library reads', async () => {
    pickFiles.mockResolvedValue([
      { locator: 'C:/Music/Afterglow.mp3', filename: 'Afterglow.mp3' },
    ])
    readMetadata.mockResolvedValue({
      title: 'Afterglow',
      artist: 'Lumen',
      album: null,
      durationSeconds: 212,
    })

    const { musicLibraryRepository, localMusicImportFacade } = createMusicLibraryApplication()

    expect(pickFiles).not.toHaveBeenCalled()
    expect(readMetadata).not.toHaveBeenCalled()
    expect(musicLibraryRepository).toBeInstanceOf(TauriMusicLibraryRepository)
    expect(repositoryInstances).toHaveLength(1)
    expect(repositoryInstances[0]).toBe(musicLibraryRepository)

    await localMusicImportFacade.importSelectedFiles()

    await expect(musicLibraryRepository.listTracks()).resolves.toContainEqual({
      id: expect.any(String),
      title: 'Afterglow',
      artist: 'Lumen',
      album: null,
      durationSeconds: 212,
      source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
    })
    expect(pickFiles).toHaveBeenCalledOnce()
    expect(readMetadata).toHaveBeenCalledOnce()
    expect(repositoryInstances[0]?.addTrack).toHaveBeenCalledOnce()
    expect(repositoryInstances[0]?.listTracks).toHaveBeenCalledOnce()
  })
})
