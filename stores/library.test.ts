import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { createPinia, defineStore, setActivePinia } from 'pinia'
import type { MusicLibraryRepository } from '~/core/music-library/domain/music-library-repository'
import type { LocalMusicImportFacade } from '~/core/music-library/application/local-music-import-facade'

const repository: MusicLibraryRepository = {
  listTracks: vi.fn(),
  addTrack: vi.fn(),
}
const localMusicImportFacade: Pick<LocalMusicImportFacade, 'importSelectedFiles' | 'importSelectedFolder' | 'importDroppedPaths'> = {
  importSelectedFiles: vi.fn(),
  importSelectedFolder: vi.fn(),
  importDroppedPaths: vi.fn(),
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
      $localMusicImportFacade: localMusicImportFacade,
    }))
  })

  it('imports selected files and refreshes tracks through the injected repository', async () => {
    vi.mocked(localMusicImportFacade.importSelectedFiles).mockResolvedValue([])
    vi.mocked(repository.listTracks).mockResolvedValue([
      {
        id: 'track-4',
        title: 'Afterglow',
        artist: 'Lumen',
        album: null,
        durationSeconds: 212,
        source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
      },
    ])
    const { useLibraryStore } = await import('./library')
    const store = useLibraryStore()

    await store.importSelectedFiles()

    expect(localMusicImportFacade.importSelectedFiles).toHaveBeenCalledOnce()
    expect(repository.listTracks).toHaveBeenCalledOnce()
    expect(store.tracks).toEqual([{
      id: 'track-4',
      title: 'Afterglow',
      artist: 'Lumen',
      album: '—',
      duration: '3:32',
      source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
    }])
  })

  it('does not depend on Tauri infrastructure adapters', async () => {
    const source = await readFile(fileURLToPath(new URL('./library.ts', import.meta.url)), 'utf8')

    expect(source).not.toContain('infrastructure/tauri')
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
})
