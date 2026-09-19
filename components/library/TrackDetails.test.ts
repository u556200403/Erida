// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TrackDetails from './TrackDetails.vue'

describe('LibraryTrackDetails', () => {
  it('shows the track metadata and local file path', () => {
    const wrapper = mount(TrackDetails, {
      props: {
        track: {
          id: 'track-4',
          title: 'Afterglow',
          artist: 'Lumen',
          album: 'Aurora',
          duration: '3:32',
          artworkUrl: null,
          source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
        },
      },
    })

    expect(wrapper.text()).toContain('Afterglow')
    expect(wrapper.text()).toContain('Lumen')
    expect(wrapper.text()).toContain('Aurora')
    expect(wrapper.text()).toContain('3:32')
    expect(wrapper.text()).toContain('C:/Music/Afterglow.mp3')
  })

  it('does not show a local path for a service track', () => {
    const wrapper = mount(TrackDetails, {
      props: {
        track: {
          id: 'track-5',
          title: 'Cloudline',
          artist: 'Lumen',
          album: 'Aurora',
          duration: '4:01',
          artworkUrl: null,
          source: { kind: 'service', provider: 'example', externalId: 'remote-5' },
        },
      },
    })

    expect(wrapper.text()).not.toContain('Local path')
  })

  it('emits remove when the removal button is clicked', async () => {
    const wrapper = mount(TrackDetails, {
      props: {
        track: {
          id: 'track-4', title: 'Afterglow', artist: 'Lumen', album: 'Aurora', duration: '3:32', artworkUrl: null,
          source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
        },
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([[]])
  })

  it('shows cached artwork when a resolved URL is available', () => {
    const wrapper = mount(TrackDetails, {
      props: {
        track: {
          id: 'track-4', title: 'Afterglow', artist: 'Lumen', album: 'Aurora', duration: '3:32',
          artworkUrl: 'asset://localhost/artwork.jpg',
          source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
        },
      },
    })

    expect(wrapper.get('img').attributes('src')).toBe('asset://localhost/artwork.jpg')
    expect(wrapper.find('[data-testid="artwork-placeholder"]').exists()).toBe(false)
  })

  it('shows the placeholder for a null URL and after an image load error', async () => {
    const nullArtwork = mount(TrackDetails, {
      props: {
        track: {
          id: 'track-5', title: 'Cloudline', artist: 'Lumen', album: 'Aurora', duration: '4:01', artworkUrl: null,
          source: { kind: 'service', provider: 'example', externalId: 'remote-5' },
        },
      },
    })
    const failedArtwork = mount(TrackDetails, {
      props: {
        track: {
          id: 'track-6', title: 'Signal', artist: 'Lumen', album: 'Aurora', duration: '3:01',
          artworkUrl: 'asset://localhost/missing.jpg',
          source: { kind: 'local', locator: 'C:/Music/Signal.mp3' },
        },
      },
    })

    expect(nullArtwork.get('[data-testid="artwork-placeholder"]').text()).toContain('Artwork unavailable')
    await failedArtwork.get('img').trigger('error')

    expect(failedArtwork.find('img').exists()).toBe(false)
    expect(failedArtwork.get('[data-testid="artwork-placeholder"]').exists()).toBe(true)
  })

  it('retries artwork when the track changes while retaining the same URL', async () => {
    const artworkUrl = 'asset://localhost/artwork.jpg'
    const wrapper = mount(TrackDetails, {
      props: {
        track: {
          id: 'track-6', title: 'Signal', artist: 'Lumen', album: 'Aurora', duration: '3:01', artworkUrl,
          source: { kind: 'local', locator: 'C:/Music/Signal.mp3' },
        },
      },
    })

    await wrapper.get('img').trigger('error')
    await wrapper.setProps({
      track: {
        id: 'track-7', title: 'Beacon', artist: 'Lumen', album: 'Aurora', duration: '3:11', artworkUrl,
        source: { kind: 'local', locator: 'C:/Music/Beacon.mp3' },
      },
    })

    expect(wrapper.get('img').attributes('src')).toBe(artworkUrl)
    expect(wrapper.find('[data-testid="artwork-placeholder"]').exists()).toBe(false)
  })
})
