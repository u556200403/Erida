import type { Playlist, Track } from '~/types/music'

export const useLibraryStore = defineStore('library', () => {
  const tracks = ref<Track[]>([
    { id: '1', title: 'Midnight City', artist: 'M83', album: 'Hurry Up, We\'re Dreaming', duration: '4:03' },
    { id: '2', title: 'Teardrop', artist: 'Massive Attack', album: 'Mezzanine', duration: '5:30' },
    { id: '3', title: 'Everything In Its Right Place', artist: 'Radiohead', album: 'Kid A', duration: '4:11' },
  ])

  const playlists = ref<Playlist[]>([
    { id: '1', name: 'Late night', trackCount: 24, description: 'Music for quiet evenings.' },
    { id: '2', name: 'Focus', trackCount: 18, description: 'Instrumental tracks for work.' },
  ])

  const trackCount = computed(() => tracks.value.length)

  return { tracks, playlists, trackCount }
})
