<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LibraryTrackRow } from '~/types/library'

const props = defineProps<{
  track: LibraryTrackRow
  isRemoving?: boolean
}>()

const emit = defineEmits<{
  remove: []
}>()

const artworkUrl = ref(props.track.artworkUrl)

watch(() => [props.track.id, props.track.artworkUrl], ([, nextArtworkUrl]) => {
  artworkUrl.value = nextArtworkUrl
})
</script>

<template>
  <section>
    <p class="text-sm font-medium text-violet-400">Track details</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">{{ track.title }}</h1>

    <img
      v-if="artworkUrl"
      :src="artworkUrl"
      :alt="`Artwork for ${track.title}`"
      class="mt-6 size-40 rounded-lg border border-slate-800 object-cover"
      @error="artworkUrl = null"
    >
    <div
      v-else
      class="mt-6 flex size-40 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-center text-xs text-slate-400"
      data-testid="artwork-placeholder"
    >
      Artwork unavailable
    </div>

    <dl class="mt-8 grid gap-5 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-slate-400">Artist</dt>
        <dd class="mt-1 text-base text-white">{{ track.artist }}</dd>
      </div>
      <div>
        <dt class="text-slate-400">Album</dt>
        <dd class="mt-1 text-base text-white">{{ track.album }}</dd>
      </div>
      <div>
        <dt class="text-slate-400">Duration</dt>
        <dd class="mt-1 text-base text-white">{{ track.duration }}</dd>
      </div>
      <div v-if="track.source.kind === 'local'" class="sm:col-span-2">
        <dt class="text-slate-400">Local path</dt>
        <dd class="mt-1 break-all text-base text-white">{{ track.source.locator }}</dd>
      </div>
    </dl>

    <button
      type="button"
      class="mt-8 rounded-md border border-red-500/50 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="isRemoving"
      @click="emit('remove')"
    >
      {{ isRemoving ? 'Removing…' : 'Remove from library' }}
    </button>
  </section>
</template>
