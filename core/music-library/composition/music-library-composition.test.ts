import { describe, expect, it, vi } from 'vitest'

const { pickFiles, readMetadata } = vi.hoisted(() => ({
  pickFiles: vi.fn(),
  readMetadata: vi.fn(),
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

import { createMusicLibraryApplication } from './music-library-composition'

describe('createMusicLibraryApplication', () => {
  it('imports selected tracks into the repository exposed for library reads', async () => {
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
  })
})
