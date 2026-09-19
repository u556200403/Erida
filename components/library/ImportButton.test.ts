// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ImportButton from './ImportButton.vue'

function defaultProps() {
  return {
    onImport: vi.fn(),
    onImportFolder: vi.fn(),
    isImporting: false,
    importError: null,
  }
}

describe('LibraryImportButton', () => {
  it('keeps the import menu closed initially', () => {
    const wrapper = mount(ImportButton, { props: defaultProps() })

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('opens the import menu from the primary button', async () => {
    const wrapper = mount(ImportButton, {
      attachTo: document.body,
      props: defaultProps(),
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
      props: defaultProps(),
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
    const onImport = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(ImportButton, {
      props: { ...defaultProps(), onImport },
    })

    await wrapper.get('button').trigger('click')
    await wrapper.get('[role="menuitem"]').trigger('click')

    expect(onImport).toHaveBeenCalledOnce()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await wrapper.setProps({ isImporting: true })

    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[role="status"]').text()).toBe('Importing selected music…')

    await wrapper.setProps({ isImporting: false })

    expect(wrapper.get('button').text()).toBe('Import music')
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('shows an import error supplied by the shared import state', async () => {
    const wrapper = mount(ImportButton, {
      props: { ...defaultProps(), importError: 'Unable to import music. Please try again.' },
    })

    expect(wrapper.get('[role="alert"]').text()).toBe('Unable to import music. Please try again.')

    await wrapper.setProps({ importError: null })

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('button').text()).toBe('Import music')
  })

  it('imports a folder and respects shared pending state', async () => {
    const onImport = vi.fn()
    const onImportFolder = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(ImportButton, {
      props: { ...defaultProps(), onImport, onImportFolder },
    })

    await wrapper.get('button').trigger('click')
    await wrapper.findAll('[role="menuitem"]')[1].trigger('click')
    await wrapper.setProps({ isImporting: true })
    await wrapper.get('button').trigger('click')

    expect(onImportFolder).toHaveBeenCalledOnce()
    expect(onImport).not.toHaveBeenCalled()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

  })

  it('closes the menu with Escape', async () => {
    const wrapper = mount(ImportButton, {
      attachTo: document.body,
      props: defaultProps(),
    })

    await wrapper.get('button').trigger('click')
    await wrapper.get('[role="menuitem"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(wrapper.get('button').element)

    wrapper.unmount()
  })
})
