import { createMusicLibraryApplication } from '~/core/music-library/composition/music-library-composition'

export default defineNuxtPlugin(() => {
  const { musicLibraryRepository, localMusicImportFacade, artworkUrlResolver } = createMusicLibraryApplication()

  return {
    provide: {
      musicLibraryRepository,
      localMusicImportFacade,
      artworkUrlResolver,
    },
  }
})
