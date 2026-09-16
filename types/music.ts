export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: string
}

export interface Playlist {
  id: string
  name: string
  trackCount: number
  description: string
}
