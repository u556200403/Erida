// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function mountPage({
  tracks = [],
  isLoading = false,
  hasLoaded = true,
  error = null,
}: {
  tracks?: unknown[]
  isLoading?: boolean
  hasLoaded?: boolean
  error?: string | null
}) {
  const loadTracks = vi.fn().mockResolvedValue(true)
  vi.stubGlobal('useLibraryStore', () => ({
    tracks,
    isLoading,
    hasLoaded,
    error,
    trackCount: tracks.length,
    isImporting: false,
    importError: null,
    importSelectedFiles: vi.fn(),
    importSelectedFolder: vi.fn(),
    importDroppedPaths: vi.fn(),
    loadTracks,
  }))
  vi.stubGlobal('useAsyncData', vi.fn())
  vi.stubGlobal('useHead', vi.fn())

  return import('./index.vue').then(({ default: LibraryPage }) => mount({
    components: { LibraryPage },
    template: '<Suspense><LibraryPage /></Suspense>',
  }, {
      global: {
        stubs: {
          LibraryDropArea: { template: '<div><slot /></div>' },
          LibraryImportButton: true,
          LibraryLoadingState: { template: '<p data-testid="loading">Loading</p>' },
          LibraryLoadErrorState: { template: '<p data-testid="load-error">Load error</p>' },
          LibraryEmptyState: { template: '<p data-testid="empty">Empty</p>' },
          LibraryTrackList: { template: '<p data-testid="tracks">Tracks</p>' },
        },
      },
  }))
}

describe('library page states', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('shows loading before the first library result', async () => {
    const wrapper = await mountPage({ isLoading: true, hasLoaded: false })
    await flushPromises()

    expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty"]').exists()).toBe(false)
  })

  it('shows a loading error instead of an empty library before the first successful load', async () => {
    const wrapper = await mountPage({ hasLoaded: false, error: 'Unable to load library tracks.' })
    await flushPromises()

    expect(wrapper.find('[data-testid="load-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="empty"]').exists()).toBe(false)
  })

  it('keeps existing tracks visible when a later library refresh fails', async () => {
    const wrapper = await mountPage({
      tracks: [{ id: 'track-4' }],
      error: 'Unable to load library tracks.',
    })
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to load your library')
    expect(wrapper.find('[data-testid="tracks"]').exists()).toBe(true)
  })
})
