import type { Track } from './track'

export interface MusicLibraryRepository {
  listTracks(): Promise<Track[]>
}
