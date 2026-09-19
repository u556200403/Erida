// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'

function mountPage({ tracks = [], error = null }: { tracks?: unknown[], error?: string | null }) {
  const loadTracks = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('useRoute', () => ({ params: { id: 'missing-track' } }))
  vi.stubGlobal('useLibraryStore', () => ({ tracks, error, loadTracks }))
  vi.stubGlobal('useAsyncData', async (_key: string, handler: () => Promise<unknown>) => handler())
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('useHead', vi.fn())

  return import('./[id].vue').then(({ default: TrackPage }) => mount({
    components: { TrackPage },
    template: '<Suspense><TrackPage /></Suspense>',
    global: {
      stubs: {
        LibraryTrackDetails: true,
      },
    },
  }))
}

describe('track details page', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('shows a not-found state when the loaded library has no matching track', async () => {
    const wrapper = await mountPage({})
    await flushPromises()

    expect(wrapper.text()).toContain('Track not found')
    expect(wrapper.text()).not.toContain('Unable to load track')
  })

  it('shows a loading error instead of a not-found state when the library fails to load', async () => {
    const wrapper = await mountPage({ error: 'Unable to load library tracks.' })
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load track')
    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to load your library')
    expect(wrapper.text()).not.toContain('Track not found')
  })
})
