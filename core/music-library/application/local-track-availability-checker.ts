export interface LocalTrackAvailabilityChecker {
  isAvailable(locator: string): Promise<boolean>
}
