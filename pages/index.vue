<script setup lang="ts">
const library = useLibraryStore()

await useAsyncData('library-tracks', async () => {
  await library.loadTracks()
  return true
})

useHead({ title: 'Library · Erida' })
</script>

<template>
  <LibraryDropArea :on-drop="library.importDroppedPaths">
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
          :is-importing="library.isImporting"
          :import-error="library.importError"
        />
      </div>

      <div class="mt-8">
        <LibraryLoadingState v-if="library.isLoading && !library.hasLoaded" />
        <LibraryLoadErrorState
          v-else-if="library.error && !library.hasLoaded"
          :is-loading="library.isLoading"
          :on-retry="library.loadTracks"
        />
        <LibraryEmptyState v-else-if="library.tracks.length === 0" />
        <template v-else>
          <p v-if="library.error" class="mb-4 text-red-400" role="alert">
            Unable to load your library. Please try again.
          </p>
          <LibraryTrackList :tracks="library.tracks" />
        </template>
      </div>
    </section>
  </LibraryDropArea>
</template>
