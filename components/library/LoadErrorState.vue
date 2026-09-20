<script setup lang="ts">
defineProps<{
  isLoading: boolean
  onRetry: () => Promise<boolean>
}>()
</script>

<template>
  <div class="rounded-lg border border-dashed border-red-900/70 bg-slate-900/50 px-6 py-16 text-center" role="alert">
    <h2 class="text-lg font-semibold text-white">Unable to load your library</h2>
    <p class="mt-2 text-sm text-slate-400">Please try again.</p>
    <button
      type="button"
      class="mt-5 rounded-md bg-violet-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="isLoading"
      @click="onRetry"
    >
      Try again
    </button>
  </div>
</template>
