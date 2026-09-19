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
          id: 'track-4', title: 'Afterglow', artist: 'Lumen', album: 'Aurora', duration: '3:32',
          source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
        },
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([[]])
  })
})
