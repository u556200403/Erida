import { describe, expect, it } from 'vitest'
import type { Track } from '../domain/track'
import { InMemoryMusicLibraryRepository } from './in-memory-music-library-repository'

const track: Track = {
  id: '4',
  title: 'Nightcall',
  artist: 'Kavinsky',
  album: 'OutRun',
  durationSeconds: 257,
  artworkRef: null,
  source: { kind: 'service', provider: 'demo', externalId: 'nightcall' },
}

describe('InMemoryMusicLibraryRepository', () => {
  it('returns the initial demo tracks', async () => {
    const repository = new InMemoryMusicLibraryRepository()

    await expect(repository.listTracks()).resolves.toMatchObject([
      { id: '1', title: 'Midnight City' },
      { id: '2', title: 'Teardrop' },
      { id: '3', title: 'Everything In Its Right Place' },
    ])
  })

  it('adds a track and preserves its data', async () => {
    const repository = new InMemoryMusicLibraryRepository()

    await repository.addTrack(track)

    await expect(repository.listTracks()).resolves.toContainEqual(track)
  })

  it('keeps added tracks isolated between repository instances', async () => {
    const firstRepository = new InMemoryMusicLibraryRepository()
    const secondRepository = new InMemoryMusicLibraryRepository()

    await firstRepository.addTrack(track)

    await expect(firstRepository.listTracks()).resolves.toContainEqual(track)
    await expect(secondRepository.listTracks()).resolves.not.toContainEqual(track)
  })

  it('removes only the matching library record and ignores a missing id', async () => {
    const repository = new InMemoryMusicLibraryRepository()
    await repository.addTrack(track)

    await repository.removeTrack(track.id)
    await repository.removeTrack('missing-track')

    await expect(repository.listTracks()).resolves.not.toContainEqual(track)
    await expect(repository.listTracks()).resolves.toHaveLength(3)
  })
})
