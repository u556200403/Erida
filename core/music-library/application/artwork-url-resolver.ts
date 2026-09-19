import type { ArtworkRef } from '../domain/track'

export interface ArtworkUrlResolver {
  resolve(artworkRef: ArtworkRef | null): Promise<string | null>
}
