import { describe, expect, it, vi } from 'vitest'
import { TauriLocalMusicFilePicker } from './tauri-local-music-file-picker'

describe('TauriLocalMusicFilePicker', () => {
  it('opens a multiple-file audio dialog with the supported extensions', async () => {
    const openDialog = vi.fn().mockResolvedValue([])
    const picker = new TauriLocalMusicFilePicker(openDialog)

    await picker.pickFiles()

    expect(openDialog).toHaveBeenCalledWith({
      multiple: true,
      directory: false,
      filters: [
        {
          name: 'Audio files',
          extensions: ['mp3', 'flac', 'm4a', 'wav'],
        },
      ],
    })
  })

  it('returns no files when the dialog is cancelled', async () => {
    const picker = new TauriLocalMusicFilePicker(vi.fn().mockResolvedValue(null))

    await expect(picker.pickFiles()).resolves.toEqual([])
  })

  it('preserves selected paths as locators and their selection order', async () => {
    const picker = new TauriLocalMusicFilePicker(
      vi.fn().mockResolvedValue(['C:\\Music\\First Track.mp3', '/music/Second Track.flac']),
    )

    await expect(picker.pickFiles()).resolves.toEqual([
      { locator: 'C:\\Music\\First Track.mp3', filename: 'First Track.mp3' },
      { locator: '/music/Second Track.flac', filename: 'Second Track.flac' },
    ])
  })

  it('propagates native dialog errors', async () => {
    const error = new Error('Native dialog failed')
    const picker = new TauriLocalMusicFilePicker(vi.fn().mockRejectedValue(error))

    await expect(picker.pickFiles()).rejects.toBe(error)
  })

  it('returns no files when folder selection is cancelled', async () => {
    const discover = vi.fn()
    const picker = new TauriLocalMusicFilePicker(
      vi.fn(),
      vi.fn().mockResolvedValue(null),
      discover,
    )

    await expect(picker.pickFolder()).resolves.toEqual([])

    expect(discover).not.toHaveBeenCalled()
  })

  it('uses the folder dialog and returns native discovery results unchanged', async () => {
    const files = [
      { locator: 'C:\\Music\\nested\\First.MP3', filename: 'First.MP3' },
    ]
    const openFolderDialog = vi.fn().mockResolvedValue('C:\\Music')
    const discover = vi.fn().mockResolvedValue(files)
    const picker = new TauriLocalMusicFilePicker(vi.fn(), openFolderDialog, discover)

    await expect(picker.pickFolder()).resolves.toBe(files)

    expect(openFolderDialog).toHaveBeenCalledWith({ multiple: false, directory: true })
    expect(discover).toHaveBeenCalledWith('discover_audio_files', { directory: 'C:\\Music' })
  })

  it('propagates native folder traversal errors', async () => {
    const error = new Error('Directory cannot be read')
    const picker = new TauriLocalMusicFilePicker(
      vi.fn(),
      vi.fn().mockResolvedValue('C:\\Music'),
      vi.fn().mockRejectedValue(error),
    )

    await expect(picker.pickFolder()).rejects.toBe(error)
  })
})
