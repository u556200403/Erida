<script setup lang="ts">
const route = useRoute()
const library = useLibraryStore()
const trackId = computed(() => String(route.params.id))

await useAsyncData('library-tracks', async () => {
  await library.loadTracks()
  return true
})

const track = computed(() => library.tracks.find((libraryTrack) => libraryTrack.id === trackId.value))

async function removeTrack() {
  try {
    const wasRemoved = await library.removeTrack(trackId.value)

    if (wasRemoved) {
      await navigateTo('/')
    }
  } catch {
    // The library store exposes a user-safe error for this page.
  }
}

useHead({ title: 'Track details · Erida' })
</script>

<template>
  <template v-if="track">
    <LibraryTrackDetails
      :track="track"
      :is-removing="library.isRemoving"
      @remove="removeTrack"
    />
    <p v-if="library.removeError" class="mt-4 text-slate-400" role="alert">
      {{ library.removeError }}
    </p>
  </template>

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
