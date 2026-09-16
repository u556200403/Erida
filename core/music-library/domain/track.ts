export type TrackId = string

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
  source: TrackSource
}
