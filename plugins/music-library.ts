import { createMusicLibraryApplication } from '~/core/music-library/composition/music-library-composition'

export default defineNuxtPlugin(() => {
  const { musicLibraryRepository, loadLibraryTracks, localMusicImportFacade, artworkUrlResolver } = createMusicLibraryApplication()

  return {
    provide: {
      musicLibraryRepository,
      loadLibraryTracks,
      localMusicImportFacade,
      artworkUrlResolver,
    },
  }
})
