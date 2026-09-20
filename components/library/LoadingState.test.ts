// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import LoadingState from './LoadingState.vue'

describe('LibraryLoadingState', () => {
  it('shows a clear initial library loading status', () => {
    const wrapper = mount(LoadingState)

    expect(wrapper.get('[role="status"]').text()).toContain('Loading your library')
  })
})
