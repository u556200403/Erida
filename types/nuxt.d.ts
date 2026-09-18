import type { LocalMusicImportFacade } from '~/core/music-library/application/local-music-import-facade'
import type { MusicLibraryRepository } from '~/core/music-library/domain/music-library-repository'

declare module '#app' {
  interface NuxtApp {
    $musicLibraryRepository: MusicLibraryRepository
    $localMusicImportFacade: LocalMusicImportFacade
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $musicLibraryRepository: MusicLibraryRepository
    $localMusicImportFacade: LocalMusicImportFacade
  }
}

export {}
