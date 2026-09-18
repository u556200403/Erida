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
const localMusicImportFacade: Pick<LocalMusicImportFacade, 'importSelectedFiles'> = {
  importSelectedFiles: vi.fn(),
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
    }])
  })

  it('does not depend on Tauri infrastructure adapters', async () => {
    const source = await readFile(fileURLToPath(new URL('./library.ts', import.meta.url)), 'utf8')

    expect(source).not.toContain('infrastructure/tauri')
  })
})
