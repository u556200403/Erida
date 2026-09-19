import type { LocalMusicFile } from './local-music-file'

export interface LocalMusicFilePicker {
  pickFiles(): Promise<readonly LocalMusicFile[]>
  pickFolder(): Promise<readonly LocalMusicFile[]>
}
