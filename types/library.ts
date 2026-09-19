import type { TrackSource } from '~/core/music-library/domain/track'

export interface LibraryTrackRow {
  id: string
  title: string
  artist: string
  album: string
  duration: string
  artworkUrl: string | null
  source: TrackSource
}
