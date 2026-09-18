import { createMusicLibraryApplication } from '~/core/music-library/composition/music-library-composition'

export default defineNuxtPlugin(() => {
  const { musicLibraryRepository } = createMusicLibraryApplication()

  return {
    provide: {
      musicLibraryRepository,
    },
  }
})
