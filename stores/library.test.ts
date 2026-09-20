import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import type { MusicLibraryRepository } from '~/core/music-library/domain/music-library-repository'
import type { LocalMusicImportFacade } from '~/core/music-library/application/local-music-import-facade'
import type { ArtworkUrlResolver } from '~/core/music-library/application/artwork-url-resolver'

const repository: MusicLibraryRepository = {
  listTracks: vi.fn(),
  addTrack: vi.fn(),
  removeTrack: vi.fn(),
}
const localMusicImportFacade: Pick<LocalMusicImportFacade, 'importSelectedFiles' | 'importSelectedFolder' | 'importDroppedPaths'> = {
  importSelectedFiles: vi.fn(),
  importSelectedFolder: vi.fn(),
  importDroppedPaths: vi.fn(),
}
const artworkUrlResolver: ArtworkUrlResolver = {
  resolve: vi.fn(),
}
const loadLibraryTracks = {
  execute: vi.fn(() => repository.listTracks()),
}

describe('useLibraryStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    vi.stubGlobal('defineStore', defineStore)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('useNuxtApp', () => ({
      $musicLibraryRepository: repository,
      $loadLibraryTracks: loadLibraryTracks,
      $localMusicImportFacade: localMusicImportFacade,
      $artworkUrlResolver: artworkUrlResolver,
    }))
    vi.mocked(artworkUrlResolver.resolve).mockResolvedValue(null)
  })

  it('imports selected files and refreshes tracks through the injected repository', async () => {
    vi.mocked(artworkUrlResolver.resolve).mockResolvedValue('asset://track-4.jpg')
    vi.mocked(localMusicImportFacade.importSelectedFiles).mockResolvedValue([])
    vi.mocked(repository.listTracks).mockResolvedValue([
      {
        id: 'track-4',
        title: 'Afterglow',
        artist: 'Lumen',
        album: null,
        durationSeconds: 212,
        artworkRef: 'embedded/track-4.jpg',
        source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
      },
    ])
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    await store.importSelectedFiles()

    expect(localMusicImportFacade.importSelectedFiles).toHaveBeenCalledOnce()
    expect(repository.listTracks).toHaveBeenCalledOnce()
    expect(artworkUrlResolver.resolve).toHaveBeenCalledWith('embedded/track-4.jpg')
    expect(store.tracks).toEqual([{
      id: 'track-4',
      title: 'Afterglow',
      artist: 'Lumen',
      album: '—',
      duration: '3:32',
      artworkUrl: 'asset://track-4.jpg',
      source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
    }])
  })

  it('does not depend on Tauri infrastructure adapters', async () => {
    const source = await readFile(fileURLToPath(new URL('./library.ts', import.meta.url)), 'utf8')

    expect(source).not.toContain('infrastructure/tauri')
  })

  it('keeps the latest library load state when an older artwork resolution finishes later', async () => {
    let rejectOlderArtwork!: (reason?: unknown) => void
    let resolveLatestArtwork!: (artworkUrl: string | null) => void
    const olderArtwork = new Promise<string | null>((_, reject) => {
      rejectOlderArtwork = reject
    })
    const latestArtwork = new Promise<string | null>((resolve) => {
      resolveLatestArtwork = resolve
    })
    vi.mocked(repository.listTracks)
      .mockResolvedValueOnce([{
        id: 'older-track', title: 'Older', artist: 'Lumen', album: null, durationSeconds: 120,
        artworkRef: 'embedded/older-track.jpg', source: { kind: 'local', locator: 'C:/Music/Older.mp3' },
      }])
      .mockResolvedValueOnce([{
        id: 'latest-track', title: 'Latest', artist: 'Lumen', album: null, durationSeconds: 180,
        artworkRef: 'embedded/latest-track.jpg', source: { kind: 'local', locator: 'C:/Music/Latest.mp3' },
      }])
    vi.mocked(artworkUrlResolver.resolve).mockImplementation((artworkRef) => {
      return artworkRef === 'embedded/older-track.jpg' ? olderArtwork : latestArtwork
    })
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    const olderLoad = store.loadTracks()
    await Promise.resolve()
    const latestLoad = store.loadTracks()
    await Promise.resolve()

    rejectOlderArtwork(new Error('stale artwork lookup failed'))
    await expect(olderLoad).resolves.toBe(false)

    expect(store.isLoading).toBe(true)
    expect(store.error).toBeNull()
    expect(store.tracks).toEqual([])

    resolveLatestArtwork('asset://latest-track.jpg')
    await expect(latestLoad).resolves.toBe(true)

    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.tracks).toMatchObject([{
      id: 'latest-track',
      artworkUrl: 'asset://latest-track.jpg',
    }])
  })

  it('imports a selected folder and refreshes tracks through injected application services', async () => {
    vi.mocked(localMusicImportFacade.importSelectedFolder).mockResolvedValue([])
    vi.mocked(repository.listTracks).mockResolvedValue([])
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    await store.importSelectedFolder()

    expect(localMusicImportFacade.importSelectedFolder).toHaveBeenCalledOnce()
    expect(repository.listTracks).toHaveBeenCalledOnce()
  })

  it('imports dropped paths and refreshes tracks through the same application service', async () => {
    vi.mocked(localMusicImportFacade.importDroppedPaths).mockResolvedValue([])
    vi.mocked(repository.listTracks).mockResolvedValue([])
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    await store.importDroppedPaths(['C:/Music/First.mp3', 'C:/Music/Album'])

    expect(localMusicImportFacade.importDroppedPaths).toHaveBeenCalledWith([
      'C:/Music/First.mp3',
      'C:/Music/Album',
    ])
    expect(repository.listTracks).toHaveBeenCalledOnce()
  })

  it('shares an import guard between picker and dropped-path imports', async () => {
    let resolveImport!: () => void
    vi.mocked(localMusicImportFacade.importSelectedFiles).mockImplementation(() => new Promise<void>((resolve) => {
      resolveImport = resolve
    }).then(() => []))
    vi.mocked(repository.listTracks).mockResolvedValue([])
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    const pickerImport = store.importSelectedFiles()
    await Promise.resolve()
    await store.importDroppedPaths(['C:/Music/Second.mp3'])

    expect(store.isImporting).toBe(true)
    expect(localMusicImportFacade.importSelectedFiles).toHaveBeenCalledOnce()
    expect(localMusicImportFacade.importDroppedPaths).not.toHaveBeenCalled()

    resolveImport()
    await pickerImport

    expect(store.isImporting).toBe(false)
  })

  it('clears pending state and exposes an error when an import fails', async () => {
    vi.mocked(localMusicImportFacade.importDroppedPaths).mockRejectedValue(new Error('Discovery failed'))
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    await store.importDroppedPaths(['C:/Music/Unreadable'])

    expect(store.isImporting).toBe(false)
    expect(store.importError).toBe('Unable to import music. Please try again.')
    expect(repository.listTracks).not.toHaveBeenCalled()
  })

  it('removes a track and refreshes the library through the repository', async () => {
    vi.mocked(repository.removeTrack).mockResolvedValue(undefined)
    vi.mocked(repository.listTracks).mockResolvedValue([])
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    await expect(store.removeTrack('track-4')).resolves.toBe(true)

    expect(repository.removeTrack).toHaveBeenCalledWith('track-4')
    expect(repository.listTracks).toHaveBeenCalledOnce()
    expect(store.isRemoving).toBe(false)
    expect(store.removeError).toBeNull()
  })

  it('does not report success when the library cannot resynchronize after removal', async () => {
    vi.mocked(repository.removeTrack).mockResolvedValue(undefined)
    vi.mocked(repository.listTracks).mockRejectedValue(new Error('SQLite is busy'))
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    await expect(store.removeTrack('track-4')).resolves.toBe(false)

    expect(repository.removeTrack).toHaveBeenCalledWith('track-4')
    expect(repository.listTracks).toHaveBeenCalledOnce()
    expect(store.error).toBe('Unable to load library tracks.')
    expect(store.isRemoving).toBe(false)
    expect(store.removeError).toBeNull()
  })

  it('exposes a user-safe error and propagates a failed removal', async () => {
    const error = new Error('SQLite is busy')
    vi.mocked(repository.removeTrack).mockRejectedValue(error)
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    await expect(store.removeTrack('track-4')).rejects.toBe(error)

    expect(store.isRemoving).toBe(false)
    expect(store.removeError).toBe('Unable to remove track. Please try again.')
    expect(repository.listTracks).not.toHaveBeenCalled()
  })

  it('prevents duplicate removals while a removal is running', async () => {
    let resolveRemoval!: () => void
    vi.mocked(repository.removeTrack).mockImplementation(() => new Promise<void>((resolve) => {
      resolveRemoval = resolve
    }))
    vi.mocked(repository.listTracks).mockResolvedValue([])
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    const firstRemoval = store.removeTrack('track-4')
    await Promise.resolve()

    await expect(store.removeTrack('track-4')).resolves.toBe(false)
    expect(repository.removeTrack).toHaveBeenCalledOnce()
    expect(store.isRemoving).toBe(true)

    resolveRemoval()
    await expect(firstRemoval).resolves.toBe(true)
    expect(store.isRemoving).toBe(false)
  })
})
