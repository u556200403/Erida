import { describe, expect, it, vi } from 'vitest'
import type { Track } from '../../domain/track'
import { TauriMusicLibraryRepository } from './tauri-music-library-repository'

const localTrack: Track = {
  id: 'local-1',
  title: 'Afterglow',
  artist: 'Lumen',
  album: 'First Light',
  durationSeconds: 212.75,
  source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
}

const serviceTrack: Track = {
  id: 'service-1',
  title: 'Orbit',
  artist: 'Nova',
  album: null,
  durationSeconds: null,
  source: { kind: 'service', provider: 'spotify', externalId: 'orbit-42' },
}

describe('TauriMusicLibraryRepository', () => {
  it('constructs with the default Tauri invoke function', () => {
    expect(() => new TauriMusicLibraryRepository()).not.toThrow()
  })

  it('invokes list_library_tracks and maps local sources with fractional durations', async () => {
    const invoke = vi.fn().mockResolvedValue([localTrack])
    const repository = new TauriMusicLibraryRepository(invoke)

    await expect(repository.listTracks()).resolves.toEqual([localTrack])
    expect(invoke).toHaveBeenCalledWith('list_library_tracks')
  })

  it('maps service sources and preserves nullable fields', async () => {
    const repository = new TauriMusicLibraryRepository(vi.fn().mockResolvedValue([serviceTrack]))

    await expect(repository.listTracks()).resolves.toEqual([serviceTrack])
  })

  it('invokes add_library_track with the complete Track DTO', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined)
    const repository = new TauriMusicLibraryRepository(invoke)

    await repository.addTrack(localTrack)

    expect(invoke).toHaveBeenCalledWith('add_library_track', { track: localTrack })
  })

  it('invokes remove_library_track with the track id', async () => {
    const invoke = vi.fn().mockResolvedValue(undefined)
    const repository = new TauriMusicLibraryRepository(invoke)

    await repository.removeTrack('local-1')

    expect(invoke).toHaveBeenCalledWith('remove_library_track', { id: 'local-1' })
  })

  it('propagates native persistence errors', async () => {
    const error = new Error('Native persistence failed')
    const repository = new TauriMusicLibraryRepository(vi.fn().mockRejectedValue(error))

    await expect(repository.listTracks()).rejects.toBe(error)
    await expect(repository.addTrack(localTrack)).rejects.toBe(error)
    await expect(repository.removeTrack(localTrack.id)).rejects.toBe(error)
  })
})
