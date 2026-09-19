<script setup lang="ts">
import type { LibraryTrackRow } from '~/types/library'

defineProps<{
  track: LibraryTrackRow
}>()
</script>

<template>
  <section>
    <p class="text-sm font-medium text-violet-400">Track details</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">{{ track.title }}</h1>

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
  </section>
</template>
