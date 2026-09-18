import type { Track } from '../domain/track'
import type { LocalMusicFile } from './local-music-file'
import type { LocalMusicFilePicker } from './local-music-file-picker'

export interface LocalTracksImporter {
  execute(files: readonly LocalMusicFile[]): Promise<Track[]>
}

export class LocalMusicImportFacade {
  constructor(
    private readonly filePicker: LocalMusicFilePicker,
    private readonly importLocalTracks: LocalTracksImporter,
  ) {}

  async importSelectedFiles(): Promise<Track[]> {
    const files = await this.filePicker.pickFiles()

    if (files.length === 0) {
      return []
    }

    return this.importLocalTracks.execute(files)
  }
}
