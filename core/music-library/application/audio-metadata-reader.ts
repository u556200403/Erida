import type { LocalMusicFile } from './local-music-file'

export interface AudioMetadata {
  title: string | null
  artist: string | null
  album: string | null
  durationSeconds: number | null
}

export interface AudioMetadataReader {
  read(file: LocalMusicFile): Promise<AudioMetadata>
}
