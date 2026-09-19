// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { onDragDropEvent, scaleFactor, unlisten } = vi.hoisted(() => ({
  onDragDropEvent: vi.fn(),
  scaleFactor: vi.fn(),
  unlisten: vi.fn(),
}))

vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({ onDragDropEvent }),
}))

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ scaleFactor }),
}))

import DropArea from './DropArea.vue'

type DragDropHandler = (event: {
  payload:
    | { type: 'enter', paths: string[], position: NativePosition }
    | { type: 'over', position: NativePosition }
    | { type: 'drop', paths: string[], position: NativePosition }
    | { type: 'leave' }
}) => Promise<void>

interface NativePosition {
  toLogical(scaleFactor: number): { x: number, y: number }
}

function nativePosition(x: number, y: number): NativePosition {
  return {
    toLogical: vi.fn((scaleFactor: number) => ({ x: x / scaleFactor, y: y / scaleFactor })),
  }
}

function setBounds(element: Element) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ left: 10, top: 20, right: 210, bottom: 220 }),
  })
}

describe('LibraryDropArea', () => {
  let handler: DragDropHandler

  beforeEach(() => {
    vi.clearAllMocks()
    scaleFactor.mockResolvedValue(2)
    onDragDropEvent.mockImplementation(async (callback) => {
      handler = callback as DragDropHandler
      return unlisten
    })
  })

  it('shows feedback while native paths are dragged over the Library area and imports on drop', async () => {
    const onDrop = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(DropArea, { props: { onDrop } })
    setBounds(wrapper.element)
    await flushPromises()

    await handler({ payload: { type: 'enter', paths: ['C:/Music/Album'], position: nativePosition(40, 60) } })

    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
    expect(wrapper.attributes('class')).toContain('ring-2')

    await handler({ payload: { type: 'drop', paths: ['C:/Music/One.mp3', 'C:/Music/Album'], position: nativePosition(40, 60) } })

    expect(onDrop).toHaveBeenCalledWith(['C:/Music/One.mp3', 'C:/Music/Album'])
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false)
  })

  it('clears feedback when a native drag leaves the Library area', async () => {
    const wrapper = mount(DropArea, { props: { onDrop: vi.fn() } })
    setBounds(wrapper.element)
    await flushPromises()

    await handler({ payload: { type: 'enter', paths: ['C:/Music/One.mp3'], position: nativePosition(40, 60) } })
    await handler({ payload: { type: 'leave' } })

    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(false)
  })

  it('does not import a drop outside the Library area', async () => {
    const onDrop = vi.fn()
    const wrapper = mount(DropArea, { props: { onDrop } })
    setBounds(wrapper.element)
    await flushPromises()

    await handler({ payload: { type: 'drop', paths: ['C:/Music/One.mp3'], position: nativePosition(440, 460) } })

    expect(onDrop).not.toHaveBeenCalled()
  })

  it('unsubscribes when unmounted', async () => {
    const wrapper = mount(DropArea, { props: { onDrop: vi.fn() } })
    await flushPromises()

    wrapper.unmount()

    expect(unlisten).toHaveBeenCalledOnce()
  })

  it('uses the current scale factor for each hit test', async () => {
    scaleFactor.mockResolvedValueOnce(2).mockResolvedValueOnce(4)
    const onDrop = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(DropArea, { props: { onDrop } })
    setBounds(wrapper.element)
    await flushPromises()
    const enterPosition = nativePosition(40, 60)
    const dropPosition = nativePosition(80, 120)

    await handler({ payload: { type: 'enter', paths: ['C:/Music/One.mp3'], position: enterPosition } })
    await handler({ payload: { type: 'drop', paths: ['C:/Music/One.mp3'], position: dropPosition } })

    expect(enterPosition.toLogical).toHaveBeenCalledWith(2)
    expect(dropPosition.toLogical).toHaveBeenCalledWith(4)
    expect(onDrop).toHaveBeenCalledOnce()
  })

  it('ignores events delivered after unmount during delayed listener registration', async () => {
    let resolveListener!: (value: () => void) => void
    onDragDropEvent.mockImplementationOnce((callback) => new Promise((resolve) => {
      handler = callback as DragDropHandler
      resolveListener = resolve
    }))
    const onDrop = vi.fn()
    const wrapper = mount(DropArea, { props: { onDrop } })
    await flushPromises()

    wrapper.unmount()
    await handler({ payload: { type: 'drop', paths: ['C:/Music/One.mp3'], position: nativePosition(40, 60) } })
    resolveListener(unlisten)
    await flushPromises()

    expect(unlisten).toHaveBeenCalledOnce()
    expect(onDrop).not.toHaveBeenCalled()
  })
})
