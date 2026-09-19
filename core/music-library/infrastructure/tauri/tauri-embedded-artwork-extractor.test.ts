import { describe, expect, it, vi } from 'vitest'
import { TauriEmbeddedArtworkExtractor } from './tauri-embedded-artwork-extractor'

const file = {
  locator: 'C:\\Music\\Artist - Track.mp3',
  filename: 'Artist - Track.mp3',
}

describe('TauriEmbeddedArtworkExtractor', () => {
  it('constructs with the default Tauri invoke function', () => {
    expect(() => new TauriEmbeddedArtworkExtractor()).not.toThrow()
  })

  it('invokes extract_embedded_artwork with the unchanged locator and track ID', async () => {
    const invoke = vi.fn().mockResolvedValue('embedded/track-1.jpg')
    const extractor = new TauriEmbeddedArtworkExtractor(invoke)

    await expect(extractor.extract(file, 'track-1')).resolves.toBe('embedded/track-1.jpg')
    expect(invoke).toHaveBeenCalledWith('extract_embedded_artwork', {
      locator: file.locator,
      trackId: 'track-1',
    })
  })

  it('preserves missing artwork and native failures', async () => {
    const missing = new TauriEmbeddedArtworkExtractor(vi.fn().mockResolvedValue(null))
    const error = new Error('Native artwork extraction failed')
    const failing = new TauriEmbeddedArtworkExtractor(vi.fn().mockRejectedValue(error))

    await expect(missing.extract(file, 'track-1')).resolves.toBeNull()
    await expect(failing.extract(file, 'track-1')).rejects.toBe(error)
  })
})
