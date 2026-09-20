import { invoke } from '@tauri-apps/api/core'
import type { LocalArtworkExtractor } from '../../application/local-artwork-extractor'
import type { LocalMusicFile } from '../../application/local-music-file'
import type { ArtworkRef, TrackId } from '../../domain/track'

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

export class TauriLocalArtworkExtractor implements LocalArtworkExtractor {
  constructor(private readonly invokeFn: Invoke = invoke) {}

  extract(file: LocalMusicFile, trackId: TrackId): Promise<ArtworkRef | null> {
    return this.invokeFn<ArtworkRef | null>('extract_local_artwork', {
      locator: file.locator,
      trackId,
    })
  }
}
