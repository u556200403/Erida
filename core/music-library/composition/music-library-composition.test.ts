import { beforeEach, describe, expect, it, vi } from 'vitest'

const { pickFiles, pickFolder, readMetadata, extractArtwork, extractLocalArtwork, repositoryInstances } = vi.hoisted(() => ({
  pickFiles: vi.fn(),
  pickFolder: vi.fn(),
  readMetadata: vi.fn(),
  extractArtwork: vi.fn().mockResolvedValue(null),
  extractLocalArtwork: vi.fn().mockResolvedValue(null),
  repositoryInstances: [] as Array<{
    tracks: unknown[]
    addTrack: ReturnType<typeof vi.fn>
    listTracks: ReturnType<typeof vi.fn>
    removeTrack: ReturnType<typeof vi.fn>
  }>,
}))

const discover = vi.hoisted(() => vi.fn())

vi.mock('../infrastructure/tauri/tauri-local-music-file-discovery', () => ({
  TauriLocalMusicFileDiscovery: class {
    discover = discover
  },
}))

vi.mock('../infrastructure/tauri/tauri-local-music-file-picker', () => ({
  TauriLocalMusicFilePicker: class {
    constructor(_: unknown, __: unknown, private readonly discovery: { discover: typeof discover }) {}
    pickFiles = pickFiles
    pickFolder = pickFolder
  },
}))

vi.mock('../infrastructure/tauri/tauri-audio-metadata-reader', () => ({
  TauriAudioMetadataReader: class {
    read = readMetadata
  },
}))

vi.mock('../infrastructure/tauri/tauri-embedded-artwork-extractor', () => ({
  TauriEmbeddedArtworkExtractor: class {
    extract = extractArtwork
  },
}))

vi.mock('../infrastructure/tauri/tauri-local-artwork-extractor', () => ({
  TauriLocalArtworkExtractor: class {
    extract = extractLocalArtwork
  },
}))

vi.mock('../infrastructure/tauri/tauri-music-library-repository', () => ({
  TauriMusicLibraryRepository: class {
    tracks: unknown[] = []
    addTrack = vi.fn(async (track: unknown) => {
      this.tracks.push(track)
    })
    listTracks = vi.fn(async () => this.tracks)
    removeTrack = vi.fn(async (id: string) => {
      this.tracks = this.tracks.filter((track) => (track as { id: string }).id !== id)
    })

    constructor() {
      repositoryInstances.push(this)
    }
  },
}))

import { createMusicLibraryApplication } from './music-library-composition'
import { TauriMusicLibraryRepository } from '../infrastructure/tauri/tauri-music-library-repository'
import { TauriArtworkUrlResolver } from '../infrastructure/tauri/tauri-artwork-url-resolver'

describe('createMusicLibraryApplication', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    repositoryInstances.splice(0)
  })

  it('uses a persistent Tauri repository shared by imports and library reads', async () => {
    pickFiles.mockResolvedValue([
      { locator: 'C:/Music/Afterglow.mp3', filename: 'Afterglow.mp3' },
    ])
    readMetadata.mockResolvedValue({
      title: 'Afterglow',
      artist: 'Lumen',
      album: null,
      durationSeconds: 212,
      artworkRef: null,
    })
    const { musicLibraryRepository, localMusicImportFacade, artworkUrlResolver } = createMusicLibraryApplication()

    expect(pickFiles).not.toHaveBeenCalled()
    expect(readMetadata).not.toHaveBeenCalled()
    expect(musicLibraryRepository).toBeInstanceOf(TauriMusicLibraryRepository)
    expect(artworkUrlResolver).toBeInstanceOf(TauriArtworkUrlResolver)
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
    expect(extractArtwork).toHaveBeenCalledOnce()
    expect(extractLocalArtwork).toHaveBeenCalledOnce()
    expect(repositoryInstances[0]?.addTrack).toHaveBeenCalledOnce()
    expect(repositoryInstances[0]?.listTracks).toHaveBeenCalledOnce()
  })

  it('wires folder discovery into the same import pipeline and repository', async () => {
    pickFolder.mockResolvedValue([
      { locator: 'C:/Music/nested/Folder Track.wav', filename: 'Folder Track.wav' },
    ])
    readMetadata.mockResolvedValue({
      title: null,
      artist: null,
      album: null,
      durationSeconds: null,
      artworkRef: null,
    })
    const { musicLibraryRepository, localMusicImportFacade } = createMusicLibraryApplication()

    expect(musicLibraryRepository).toBeInstanceOf(TauriMusicLibraryRepository)
    expect(repositoryInstances).toHaveLength(1)
    expect(repositoryInstances[0]).toBe(musicLibraryRepository)

    await localMusicImportFacade.importSelectedFolder()

    expect(pickFolder).toHaveBeenCalledOnce()
    expect(readMetadata).toHaveBeenCalledOnce()
    expect(extractArtwork).toHaveBeenCalledOnce()
    expect(extractLocalArtwork).toHaveBeenCalledOnce()
    await expect(musicLibraryRepository.listTracks()).resolves.toContainEqual({
      id: expect.any(String),
      title: 'Folder Track',
      artist: 'Unknown Artist',
      album: null,
      durationSeconds: null,
      source: { kind: 'local', locator: 'C:/Music/nested/Folder Track.wav' },
    })
    expect(repositoryInstances[0]?.addTrack).toHaveBeenCalledOnce()
    expect(repositoryInstances[0]?.listTracks).toHaveBeenCalledOnce()
  })

  it('wires dropped paths through discovery and the existing importer', async () => {
    discover.mockResolvedValue([
      { locator: 'C:/Music/Album/Drop Track.m4a', filename: 'Drop Track.m4a' },
    ])
    readMetadata.mockResolvedValue({
      title: 'Drop Track',
      artist: 'Lumen',
      album: null,
      durationSeconds: 190,
      artworkRef: null,
    })
    const { musicLibraryRepository, localMusicImportFacade } = createMusicLibraryApplication()

    await localMusicImportFacade.importDroppedPaths(['C:/Music/Album', 'C:/Music/ignored.txt'])

    expect(discover).toHaveBeenCalledWith(['C:/Music/Album', 'C:/Music/ignored.txt'])
    expect(readMetadata).toHaveBeenCalledOnce()
    await expect(musicLibraryRepository.listTracks()).resolves.toContainEqual({
      id: expect.any(String),
      title: 'Drop Track',
      artist: 'Lumen',
      album: null,
      durationSeconds: 190,
      source: { kind: 'local', locator: 'C:/Music/Album/Drop Track.m4a' },
    })
  })
})
