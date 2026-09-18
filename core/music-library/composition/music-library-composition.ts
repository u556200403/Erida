import type { MusicLibraryRepository } from '../domain/music-library-repository'
import { InMemoryMusicLibraryRepository } from '../infrastructure/in-memory-music-library-repository'

export interface MusicLibraryApplication {
  musicLibraryRepository: MusicLibraryRepository
}

export function createMusicLibraryApplication(): MusicLibraryApplication {
  return {
    musicLibraryRepository: new InMemoryMusicLibraryRepository(),
  }
}
