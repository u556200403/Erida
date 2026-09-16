import type { MusicLibraryRepository } from '../domain/music-library-repository'
import type { Track } from '../domain/track'

const tracks: Track[] = [
  {
    id: '1',
    title: 'Midnight City',
    artist: 'M83',
    album: "Hurry Up, We're Dreaming",
    durationSeconds: 243,
    source: { kind: 'local', locator: 'demo:midnight-city' },
  },
  {
    id: '2',
    title: 'Teardrop',
    artist: 'Massive Attack',
    album: 'Mezzanine',
    durationSeconds: 330,
    source: { kind: 'local', locator: 'demo:teardrop' },
  },
  {
    id: '3',
    title: 'Everything In Its Right Place',
    artist: 'Radiohead',
    album: 'Kid A',
    durationSeconds: 251,
    source: { kind: 'local', locator: 'demo:everything-in-its-right-place' },
  },
]

export class InMemoryMusicLibraryRepository implements MusicLibraryRepository {
  async listTracks(): Promise<Track[]> {
    return tracks.map((track) => ({ ...track }))
  }
}
