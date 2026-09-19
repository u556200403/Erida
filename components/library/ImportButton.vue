<script setup lang="ts">
import { nextTick, ref } from 'vue'

const props = defineProps<{
  onImport: () => Promise<void>
  onImportFolder: () => Promise<void>
}>()

const isImporting = ref(false)
const importError = ref<string | null>(null)
const isMenuOpen = ref(false)
const importButton = ref<HTMLButtonElement | null>(null)
const fileMenuItem = ref<HTMLButtonElement | null>(null)
const folderMenuItem = ref<HTMLButtonElement | null>(null)

async function importFiles() {
  await selectImport(props.onImport)
}

async function importFolder() {
  await selectImport(props.onImportFolder)
}

async function selectImport(action: () => Promise<void>) {
  isMenuOpen.value = false
  await runImport(action)
}

async function toggleMenu() {
  if (isImporting.value) {
    return
  }

  if (isMenuOpen.value) {
    isMenuOpen.value = false
  } else {
    isMenuOpen.value = true
    await nextTick()
    fileMenuItem.value?.focus()
  }
}

function closeMenu(returnFocus = false) {
  isMenuOpen.value = false

  if (returnFocus) {
    importButton.value?.focus()
  }
}

function focusMenuItem(direction: 1 | -1) {
  const menuItems = [fileMenuItem.value, folderMenuItem.value].filter(
    (menuItem): menuItem is HTMLButtonElement => menuItem !== null,
  )

  const currentIndex = menuItems.indexOf(document.activeElement as HTMLButtonElement)
  const nextIndex = currentIndex === -1
    ? direction === 1 ? 0 : menuItems.length - 1
    : (currentIndex + direction + menuItems.length) % menuItems.length

  menuItems[nextIndex]?.focus()
}

async function runImport(action: () => Promise<void>) {
  if (isImporting.value) {
    return
  }

  isImporting.value = true
  importError.value = null

  try {
    await action()
  } catch {
    importError.value = 'Unable to import music. Please try again.'
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-end gap-2">
    <div class="relative">
      <button
        ref="importButton"
        type="button"
        class="rounded-md bg-violet-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
        aria-haspopup="menu"
        :aria-expanded="isMenuOpen"
        :disabled="isImporting"
        @click="toggleMenu"
      >
        {{ isImporting ? 'Importing…' : 'Import music' }}
      </button>
      <div
        v-if="isMenuOpen"
        class="absolute right-0 z-10 mt-2 w-40 rounded-md border border-slate-700 bg-slate-900 p-1 shadow-lg"
        role="menu"
        aria-label="Import music options"
        @keydown.down.prevent="focusMenuItem(1)"
        @keydown.up.prevent="focusMenuItem(-1)"
        @keydown.escape.prevent="closeMenu(true)"
      >
        <button
          ref="fileMenuItem"
          type="button"
          class="w-full rounded px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          role="menuitem"
          :disabled="isImporting"
          @click="importFiles"
        >
          Choose files
        </button>
        <button
          ref="folderMenuItem"
          type="button"
          class="w-full rounded px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          role="menuitem"
          :disabled="isImporting"
          @click="importFolder"
        >
          Choose folder
        </button>
      </div>
    </div>
    <p v-if="isImporting" class="text-sm text-slate-400" role="status">
      Importing selected music…
    </p>
    <p v-else-if="importError" class="text-sm text-red-400" role="alert">
      {{ importError }}
    </p>
  </div>
</template>
