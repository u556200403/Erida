import { open, type OpenDialogOptions } from '@tauri-apps/plugin-dialog'
import type { LocalMusicFilePicker } from '../../application/local-music-file-picker'
import type { LocalMusicFile } from '../../application/local-music-file'

const audioFileDialogOptions: OpenDialogOptions = {
  multiple: true,
  directory: false,
  filters: [
    {
      name: 'Audio files',
      extensions: ['mp3', 'flac', 'm4a', 'wav'],
    },
  ],
}

type OpenDialog = (options: OpenDialogOptions) => Promise<string[] | null>

const openAudioFileDialog: OpenDialog = async (options) => {
  return open({ ...options, multiple: true, directory: false })
}

function filenameFromPath(path: string): string {
  return path.split(/[\\/]/).at(-1) ?? path
}

export class TauriLocalMusicFilePicker implements LocalMusicFilePicker {
  constructor(private readonly openDialog: OpenDialog = openAudioFileDialog) {}

  async pickFiles(): Promise<readonly LocalMusicFile[]> {
    const paths = await this.openDialog(audioFileDialogOptions)

    return (paths ?? []).map((path) => ({
      locator: path,
      filename: filenameFromPath(path),
    }))
  }
}
