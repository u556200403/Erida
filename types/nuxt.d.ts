import type { MusicLibraryRepository } from '~/core/music-library/domain/music-library-repository'

declare module '#app' {
  interface NuxtApp {
    $musicLibraryRepository: MusicLibraryRepository
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $musicLibraryRepository: MusicLibraryRepository
  }
}

export {}
