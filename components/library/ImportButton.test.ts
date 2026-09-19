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
  it('keeps the import menu closed initially', () => {
    const wrapper = mount(ImportButton, { props: { onImport: vi.fn(), onImportFolder: vi.fn() } })

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('opens the import menu from the primary button', async () => {
    const wrapper = mount(ImportButton, {
      attachTo: document.body,
      props: { onImport: vi.fn(), onImportFolder: vi.fn() },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.get('[role="menu"]').text()).toContain('Choose files')
    expect(wrapper.get('[role="menu"]').text()).toContain('Choose folder')
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(wrapper.get('[role="menuitem"]').element)

    wrapper.unmount()
  })

  it('moves focus between menu items with arrow keys and wraps', async () => {
    const wrapper = mount(ImportButton, {
      attachTo: document.body,
      props: { onImport: vi.fn(), onImportFolder: vi.fn() },
    })

    await wrapper.get('button').trigger('click')
    const menuItems = wrapper.findAll('[role="menuitem"]')

    await menuItems[0].trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(menuItems[1].element)

    await menuItems[1].trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement).toBe(menuItems[0].element)

    await menuItems[0].trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(menuItems[1].element)

    await menuItems[1].trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement).toBe(menuItems[0].element)

    wrapper.unmount()
  })

  it('imports selected files, closes the menu, and represents the pending state', async () => {
    const deferred = createDeferredPromise()
    const onImport = vi.fn(() => deferred.promise)
    const wrapper = mount(ImportButton, { props: { onImport, onImportFolder: vi.fn() } })

    await wrapper.get('button').trigger('click')
    await wrapper.get('[role="menuitem"]').trigger('click')

    expect(onImport).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
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
    await wrapper.get('[role="menuitem"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Unable to import music. Please try again.')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()

    await wrapper.get('button').trigger('click')
    await wrapper.get('[role="menuitem"]').trigger('click')
    await flushPromises()

    expect(onImport).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('button').text()).toBe('Import music')
  })

  it('imports a folder and prevents another import while it is pending', async () => {
    const deferred = createDeferredPromise()
    const onImport = vi.fn()
    const onImportFolder = vi.fn(() => deferred.promise)
    const wrapper = mount(ImportButton, { props: { onImport, onImportFolder } })

    await wrapper.get('button').trigger('click')
    await wrapper.findAll('[role="menuitem"]')[1].trigger('click')
    await wrapper.get('button').trigger('click')

    expect(onImportFolder).toHaveBeenCalledOnce()
    expect(onImport).not.toHaveBeenCalled()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    deferred.resolve()
    await flushPromises()
  })

  it('closes the menu with Escape', async () => {
    const wrapper = mount(ImportButton, {
      attachTo: document.body,
      props: { onImport: vi.fn(), onImportFolder: vi.fn() },
    })

    await wrapper.get('button').trigger('click')
    await wrapper.get('[role="menuitem"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(wrapper.get('button').element)

    wrapper.unmount()
  })
})
