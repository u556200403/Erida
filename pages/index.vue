<script setup lang="ts">
const library = useLibraryStore()

useHead({ title: 'Library · TuneForge' })
</script>

<template>
  <section>
    <p class="text-sm font-medium text-violet-400">Your collection</p>
    <div class="mt-2 flex items-end justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-white">Library</h1>
        <p class="mt-2 text-slate-400">{{ library.trackCount }} tracks in this local preview.</p>
      </div>
      <button type="button" disabled class="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white opacity-50">
        Import music
      </button>
    </div>

    <div class="mt-8">
      <LibraryTrackList :tracks="library.tracks" />
    </div>
  </section>
</template>
