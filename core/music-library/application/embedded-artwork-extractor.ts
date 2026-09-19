import type { ArtworkRef, TrackId } from '../domain/track'
import type { LocalMusicFile } from './local-music-file'

export interface EmbeddedArtworkExtractor {
  extract(file: LocalMusicFile, trackId: TrackId): Promise<ArtworkRef | null>
}
