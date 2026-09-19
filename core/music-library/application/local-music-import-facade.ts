import type { Track } from '../domain/track'
import type { LocalMusicFile } from './local-music-file'
import type { LocalMusicFileDiscovery } from './local-music-file-discovery'
import type { LocalMusicFilePicker } from './local-music-file-picker'

export interface LocalTracksImporter {
  execute(files: readonly LocalMusicFile[]): Promise<Track[]>
}

export class LocalMusicImportFacade {
  constructor(
    private readonly filePicker: LocalMusicFilePicker,
    private readonly fileDiscovery: LocalMusicFileDiscovery,
    private readonly importLocalTracks: LocalTracksImporter,
  ) {}

  async importSelectedFiles(): Promise<Track[]> {
    const files = await this.filePicker.pickFiles()

    return this.importFiles(files)
  }

  async importSelectedFolder(): Promise<Track[]> {
    const files = await this.filePicker.pickFolder()

    return this.importFiles(files)
  }

  async importDroppedPaths(paths: readonly string[]): Promise<Track[]> {
    const files = await this.fileDiscovery.discover(paths)

    return this.importFiles(files)
  }

  private async importFiles(files: readonly LocalMusicFile[]): Promise<Track[]> {
    if (files.length === 0) {
      return []
    }

    return this.importLocalTracks.execute(files)
  }
}
