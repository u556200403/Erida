import { describe, expect, it, vi } from 'vitest'
import { TauriLocalTrackAvailabilityChecker } from './tauri-local-track-availability-checker'

describe('TauriLocalTrackAvailabilityChecker', () => {
  it('asks Tauri to check the unchanged local locator', async () => {
    const invoke = vi.fn().mockResolvedValue(true)
    const checker = new TauriLocalTrackAvailabilityChecker(invoke)

    await expect(checker.isAvailable('C:/Music/Afterglow.mp3')).resolves.toBe(true)
    expect(invoke).toHaveBeenCalledWith('check_local_track_availability', {
      locator: 'C:/Music/Afterglow.mp3',
    })
  })
})
