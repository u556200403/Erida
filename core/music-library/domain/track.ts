export type TrackId = string
export type ArtworkRef = string

export type TrackSource =
  | {
      kind: 'local'
      locator: string
    }
  | {
      kind: 'service'
      provider: string
      externalId: string
    }

export interface Track {
  id: TrackId
  title: string
  artist: string
  album: string | null
  durationSeconds: number | null
  artworkRef: ArtworkRef | null
  source: TrackSource
}
