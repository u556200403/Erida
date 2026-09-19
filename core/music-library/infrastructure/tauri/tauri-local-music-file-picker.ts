import { open, type OpenDialogOptions } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'
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
type OpenFolderDialog = (options: OpenDialogOptions) => Promise<string | null>
type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

const openAudioFileDialog: OpenDialog = async (options) => {
  return open({ ...options, multiple: true, directory: false })
}

const openMusicFolderDialog: OpenFolderDialog = async (options) => {
  const selected = await open({ ...options, multiple: false, directory: true })

  return typeof selected === 'string' ? selected : null
}

function filenameFromPath(path: string): string {
  return path.split(/[\\/]/).at(-1) ?? path
}

export class TauriLocalMusicFilePicker implements LocalMusicFilePicker {
  constructor(
    private readonly openDialog: OpenDialog = openAudioFileDialog,
    private readonly openFolderDialog: OpenFolderDialog = openMusicFolderDialog,
    private readonly invokeFn: Invoke = invoke,
  ) {}

  async pickFiles(): Promise<readonly LocalMusicFile[]> {
    const paths = await this.openDialog(audioFileDialogOptions)

    return (paths ?? []).map((path) => ({
      locator: path,
      filename: filenameFromPath(path),
    }))
  }

  async pickFolder(): Promise<readonly LocalMusicFile[]> {
    const path = await this.openFolderDialog({ multiple: false, directory: true })

    if (path === null) {
      return []
    }

    return this.invokeFn<LocalMusicFile[]>('discover_audio_files', { directory: path })
  }
}
