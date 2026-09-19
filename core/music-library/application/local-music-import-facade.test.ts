import { describe, expect, it, vi } from 'vitest'
import type { Track } from '../domain/track'
import type { LocalMusicFile } from './local-music-file'
import type { LocalMusicFilePicker } from './local-music-file-picker'
import {
  LocalMusicImportFacade,
  type LocalTracksImporter,
} from './local-music-import-facade'

describe('LocalMusicImportFacade', () => {
  it('passes selected descriptors unchanged to ImportLocalTracks and returns imported tracks', async () => {
    const files: readonly LocalMusicFile[] = [
      { locator: 'opaque-local-file-reference::A%2F1', filename: 'First.mp3' },
    ]
    const importedTracks: Track[] = [
      {
        id: 'track-1',
        title: 'First',
        artist: 'Artist',
        album: null,
        durationSeconds: 180,
        source: { kind: 'local', locator: files[0].locator },
      },
    ]
    const filePicker: LocalMusicFilePicker = {
      pickFiles: vi.fn().mockResolvedValue(files),
      pickFolder: vi.fn(),
    }
    const importLocalTracks: LocalTracksImporter = {
      execute: vi.fn().mockResolvedValue(importedTracks),
    }
    const facade = new LocalMusicImportFacade(filePicker, importLocalTracks)

    const tracks = await facade.importSelectedFiles()

    expect(filePicker.pickFiles).toHaveBeenCalledOnce()
    expect(importLocalTracks.execute).toHaveBeenCalledOnce()
    expect(importLocalTracks.execute).toHaveBeenCalledWith(files)
    expect(vi.mocked(importLocalTracks.execute).mock.calls[0][0]).toBe(files)
    expect(tracks).toBe(importedTracks)
  })

  it('returns an empty result without importing when file selection is cancelled', async () => {
    const filePicker: LocalMusicFilePicker = {
      pickFiles: vi.fn().mockResolvedValue([]),
      pickFolder: vi.fn(),
    }
    const importLocalTracks: LocalTracksImporter = {
      execute: vi.fn(),
    }
    const facade = new LocalMusicImportFacade(filePicker, importLocalTracks)

    await expect(facade.importSelectedFiles()).resolves.toEqual([])

    expect(filePicker.pickFiles).toHaveBeenCalledOnce()
    expect(importLocalTracks.execute).not.toHaveBeenCalled()
  })

  it('passes recursively discovered folder files through the existing importer', async () => {
    const files: readonly LocalMusicFile[] = [
      { locator: 'C:\\Music\\nested\\First.MP3', filename: 'First.MP3' },
    ]
    const filePicker: LocalMusicFilePicker = {
      pickFiles: vi.fn(),
      pickFolder: vi.fn().mockResolvedValue(files),
    }
    const importLocalTracks: LocalTracksImporter = {
      execute: vi.fn().mockResolvedValue([]),
    }
    const facade = new LocalMusicImportFacade(filePicker, importLocalTracks)

    await facade.importSelectedFolder()

    expect(filePicker.pickFiles).not.toHaveBeenCalled()
    expect(filePicker.pickFolder).toHaveBeenCalledOnce()
    expect(importLocalTracks.execute).toHaveBeenCalledWith(files)
  })

  it('returns an empty result without importing when folder selection is cancelled or empty', async () => {
    const filePicker: LocalMusicFilePicker = {
      pickFiles: vi.fn(),
      pickFolder: vi.fn().mockResolvedValue([]),
    }
    const importLocalTracks: LocalTracksImporter = { execute: vi.fn() }
    const facade = new LocalMusicImportFacade(filePicker, importLocalTracks)

    await expect(facade.importSelectedFolder()).resolves.toEqual([])

    expect(importLocalTracks.execute).not.toHaveBeenCalled()
  })
})
