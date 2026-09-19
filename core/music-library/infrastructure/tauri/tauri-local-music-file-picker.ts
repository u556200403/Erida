import { open, type OpenDialogOptions } from '@tauri-apps/plugin-dialog'
import type { LocalMusicFileDiscovery } from '../../application/local-music-file-discovery'
import type { LocalMusicFilePicker } from '../../application/local-music-file-picker'
import type { LocalMusicFile } from '../../application/local-music-file'
import { TauriLocalMusicFileDiscovery } from './tauri-local-music-file-discovery'

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
    private readonly fileDiscovery: LocalMusicFileDiscovery = new TauriLocalMusicFileDiscovery(),
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

    return this.fileDiscovery.discover([path])
  }
}
