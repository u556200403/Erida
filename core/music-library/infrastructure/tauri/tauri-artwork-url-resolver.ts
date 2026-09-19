import { convertFileSrc, isTauri as isTauriRuntime } from '@tauri-apps/api/core'
import { appDataDir, join } from '@tauri-apps/api/path'
import type { ArtworkUrlResolver } from '../../application/artwork-url-resolver'
import type { ArtworkRef } from '../../domain/track'

const EMBEDDED_ARTWORK_REF = /^embedded\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|gif|bmp)$/
const EMBEDDED_ARTWORK_PREFIX = 'embedded/'

type IsTauri = () => boolean
type AppDataDir = () => Promise<string>
type Join = (...paths: string[]) => Promise<string>
type ConvertFileSrc = (filePath: string) => string

export function isValidEmbeddedArtworkRef(artworkRef: string): boolean {
  return EMBEDDED_ARTWORK_REF.test(artworkRef)
}

export class TauriArtworkUrlResolver implements ArtworkUrlResolver {
  constructor(
    private readonly isTauriFn: IsTauri = isTauriRuntime,
    private readonly appDataDirFn: AppDataDir = appDataDir,
    private readonly joinFn: Join = join,
    private readonly convertFileSrcFn: ConvertFileSrc = convertFileSrc,
  ) {}

  async resolve(artworkRef: ArtworkRef | null): Promise<string | null> {
    if (artworkRef === null || !isValidEmbeddedArtworkRef(artworkRef)) {
      return null
    }

    try {
      if (!this.isTauriFn()) {
        return null
      }

      const filename = artworkRef.slice(EMBEDDED_ARTWORK_PREFIX.length)
      const artworkPath = await this.joinFn(
        await this.appDataDirFn(),
        'artwork',
        'embedded',
        filename,
      )

      return this.convertFileSrcFn(artworkPath)
    } catch {
      return null
    }
  }
}
