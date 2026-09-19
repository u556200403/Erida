import type { Track } from '~/core/music-library/domain/track'
import type { LibraryTrackRow } from '~/types/library'
import type { Playlist } from '~/types/music'

function toLibraryTrackRow(track: Track): LibraryTrackRow {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album ?? '—',
    duration: track.durationSeconds === null
      ? '—'
      : `${Math.floor(track.durationSeconds / 60)}:${String(track.durationSeconds % 60).padStart(2, '0')}`,
  }
}

export const useLibraryStore = defineStore('library', () => {
  const {
    $musicLibraryRepository: musicLibraryRepository,
    $localMusicImportFacade: localMusicImportFacade,
  } = useNuxtApp()
  const tracks = ref<LibraryTrackRow[]>([])
  const isLoading = ref(false)
  const isImporting = ref(false)
  const error = ref<string | null>(null)
  const importError = ref<string | null>(null)

  const playlists = ref<Playlist[]>([
    { id: '1', name: 'Late night', trackCount: 24, description: 'Music for quiet evenings.' },
    { id: '2', name: 'Focus', trackCount: 18, description: 'Instrumental tracks for work.' },
  ])

  const trackCount = computed(() => tracks.value.length)

  async function loadTracks() {
    isLoading.value = true
    error.value = null

    try {
      const libraryTracks = await musicLibraryRepository.listTracks()
      tracks.value = libraryTracks.map(toLibraryTrackRow)
    } catch {
      error.value = 'Unable to load library tracks.'
    } finally {
      isLoading.value = false
    }
  }

  async function importSelectedFiles(): Promise<void> {
    await runImport(() => localMusicImportFacade.importSelectedFiles())
  }

  async function importSelectedFolder(): Promise<void> {
    await runImport(() => localMusicImportFacade.importSelectedFolder())
  }

  async function importDroppedPaths(paths: readonly string[]): Promise<void> {
    await runImport(() => localMusicImportFacade.importDroppedPaths(paths))
  }

  async function runImport(action: () => Promise<unknown>): Promise<void> {
    if (isImporting.value) {
      return
    }

    isImporting.value = true
    importError.value = null

    try {
      await action()
      await loadTracks()
    } catch {
      importError.value = 'Unable to import music. Please try again.'
    } finally {
      isImporting.value = false
    }
  }

  return {
    tracks,
    playlists,
    trackCount,
    isLoading,
    isImporting,
    error,
    importError,
    loadTracks,
    importSelectedFiles,
    importSelectedFolder,
    importDroppedPaths,
  }
})
