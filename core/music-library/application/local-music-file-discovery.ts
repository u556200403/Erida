import type { LocalMusicFile } from './local-music-file'

export interface LocalMusicFileDiscovery {
  discover(paths: readonly string[]): Promise<readonly LocalMusicFile[]>
}
