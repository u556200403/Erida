import type { MusicLibraryRepository } from '../domain/music-library-repository'
import type { Track } from '../domain/track'

const demoTracks: readonly Track[] = [
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

function cloneTrack(track: Track): Track {
  return {
    ...track,
    source: { ...track.source },
  }
}

export class InMemoryMusicLibraryRepository implements MusicLibraryRepository {
  private readonly tracks = demoTracks.map(cloneTrack)

  async listTracks(): Promise<Track[]> {
    return this.tracks.map(cloneTrack)
  }

  async addTrack(track: Track): Promise<void> {
    this.tracks.push(cloneTrack(track))
  }
}
