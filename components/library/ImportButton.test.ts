// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ImportButton from './ImportButton.vue'

function createDeferredPromise() {
  let resolve!: () => void
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

describe('LibraryImportButton', () => {
  it('calls the supplied import action once and represents the pending state', async () => {
    const deferred = createDeferredPromise()
    const onImport = vi.fn(() => deferred.promise)
    const wrapper = mount(ImportButton, { props: { onImport, onImportFolder: vi.fn() } })

    await wrapper.get('button').trigger('click')
    await wrapper.get('button').trigger('click')

    expect(onImport).toHaveBeenCalledOnce()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[role="status"]').text()).toBe('Importing selected music…')

    deferred.resolve()
    await flushPromises()

    expect(wrapper.get('button').text()).toBe('Import music')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('shows an import error and lets the user retry', async () => {
    const onImport = vi.fn()
      .mockRejectedValueOnce(new Error('Import failed'))
      .mockResolvedValueOnce(undefined)
    const wrapper = mount(ImportButton, { props: { onImport, onImportFolder: vi.fn() } })

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Unable to import music. Please try again.')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(onImport).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('button').text()).toBe('Import music')
  })

  it('imports a folder and prevents selecting files while it is pending', async () => {
    const deferred = createDeferredPromise()
    const onImport = vi.fn()
    const onImportFolder = vi.fn(() => deferred.promise)
    const wrapper = mount(ImportButton, { props: { onImport, onImportFolder } })

    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    await buttons[0].trigger('click')

    expect(onImportFolder).toHaveBeenCalledOnce()
    expect(onImport).not.toHaveBeenCalled()
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()

    deferred.resolve()
    await flushPromises()
  })
})
