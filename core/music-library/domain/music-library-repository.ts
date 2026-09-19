import type { Track } from './track'

export interface MusicLibraryRepository {
  listTracks(): Promise<Track[]>
  addTrack(track: Track): Promise<void>
  removeTrack(id: string): Promise<void>
}
