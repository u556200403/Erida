import { describe, expect, it, vi } from 'vitest'
import type { MusicLibraryRepository } from '../domain/music-library-repository'
import type { AudioMetadataReader } from './audio-metadata-reader'
import type { EmbeddedArtworkExtractor } from './embedded-artwork-extractor'
import type { LocalArtworkExtractor } from './local-artwork-extractor'
import { ImportLocalTracks, titleFromFilename } from './import-local-tracks'

describe('ImportLocalTracks', () => {
  const noArtwork: EmbeddedArtworkExtractor = {
    extract: vi.fn().mockResolvedValue(null),
  }
  const noLocalArtwork: LocalArtworkExtractor = {
    extract: vi.fn().mockResolvedValue(null),
  }

  it('converts a local music file into a local track and persists it', async () => {
    const repository: MusicLibraryRepository = {
  listTracks: vi.fn(),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
    }
    const metadataReader: AudioMetadataReader = {
      read: vi.fn().mockResolvedValue({
        title: 'Neon Lights (Remastered)',
        artist: 'The Comets',
        album: 'Midnight Drive',
        durationSeconds: 245,
      }),
    }
    const generateTrackId = vi.fn(() => 'track-1')
    const useCase = new ImportLocalTracks(repository, metadataReader, noArtwork, noLocalArtwork, generateTrackId)

    const tracks = await useCase.execute([
      { locator: 'file:///music/Neon%20Lights.mp3', filename: 'Neon Lights.mp3' },
    ])

    const expectedTrack = {
      id: 'track-1',
      title: 'Neon Lights (Remastered)',
      artist: 'The Comets',
      album: 'Midnight Drive',
      durationSeconds: 245,
      artworkRef: null,
      source: { kind: 'local' as const, locator: 'file:///music/Neon%20Lights.mp3' },
    }

    expect(tracks).toEqual([expectedTrack])
    expect(generateTrackId).toHaveBeenCalledOnce()
    expect(repository.addTrack).toHaveBeenCalledOnce()
    expect(repository.addTrack).toHaveBeenCalledWith(expectedTrack)
    expect(repository.listTracks).not.toHaveBeenCalled()
  })

  it('uses fallback values when metadata is unavailable', async () => {
    const repository: MusicLibraryRepository = {
  listTracks: vi.fn(),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
    }
    const metadataReader: AudioMetadataReader = {
      read: vi.fn().mockResolvedValue({
        title: null,
        artist: null,
        album: null,
        durationSeconds: null,
      }),
    }
    const useCase = new ImportLocalTracks(repository, metadataReader, noArtwork, noLocalArtwork, () => 'track-1')

    const tracks = await useCase.execute([
      { locator: 'file:///music/Live.At.Home.flac', filename: 'Live.At.Home.flac' },
    ])

    expect(tracks[0]).toMatchObject({
      title: 'Live.At.Home',
      artist: 'Unknown Artist',
      album: null,
      durationSeconds: null,
    })
  })

  it('derives a title by removing only the final filename extension', () => {
    expect(titleFromFilename('Live.At.Home.flac')).toBe('Live.At.Home')
    expect(titleFromFilename('Untitled')).toBe('Untitled')
  })

  it('imports multiple files with deterministic generated IDs', async () => {
    const repository: MusicLibraryRepository = {
  listTracks: vi.fn(),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
    }
    const generateTrackId = vi.fn()
      .mockReturnValueOnce('track-1')
      .mockReturnValueOnce('track-2')
    const metadataReader: AudioMetadataReader = {
      read: vi.fn().mockResolvedValue({
        title: null,
        artist: null,
        album: null,
        durationSeconds: null,
      }),
    }
    const useCase = new ImportLocalTracks(repository, metadataReader, noArtwork, noLocalArtwork, generateTrackId)

    const tracks = await useCase.execute([
      { locator: 'file:///music/First.mp3', filename: 'First.mp3' },
      { locator: 'file:///music/Second.ogg', filename: 'Second.ogg' },
    ])

    expect(tracks.map((track) => track.id)).toEqual(['track-1', 'track-2'])
    expect(repository.addTrack).toHaveBeenCalledTimes(2)
    expect(repository.addTrack).toHaveBeenNthCalledWith(1, tracks[0])
    expect(repository.addTrack).toHaveBeenNthCalledWith(2, tracks[1])
  })

  it('falls back for a reader failure and continues importing later files', async () => {
    const repository: MusicLibraryRepository = {
  listTracks: vi.fn(),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
    }
    const metadataReader: AudioMetadataReader = {
      read: vi
        .fn()
        .mockRejectedValueOnce(new Error('Unreadable metadata'))
        .mockResolvedValueOnce({
          title: 'Second Title',
          artist: 'Second Artist',
          album: 'Second Album',
          durationSeconds: 180,
        }),
    }
    const generateTrackId = vi.fn()
      .mockReturnValueOnce('track-1')
      .mockReturnValueOnce('track-2')
    const useCase = new ImportLocalTracks(repository, metadataReader, noArtwork, noLocalArtwork, generateTrackId)

    const tracks = await useCase.execute([
      { locator: 'file:///music/First.mp3', filename: 'First.mp3' },
      { locator: 'file:///music/Second.ogg', filename: 'Second.ogg' },
    ])

    expect(tracks).toMatchObject([
      {
        id: 'track-1',
        title: 'First',
        artist: 'Unknown Artist',
        album: null,
        durationSeconds: null,
      },
      {
        id: 'track-2',
        title: 'Second Title',
        artist: 'Second Artist',
        album: 'Second Album',
        durationSeconds: 180,
      },
    ])
    expect(metadataReader.read).toHaveBeenCalledTimes(2)
    expect(repository.addTrack).toHaveBeenCalledTimes(2)
    expect(repository.addTrack).toHaveBeenNthCalledWith(1, tracks[0])
    expect(repository.addTrack).toHaveBeenNthCalledWith(2, tracks[1])
  })

  it('persists extracted artwork without putting its bytes on the track', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn(), addTrack: vi.fn(), removeTrack: vi.fn(),
    }
    const metadataReader: AudioMetadataReader = {
      read: vi.fn().mockResolvedValue({ title: null, artist: null, album: null, durationSeconds: null }),
    }
    const artworkExtractor: EmbeddedArtworkExtractor = {
      extract: vi.fn().mockResolvedValue('embedded/track-1.jpg'),
    }
    const useCase = new ImportLocalTracks(repository, metadataReader, artworkExtractor, noLocalArtwork, () => 'track-1')

    await expect(useCase.execute([{ locator: 'C:/Music/Track.mp3', filename: 'Track.mp3' }]))
      .resolves.toMatchObject([{ id: 'track-1', artworkRef: 'embedded/track-1.jpg' }])
    expect(artworkExtractor.extract).toHaveBeenCalledWith(
      { locator: 'C:/Music/Track.mp3', filename: 'Track.mp3' },
      'track-1',
    )
  })

  it('uses local artwork only when embedded artwork is absent', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn(), addTrack: vi.fn(), removeTrack: vi.fn(),
    }
    const metadataReader: AudioMetadataReader = {
      read: vi.fn().mockResolvedValue({ title: null, artist: null, album: null, durationSeconds: null }),
    }
    const embeddedArtwork: EmbeddedArtworkExtractor = {
      extract: vi.fn().mockResolvedValue(null),
    }
    const localArtwork: LocalArtworkExtractor = {
      extract: vi.fn().mockResolvedValue('local/track-1.png'),
    }
    const useCase = new ImportLocalTracks(repository, metadataReader, embeddedArtwork, localArtwork, () => 'track-1')

    await expect(useCase.execute([{ locator: 'C:/Music/Track.mp3', filename: 'Track.mp3' }]))
      .resolves.toMatchObject([{ artworkRef: 'local/track-1.png' }])
    expect(localArtwork.extract).toHaveBeenCalledOnce()

    embeddedArtwork.extract = vi.fn().mockResolvedValue('embedded/track-1.jpg')
    await useCase.execute([{ locator: 'C:/Music/Track.mp3', filename: 'Track.mp3' }])
    expect(localArtwork.extract).toHaveBeenCalledOnce()
  })

  it('persists a track when artwork extraction fails', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn(), addTrack: vi.fn(), removeTrack: vi.fn(),
    }
    const metadataReader: AudioMetadataReader = {
      read: vi.fn().mockResolvedValue({ title: 'Track', artist: 'Artist', album: null, durationSeconds: null }),
    }
    const artworkExtractor: EmbeddedArtworkExtractor = {
      extract: vi.fn().mockRejectedValue(new Error('Cache unavailable')),
    }
    const useCase = new ImportLocalTracks(repository, metadataReader, artworkExtractor, noLocalArtwork, () => 'track-1')

    await expect(useCase.execute([{ locator: 'C:/Music/Track.mp3', filename: 'Track.mp3' }]))
      .resolves.toMatchObject([{ artworkRef: null }])
    expect(repository.addTrack).toHaveBeenCalledWith(expect.objectContaining({ artworkRef: null }))
  })

  it('persists a track when local artwork lookup fails', async () => {
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn(), addTrack: vi.fn(), removeTrack: vi.fn(),
    }
    const metadataReader: AudioMetadataReader = {
      read: vi.fn().mockResolvedValue({ title: 'Track', artist: 'Artist', album: null, durationSeconds: null }),
    }
    const localArtwork: LocalArtworkExtractor = {
      extract: vi.fn().mockRejectedValue(new Error('Directory unavailable')),
    }
    const useCase = new ImportLocalTracks(repository, metadataReader, noArtwork, localArtwork, () => 'track-1')

    await expect(useCase.execute([{ locator: 'C:/Music/Track.mp3', filename: 'Track.mp3' }]))
      .resolves.toMatchObject([{ artworkRef: null }])
    expect(repository.addTrack).toHaveBeenCalledWith(expect.objectContaining({ artworkRef: null }))
  })

  it('propagates repository failures after metadata and artwork processing', async () => {
    const error = new Error('SQLite is busy')
    const repository: MusicLibraryRepository = {
      listTracks: vi.fn(), addTrack: vi.fn().mockRejectedValue(error), removeTrack: vi.fn(),
    }
    const metadataReader: AudioMetadataReader = {
      read: vi.fn().mockResolvedValue({ title: null, artist: null, album: null, durationSeconds: null }),
    }
    const useCase = new ImportLocalTracks(repository, metadataReader, noArtwork, noLocalArtwork, () => 'track-1')

    await expect(useCase.execute([{ locator: 'C:/Music/Track.mp3', filename: 'Track.mp3' }])).rejects.toBe(error)
  })
})
