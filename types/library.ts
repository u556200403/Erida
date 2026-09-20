import type { TrackSource } from '~/core/music-library/domain/track'
import type { TrackAvailability } from '~/core/music-library/application/load-library-tracks'

export interface LibraryTrackRow {
  id: string
  title: string
  artist: string
  album: string
  duration: string
  artworkUrl: string | null
  availability: TrackAvailability
  source: TrackSource
}
