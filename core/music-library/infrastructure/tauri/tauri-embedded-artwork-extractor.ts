import { invoke } from '@tauri-apps/api/core'
import type { EmbeddedArtworkExtractor } from '../../application/embedded-artwork-extractor'
import type { ArtworkRef, TrackId } from '../../domain/track'
import type { LocalMusicFile } from '../../application/local-music-file'

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

export class TauriEmbeddedArtworkExtractor implements EmbeddedArtworkExtractor {
  constructor(private readonly invokeFn: Invoke = invoke) {}

  extract(file: LocalMusicFile, trackId: TrackId): Promise<ArtworkRef | null> {
    return this.invokeFn<ArtworkRef | null>('extract_embedded_artwork', {
      locator: file.locator,
      trackId,
    })
  }
}
