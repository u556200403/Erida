<script setup lang="ts">
const route = useRoute()
const library = useLibraryStore()
const trackId = computed(() => String(route.params.id))

await useAsyncData('library-tracks', async () => {
  await library.loadTracks()
  return true
})

const track = computed(() => library.tracks.find((libraryTrack) => libraryTrack.id === trackId.value))

useHead({ title: 'Track details · Erida' })
</script>

<template>
  <LibraryTrackDetails v-if="track" :track="track" />

  <section v-else-if="library.error">
    <p class="text-sm font-medium text-violet-400">Track details</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">Unable to load track</h1>
    <p class="mt-2 text-slate-400" role="alert">Unable to load your library. Please try again.</p>
  </section>

  <section v-else>
    <p class="text-sm font-medium text-violet-400">Track details</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">Track not found</h1>
    <p class="mt-2 text-slate-400">This track is not in your library.</p>
  </section>
</template>
