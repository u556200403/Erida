import { describe, expect, it, vi } from 'vitest'
import type { MusicLibraryRepository } from '../domain/music-library-repository'
import { ImportLocalTracks, titleFromFilename } from './import-local-tracks'

describe('ImportLocalTracks', () => {
  it('converts a local music file into a local track and persists it', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn(),
      addTrack: vi.fn(),
    }
    const generateTrackId = vi.fn(() => 'track-1')
    const useCase = new ImportLocalTracks(repository, generateTrackId)

    const tracks = await useCase.execute([
      { locator: 'file:///music/Neon%20Lights.mp3', filename: 'Neon Lights.mp3' },
    ])

    const expectedTrack = {
      id: 'track-1',
      title: 'Neon Lights',
      artist: 'Unknown Artist',
      album: null,
      durationSeconds: null,
      source: { kind: 'local' as const, locator: 'file:///music/Neon%20Lights.mp3' },
    }

    expect(tracks).toEqual([expectedTrack])
    expect(generateTrackId).toHaveBeenCalledOnce()
    expect(repository.addTrack).toHaveBeenCalledOnce()
    expect(repository.addTrack).toHaveBeenCalledWith(expectedTrack)
  })

  it('derives a title by removing only the final filename extension', () => {
    expect(titleFromFilename('Live.At.Home.flac')).toBe('Live.At.Home')
    expect(titleFromFilename('Untitled')).toBe('Untitled')
  })

  it('imports multiple files with deterministic generated IDs', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn(),
      addTrack: vi.fn(),
    }
    const generateTrackId = vi.fn()
      .mockReturnValueOnce('track-1')
      .mockReturnValueOnce('track-2')
    const useCase = new ImportLocalTracks(repository, generateTrackId)

    const tracks = await useCase.execute([
      { locator: 'file:///music/First.mp3', filename: 'First.mp3' },
      { locator: 'file:///music/Second.ogg', filename: 'Second.ogg' },
    ])

    expect(tracks.map((track) => track.id)).toEqual(['track-1', 'track-2'])
    expect(repository.addTrack).toHaveBeenCalledTimes(2)
    expect(repository.addTrack).toHaveBeenNthCalledWith(1, tracks[0])
    expect(repository.addTrack).toHaveBeenNthCalledWith(2, tracks[1])
  })
})
