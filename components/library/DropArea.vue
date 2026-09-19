<script setup lang="ts">
import { getCurrentWebview, type DragDropEvent } from '@tauri-apps/api/webview'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { UnlistenFn } from '@tauri-apps/api/event'
import type { PhysicalPosition } from '@tauri-apps/api/dpi'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  onDrop: (paths: readonly string[]) => Promise<void>
}>()

const dropArea = ref<HTMLElement | null>(null)
const isDragOver = ref(false)
let hasDroppedPaths = false
let unlisten: UnlistenFn | undefined
let isUnmounted = false

async function contains(position: PhysicalPosition): Promise<boolean> {
  const scaleFactor = await getCurrentWindow().scaleFactor()

  if (isUnmounted) {
    return false
  }

  const bounds = dropArea.value?.getBoundingClientRect()

  if (bounds === undefined) {
    return false
  }

  const logicalPosition = position.toLogical(scaleFactor)

  return logicalPosition.x >= bounds.left
    && logicalPosition.x <= bounds.right
    && logicalPosition.y >= bounds.top
    && logicalPosition.y <= bounds.bottom
}

async function handleDragDrop(event: { payload: DragDropEvent }): Promise<void> {
  if (isUnmounted) {
    return
  }

  const { payload } = event

  if (payload.type === 'leave') {
    isDragOver.value = false
    hasDroppedPaths = false
    return
  }

  const isInside = await contains(payload.position)

  if (isUnmounted) {
    return
  }

  if (payload.type === 'enter') {
    hasDroppedPaths = payload.paths.length > 0
    isDragOver.value = isInside && hasDroppedPaths
    return
  }

  if (payload.type === 'over') {
    isDragOver.value = isInside && hasDroppedPaths
    return
  }

  isDragOver.value = false
  hasDroppedPaths = false

  if (isInside && payload.paths.length > 0) {
    await props.onDrop(payload.paths)
  }
}

onMounted(async () => {
  const stopListening = await getCurrentWebview().onDragDropEvent(handleDragDrop)

  if (isUnmounted) {
    stopListening()
    return
  }

  unlisten = stopListening
})

onBeforeUnmount(() => {
  isUnmounted = true
  isDragOver.value = false
  hasDroppedPaths = false
  unlisten?.()
})
</script>

<template>
  <section
    ref="dropArea"
    class="relative rounded-lg transition"
    :class="isDragOver ? 'ring-2 ring-violet-400 ring-offset-4 ring-offset-slate-950' : ''"
    :aria-busy="isDragOver || undefined"
  >
    <div
      v-if="isDragOver"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-lg border-2 border-dashed border-violet-300 bg-violet-500/15"
      aria-hidden="true"
    >
      <p class="rounded bg-slate-950/90 px-4 py-2 text-sm font-medium text-violet-100">
        Drop music files or folders to import
      </p>
    </div>
    <slot />
  </section>
</template>
