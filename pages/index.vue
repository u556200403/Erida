<script setup lang="ts">
const library = useLibraryStore()

await useAsyncData('library-tracks', async () => {
  await library.loadTracks()
  return true
})

useHead({ title: 'Library · Erida' })
</script>

<template>
  <section>
    <p class="text-sm font-medium text-violet-400">Your collection</p>
    <div class="mt-2 flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-white">Library</h1>
        <p class="mt-2 text-slate-400">{{ library.trackCount }} tracks in your library.</p>
      </div>
      <LibraryImportButton
        :on-import="library.importSelectedFiles"
        :on-import-folder="library.importSelectedFolder"
      />
    </div>

    <div class="mt-8">
      <p v-if="library.error" class="text-slate-400" role="alert">
        Unable to load your library. Please try again.
      </p>
      <LibraryEmptyState v-else-if="library.tracks.length === 0" />
      <LibraryTrackList v-else :tracks="library.tracks" />
    </div>
  </section>
</template>
