import { describe, expect, it, vi } from 'vitest'
import { TauriAudioMetadataReader } from './tauri-audio-metadata-reader'

const file = {
  locator: 'C:\\Music\\Artist - Track.mp3',
  filename: 'Artist - Track.mp3',
}

describe('TauriAudioMetadataReader', () => {
  it('constructs with the default Tauri invoke function', () => {
    expect(() => new TauriAudioMetadataReader()).not.toThrow()
  })

  it('invokes the read_audio_metadata command with the unchanged locator', async () => {
    const invoke = vi.fn().mockResolvedValue({
      title: 'Track',
      artist: 'Artist',
      album: 'Album',
      durationSeconds: 123.45,
    })
    const reader = new TauriAudioMetadataReader(invoke)

    await reader.read(file)

    expect(invoke).toHaveBeenCalledWith('read_audio_metadata', { locator: file.locator })
  })

  it('maps a successful metadata DTO', async () => {
    const reader = new TauriAudioMetadataReader(
      vi.fn().mockResolvedValue({
        title: 'Track',
        artist: 'Artist',
        album: 'Album',
        durationSeconds: 123.45,
      }),
    )

    await expect(reader.read(file)).resolves.toEqual({
      title: 'Track',
      artist: 'Artist',
      album: 'Album',
      durationSeconds: 123.45,
    })
  })

  it('preserves null metadata values', async () => {
    const reader = new TauriAudioMetadataReader(
      vi.fn().mockResolvedValue({ title: null, artist: null, album: null, durationSeconds: null }),
    )

    await expect(reader.read(file)).resolves.toEqual({
      title: null,
      artist: null,
      album: null,
      durationSeconds: null,
    })
  })

  it('propagates invoke failures', async () => {
    const error = new Error('Native metadata read failed')
    const reader = new TauriAudioMetadataReader(vi.fn().mockRejectedValue(error))

    await expect(reader.read(file)).rejects.toBe(error)
  })
})
