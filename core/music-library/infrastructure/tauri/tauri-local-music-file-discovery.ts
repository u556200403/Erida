import { invoke } from '@tauri-apps/api/core'
import type { LocalMusicFileDiscovery } from '../../application/local-music-file-discovery'
import type { LocalMusicFile } from '../../application/local-music-file'

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

export class TauriLocalMusicFileDiscovery implements LocalMusicFileDiscovery {
  constructor(private readonly invokeFn: Invoke = invoke) {}

  async discover(paths: readonly string[]): Promise<readonly LocalMusicFile[]> {
    if (paths.length === 0) {
      return []
    }

    return this.invokeFn<LocalMusicFile[]>('discover_audio_files', { paths })
  }
}
