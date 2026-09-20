import type { MusicLibraryRepository } from '../domain/music-library-repository'
import type { Track } from '../domain/track'
import type { LocalTrackAvailabilityChecker } from './local-track-availability-checker'

export type TrackAvailability = 'available' | 'unavailable' | 'not-applicable'

export interface LibraryTrack extends Track {
  availability: TrackAvailability
}

export class LoadLibraryTracks {
  constructor(
    private readonly musicLibraryRepository: MusicLibraryRepository,
    private readonly localTrackAvailabilityChecker: LocalTrackAvailabilityChecker,
  ) {}

  async execute(): Promise<LibraryTrack[]> {
    const tracks = await this.musicLibraryRepository.listTracks()

    return Promise.all(tracks.map((track) => this.withAvailability(track)))
  }

  private async withAvailability(track: Track): Promise<LibraryTrack> {
    if (track.source.kind !== 'local') {
      return { ...track, availability: 'not-applicable' }
    }

    try {
      return {
        ...track,
        availability: await this.localTrackAvailabilityChecker.isAvailable(track.source.locator)
          ? 'available'
          : 'unavailable',
      }
    } catch {
      return { ...track, availability: 'unavailable' }
    }
  }
}
