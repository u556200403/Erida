<script setup lang="ts">
import { nextTick, ref } from 'vue'

const props = defineProps<{
  onImport: () => Promise<void>
  onImportFolder: () => Promise<void>
  isImporting: boolean
  importError: string | null
}>()

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
  if (props.isImporting) {
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
  await action()
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
        :disabled="props.isImporting"
        @click="toggleMenu"
      >
        {{ props.isImporting ? 'Importing…' : 'Import music' }}
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
          :disabled="props.isImporting"
          @click="importFiles"
        >
          Choose files
        </button>
        <button
          ref="folderMenuItem"
          type="button"
          class="w-full rounded px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          role="menuitem"
          :disabled="props.isImporting"
          @click="importFolder"
        >
          Choose folder
        </button>
      </div>
    </div>
    <p v-if="props.isImporting" class="text-sm text-slate-400" role="status">
      Importing selected music…
    </p>
    <p v-else-if="props.importError" class="text-sm text-red-400" role="alert">
      {{ props.importError }}
    </p>
  </div>
</template>
