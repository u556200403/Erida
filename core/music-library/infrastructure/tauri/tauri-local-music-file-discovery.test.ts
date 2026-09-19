import { describe, expect, it, vi } from 'vitest'
import { TauriLocalMusicFileDiscovery } from './tauri-local-music-file-discovery'

describe('TauriLocalMusicFileDiscovery', () => {
  it('passes one or more native paths to shared Rust discovery unchanged', async () => {
    const files = [{ locator: 'C:\\Music\\First.mp3', filename: 'First.mp3' }]
    const invoke = vi.fn().mockResolvedValue(files)
    const discovery = new TauriLocalMusicFileDiscovery(invoke)
    const paths = ['C:\\Music\\First.mp3', 'C:\\Music\\Album']

    await expect(discovery.discover(paths)).resolves.toBe(files)

    expect(invoke).toHaveBeenCalledWith('discover_audio_files', { paths })
  })

  it('does not invoke Tauri for an empty drop', async () => {
    const invoke = vi.fn()
    const discovery = new TauriLocalMusicFileDiscovery(invoke)

    await expect(discovery.discover([])).resolves.toEqual([])

    expect(invoke).not.toHaveBeenCalled()
  })

  it('propagates native discovery errors', async () => {
    const error = new Error('Path cannot be read')
    const discovery = new TauriLocalMusicFileDiscovery(vi.fn().mockRejectedValue(error))

    await expect(discovery.discover(['C:\\Music'])).rejects.toBe(error)
  })
})
