import { describe, expect, it, vi } from 'vitest'
import {
  isValidEmbeddedArtworkRef,
  isValidArtworkRef,
  TauriArtworkUrlResolver,
} from './tauri-artwork-url-resolver'

describe('isValidEmbeddedArtworkRef', () => {
  it.each(['jpg', 'jpeg', 'png', 'gif', 'bmp'])('accepts supported .%s refs', (extension) => {
    expect(isValidEmbeddedArtworkRef(`embedded/track_1-A.${extension}`)).toBe(true)
  })

  it.each([
    'embedded/.jpg',
    'embedded/track id.jpg',
    'embedded/track!.jpg',
    'embedded/трек.jpg',
    'embedded/track.id.jpg',
    'embedded/../track.jpg',
    'embedded/%2e%2e%2fsecret.jpg',
    'embedded\\track.jpg',
    '/embedded/track.jpg',
    'C:/embedded/track.jpg',
    'file:///embedded/track.jpg',
    'https://example.test/track.jpg',
    'embedded/album/track.jpg',
    'embedded/track.jpg?size=1',
    'embedded/track.jpg#cover',
    'embedded/track.webp',
    'embedded/track.JPG',
  ])('rejects unsafe ref %s', (artworkRef) => {
    expect(isValidEmbeddedArtworkRef(artworkRef)).toBe(false)
  })
})

describe('isValidArtworkRef', () => {
  it.each(['local/track_1-A.jpg', 'local/track_1-A.png'])('accepts a strict local artwork ref %s', (artworkRef) => {
    expect(isValidArtworkRef(artworkRef)).toBe(true)
  })

  it.each([
    'local/track.jpeg',
    'local/track.gif',
    'local/track.JPG',
    'local/../track.jpg',
    'local/album/track.jpg',
    'local/track.jpg?size=1',
  ])('rejects an unsafe local artwork ref %s', (artworkRef) => {
    expect(isValidArtworkRef(artworkRef)).toBe(false)
  })
})

describe('TauriArtworkUrlResolver', () => {
  it('returns null for null and invalid refs without touching Tauri APIs', async () => {
    const isTauri = vi.fn(() => true)
    const appDataDir = vi.fn()
    const resolver = new TauriArtworkUrlResolver(isTauri, appDataDir, vi.fn(), vi.fn())

    await expect(resolver.resolve(null)).resolves.toBeNull()
    await expect(resolver.resolve('embedded/../track.jpg')).resolves.toBeNull()

    expect(isTauri).not.toHaveBeenCalled()
    expect(appDataDir).not.toHaveBeenCalled()
  })

  it('returns null outside Tauri', async () => {
    const appDataDir = vi.fn()
    const resolver = new TauriArtworkUrlResolver(() => false, appDataDir, vi.fn(), vi.fn())

    await expect(resolver.resolve('embedded/track-1.jpg')).resolves.toBeNull()
    expect(appDataDir).not.toHaveBeenCalled()
  })

  it('resolves a validated ref from app data through the asset protocol', async () => {
    const appDataDir = vi.fn().mockResolvedValue('C:/AppData/com.erida.desktop')
    const join = vi.fn().mockResolvedValue('C:/AppData/com.erida.desktop/artwork/embedded/track-1.png')
    const convertFileSrc = vi.fn().mockReturnValue('http://asset.localhost/C%3A%2FAppData%2Ftrack-1.png')
    const resolver = new TauriArtworkUrlResolver(() => true, appDataDir, join, convertFileSrc)

    await expect(resolver.resolve('embedded/track-1.png')).resolves.toBe(
      'http://asset.localhost/C%3A%2FAppData%2Ftrack-1.png',
    )
    expect(join).toHaveBeenCalledWith(
      'C:/AppData/com.erida.desktop',
      'artwork',
      'embedded',
      'track-1.png',
    )
    expect(convertFileSrc).toHaveBeenCalledWith('C:/AppData/com.erida.desktop/artwork/embedded/track-1.png')
  })

  it('resolves a validated local ref from its separate cache directory', async () => {
    const appDataDir = vi.fn().mockResolvedValue('C:/AppData/com.erida.desktop')
    const join = vi.fn().mockResolvedValue('C:/AppData/com.erida.desktop/artwork/local/track-1.png')
    const convertFileSrc = vi.fn().mockReturnValue('http://asset.localhost/local-track-1.png')
    const resolver = new TauriArtworkUrlResolver(() => true, appDataDir, join, convertFileSrc)

    await expect(resolver.resolve('local/track-1.png')).resolves.toBe('http://asset.localhost/local-track-1.png')
    expect(join).toHaveBeenCalledWith(
      'C:/AppData/com.erida.desktop', 'artwork', 'local', 'track-1.png',
    )
  })

  it('returns null when Tauri path resolution fails', async () => {
    const resolver = new TauriArtworkUrlResolver(
      () => true,
      vi.fn().mockRejectedValue(new Error('path unavailable')),
      vi.fn(),
      vi.fn(),
    )

    await expect(resolver.resolve('embedded/track-1.jpg')).resolves.toBeNull()
  })
})
