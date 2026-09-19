// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'

function mountPage({
  tracks = [],
  error = null,
  removeError = null,
  removeTrack = vi.fn().mockResolvedValue(true),
}: {
  tracks?: unknown[]
  error?: string | null
  removeError?: string | null
  removeTrack?: ReturnType<typeof vi.fn>
}) {
  const loadTracks = vi.fn().mockResolvedValue(undefined)
  const navigateTo = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('useRoute', () => ({ params: { id: 'missing-track' } }))
  vi.stubGlobal('useLibraryStore', () => ({
    tracks, error, removeError, isRemoving: false, loadTracks, removeTrack,
  }))
  vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => handler())
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useHead', vi.fn())
  vi.stubGlobal('navigateTo', navigateTo)

  return import('./[id].vue').then(({ default: TrackPage }) => ({
    wrapper: mount({
    components: { TrackPage },
    template: '<Suspense><TrackPage /></Suspense>',
    }),
    navigateTo,
    removeTrack,
  }))
}

describe('track details page', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('shows a not-found state when the loaded library has no matching track', async () => {
    const { wrapper } = await mountPage({})
    await flushPromises()

    expect(wrapper.text()).toContain('Track not found')
    expect(wrapper.text()).not.toContain('Unable to load track')
  })

  it('shows a loading error instead of a not-found state when the library fails to load', async () => {
    const { wrapper } = await mountPage({ error: 'Unable to load library tracks.' })
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load track')
    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to load your library')
    expect(wrapper.text()).not.toContain('Track not found')
  })

  it('navigates to the library after a successful removal', async () => {
    const { wrapper, removeTrack, navigateTo } = await mountPage({
      tracks: [{ id: 'missing-track', title: 'Afterglow' }],
    })
    await flushPromises()

    await wrapper.get('librarytrackdetails').trigger('remove')
    await flushPromises()

    expect(removeTrack).toHaveBeenCalledWith('missing-track')
    expect(navigateTo).toHaveBeenCalledWith('/')
  })

  it('stays on the details page and shows a safe error when removal fails', async () => {
    const error = new Error('SQLite is busy')
    const removeTrack = vi.fn().mockRejectedValue(error)
    const { wrapper, navigateTo } = await mountPage({
      tracks: [{ id: 'missing-track', title: 'Afterglow' }],
      removeError: 'Unable to remove track. Please try again.',
      removeTrack,
    })
    await flushPromises()

    await wrapper.get('librarytrackdetails').trigger('remove')
    await flushPromises()

    expect(navigateTo).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to remove track. Please try again.')
  })
})
