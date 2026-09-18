<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  onImport: () => Promise<void>
}>()

const isImporting = ref(false)
const importError = ref<string | null>(null)

async function importFiles() {
  if (isImporting.value) {
    return
  }

  isImporting.value = true
  importError.value = null

  try {
    await props.onImport()
  } catch {
    importError.value = 'Unable to import music. Please try again.'
  } finally {
    isImporting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-end gap-2">
    <button
      type="button"
      class="rounded-md bg-violet-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isImporting"
      @click="importFiles"
    >
      {{ isImporting ? 'Importing…' : 'Import music' }}
    </button>
    <p v-if="isImporting" class="text-sm text-slate-400" role="status">
      Importing selected music…
    </p>
    <p v-else-if="importError" class="text-sm text-red-400" role="alert">
      {{ importError }}
    </p>
  </div>
</template>
