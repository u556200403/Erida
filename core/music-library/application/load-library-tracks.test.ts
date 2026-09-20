import { describe, expect, it, vi } from 'vitest'
import { LoadLibraryTracks } from './load-library-tracks'
import type { MusicLibraryRepository } from '../domain/music-library-repository'
import type { LocalTrackAvailabilityChecker } from './local-track-availability-checker'

const localTrack = (id: string, locator: string) => ({
  id,
  title: `Track ${id}`,
  artist: 'Artist',
  album: null,
  durationSeconds: null,
  artworkRef: null,
  source: { kind: 'local' as const, locator },
})

describe('LoadLibraryTracks', () => {
  it('marks an existing local track as available', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn().mockResolvedValue([localTrack('present', 'C:/Music/present.mp3')]),
      addTrack: vi.fn(), removeTrack: vi.fn(),
    }
    const availabilityChecker: LocalTrackAvailabilityChecker = {
      isAvailable: vi.fn().mockResolvedValue(true),
    }

    await expect(new LoadLibraryTracks(repository, availabilityChecker).execute()).resolves.toMatchObject([
      { id: 'present', availability: 'available' },
    ])
    expect(availabilityChecker.isAvailable).toHaveBeenCalledWith('C:/Music/present.mp3')
  })

  it('marks a missing local track as unavailable', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn().mockResolvedValue([localTrack('missing', 'C:/Music/missing.mp3')]),
      addTrack: vi.fn(), removeTrack: vi.fn(),
    }
    const availabilityChecker: LocalTrackAvailabilityChecker = {
      isAvailable: vi.fn().mockResolvedValue(false),
    }

    await expect(new LoadLibraryTracks(repository, availabilityChecker).execute()).resolves.toMatchObject([
      { id: 'missing', availability: 'unavailable' },
    ])
  })

  it('keeps loading the library when one availability check fails', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn().mockResolvedValue([
        localTrack('failed-check', 'C:/Music/failed.mp3'),
        localTrack('present', 'C:/Music/present.mp3'),
        { ...localTrack('service', 'ignored'), source: { kind: 'service' as const, provider: 'example', externalId: '1' } },
      ]),
      addTrack: vi.fn(), removeTrack: vi.fn(),
    }
    const availabilityChecker: LocalTrackAvailabilityChecker = {
      isAvailable: vi.fn()
        .mockRejectedValueOnce(new Error('Access denied'))
        .mockResolvedValueOnce(true),
    }

    await expect(new LoadLibraryTracks(repository, availabilityChecker).execute()).resolves.toMatchObject([
      { id: 'failed-check', availability: 'unavailable' },
      { id: 'present', availability: 'available' },
      { id: 'service', availability: 'not-applicable' },
    ])
    expect(availabilityChecker.isAvailable).toHaveBeenCalledTimes(2)
  })
})
