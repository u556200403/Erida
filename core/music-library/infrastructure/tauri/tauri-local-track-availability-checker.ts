import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import type { LocalTrackAvailabilityChecker } from '../../application/local-track-availability-checker'

type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

export class TauriLocalTrackAvailabilityChecker implements LocalTrackAvailabilityChecker {
  constructor(private readonly invokeFn: Invoke = tauriInvoke) {}

  isAvailable(locator: string): Promise<boolean> {
    return this.invokeFn<boolean>('check_local_track_availability', { locator })
  }
}
