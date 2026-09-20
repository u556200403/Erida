import { describe, expect, it, vi } from 'vitest'
import { TauriLocalArtworkExtractor } from './tauri-local-artwork-extractor'

const file = { locator: 'C:\\Music\\Album\\Track.mp3', filename: 'Track.mp3' }

describe('TauriLocalArtworkExtractor', () => {
  it('invokes extract_local_artwork with the unchanged locator and track ID', async () => {
    const invoke = vi.fn().mockResolvedValue('local/track-1.png')
    const extractor = new TauriLocalArtworkExtractor(invoke)

    await expect(extractor.extract(file, 'track-1')).resolves.toBe('local/track-1.png')
    expect(invoke).toHaveBeenCalledWith('extract_local_artwork', {
      locator: file.locator,
      trackId: 'track-1',
    })
  })
})
