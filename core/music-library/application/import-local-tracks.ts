import type { MusicLibraryRepository } from '../domain/music-library-repository'
import type { Track, TrackId } from '../domain/track'
import type { AudioMetadata, AudioMetadataReader } from './audio-metadata-reader'
import type { EmbeddedArtworkExtractor } from './embedded-artwork-extractor'
import type { LocalMusicFile } from './local-music-file'

export type TrackIdGenerator = () => TrackId

const UNKNOWN_ARTIST = 'Unknown Artist'
const EMPTY_AUDIO_METADATA: AudioMetadata = {
  title: null,
  artist: null,
  album: null,
  durationSeconds: null,
}

export function titleFromFilename(filename: string): string {
  const extensionIndex = filename.lastIndexOf('.')

  return extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename
}

export class ImportLocalTracks {
  constructor(
    private readonly repository: MusicLibraryRepository,
    private readonly metadataReader: AudioMetadataReader,
    private readonly artworkExtractor: EmbeddedArtworkExtractor,
    private readonly generateTrackId: TrackIdGenerator,
  ) {}

  async execute(files: readonly LocalMusicFile[]): Promise<Track[]> {
    const tracks: Track[] = []

    for (const file of files) {
      const track = await this.toTrack(file)
      await this.repository.addTrack(track)
      tracks.push(track)
    }

    return tracks
  }

  private async toTrack(file: LocalMusicFile): Promise<Track> {
    const id = this.generateTrackId()
    const [metadata, artworkRef] = await Promise.all([
      this.readMetadata(file),
      this.extractArtwork(file, id),
    ])

    return {
      id,
      title: metadata.title ?? titleFromFilename(file.filename),
      artist: metadata.artist ?? UNKNOWN_ARTIST,
      album: metadata.album,
      durationSeconds: metadata.durationSeconds,
      artworkRef,
      source: {
        kind: 'local',
        locator: file.locator,
      },
    }
  }

  private async extractArtwork(file: LocalMusicFile, trackId: TrackId): Promise<Track['artworkRef']> {
    try {
      return await this.artworkExtractor.extract(file, trackId)
    } catch {
      return null
    }
  }

  private async readMetadata(file: LocalMusicFile): Promise<AudioMetadata> {
    try {
      return await this.metadataReader.read(file)
    } catch {
      return EMPTY_AUDIO_METADATA
    }
  }
}
