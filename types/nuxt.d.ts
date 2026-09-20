import type { LocalMusicImportFacade } from '~/core/music-library/application/local-music-import-facade'
import type { ArtworkUrlResolver } from '~/core/music-library/application/artwork-url-resolver'
import type { MusicLibraryRepository } from '~/core/music-library/domain/music-library-repository'
import type { LoadLibraryTracks } from '~/core/music-library/application/load-library-tracks'

declare module '#app' {
  interface NuxtApp {
    $musicLibraryRepository: MusicLibraryRepository
    $loadLibraryTracks: LoadLibraryTracks
    $localMusicImportFacade: LocalMusicImportFacade
    $artworkUrlResolver: ArtworkUrlResolver
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $musicLibraryRepository: MusicLibraryRepository
    $loadLibraryTracks: LoadLibraryTracks
    $localMusicImportFacade: LocalMusicImportFacade
    $artworkUrlResolver: ArtworkUrlResolver
  }
}

export {}
