import { invoke } from '@tauri-apps/api/core'
import type { AudioMetadata, AudioMetadataReader } from '../../application/audio-metadata-reader'
import type { LocalMusicFile } from '../../application/local-music-file'

interface AudioMetadataDto {
  title: string | null
  artist: string | null
  album: string | null
  durationSeconds: number | null
}

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

export class TauriAudioMetadataReader implements AudioMetadataReader {
  constructor(private readonly invokeFn: Invoke = invoke) {}

  async read(file: LocalMusicFile): Promise<AudioMetadata> {
    return this.invokeFn<AudioMetadataDto>('read_audio_metadata', { locator: file.locator })
  }
}
