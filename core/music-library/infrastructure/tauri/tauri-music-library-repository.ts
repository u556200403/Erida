import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import type { MusicLibraryRepository } from '../../domain/music-library-repository'
import type { Track, TrackSource } from '../../domain/track'

interface LibraryTrackDto {
  id: string
  title: string
  artist: string
  album: string | null
  durationSeconds: number | null
  source: TrackSource
}

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

function toTrack(dto: LibraryTrackDto): Track {
  return {
    ...dto,
    source: { ...dto.source },
  }
}

function toLibraryTrackDto(track: Track): LibraryTrackDto {
  return {
    ...track,
    source: { ...track.source },
  }
}

export class TauriMusicLibraryRepository implements MusicLibraryRepository {
  constructor(private readonly invokeFn: Invoke = tauriInvoke) {}

  async listTracks(): Promise<Track[]> {
    const tracks = await this.invokeFn<LibraryTrackDto[]>('list_library_tracks')

    return tracks.map(toTrack)
  }

  async addTrack(track: Track): Promise<void> {
    await this.invokeFn<void>('add_library_track', { track: toLibraryTrackDto(track) })
  }

  async removeTrack(id: string): Promise<void> {
    await this.invokeFn<void>('remove_library_track', { id })
  }
}
