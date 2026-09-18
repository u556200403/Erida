import { createMusicLibraryApplication } from '~/core/music-library/composition/music-library-composition'

export default defineNuxtPlugin(() => {
  const { musicLibraryRepository, localMusicImportFacade } = createMusicLibraryApplication()

  return {
    provide: {
      musicLibraryRepository,
      localMusicImportFacade,
    },
  }
})
