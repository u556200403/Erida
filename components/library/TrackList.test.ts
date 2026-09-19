// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TrackList from './TrackList.vue'

describe('LibraryTrackList', () => {
  it('links each track title to its named details route', () => {
    const wrapper = mount(TrackList, {
      props: {
        tracks: [{
          id: 'track-4',
          title: 'Afterglow',
          artist: 'Lumen',
          album: 'Aurora',
          duration: '3:32',
          source: { kind: 'local', locator: 'C:/Music/Afterglow.mp3' },
        }],
      },
      global: {
        stubs: {
          NuxtLink: {
            props: ['to'],
            template: '<a :data-route="JSON.stringify(to)"><slot /></a>',
          },
        },
      },
    })

    expect(wrapper.get('a').text()).toBe('Afterglow')
    expect(wrapper.get('a').attributes('data-route')).toBe('{"name":"tracks-id","params":{"id":"track-4"}}')
  })
})
