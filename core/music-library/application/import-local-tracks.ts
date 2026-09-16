import type { MusicLibraryRepository } from '../domain/music-library-repository'
import type { Track, TrackId } from '../domain/track'
import type { LocalMusicFile } from './local-music-file'

export type TrackIdGenerator = () => TrackId

const UNKNOWN_ARTIST = 'Unknown Artist'

export function titleFromFilename(filename: string): string {
  const extensionIndex = filename.lastIndexOf('.')

  return extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename
}

export class ImportLocalTracks {
  constructor(
    private readonly repository: MusicLibraryRepository,
    private readonly generateTrackId: TrackIdGenerator,
  ) {}

  async execute(files: readonly LocalMusicFile[]): Promise<Track[]> {
    const tracks = files.map((file) => this.toTrack(file))

    for (const track of tracks) {
      await this.repository.addTrack(track)
    }

    return tracks
  }

  private toTrack(file: LocalMusicFile): Track {
    return {
      id: this.generateTrackId(),
      title: titleFromFilename(file.filename),
      artist: UNKNOWN_ARTIST,
      album: null,
      durationSeconds: null,
      source: {
        kind: 'local',
        locator: file.locator,
      },
    }
  }
}
