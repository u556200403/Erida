// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import LoadErrorState from './LoadErrorState.vue'

describe('LibraryLoadErrorState', () => {
  it('shows a retry action for a failed initial library load', async () => {
    const onRetry = vi.fn().mockResolvedValue(true)
    const wrapper = mount(LoadErrorState, {
      props: { isLoading: false, onRetry },
    })

    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to load your library')

    await wrapper.get('button').trigger('click')

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('disables retry while a library load is in progress', () => {
    const wrapper = mount(LoadErrorState, {
      props: { isLoading: true, onRetry: vi.fn() },
    })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
