<script setup lang="ts">
import type { Playlist } from '~/types/music'

defineProps<{
  playlist: Playlist
}>()
</script>

<template>
  <article class="rounded-lg border border-slate-800 bg-slate-900 p-5">
    <h2 class="font-semibold text-white">{{ playlist.name }}</h2>
    <p class="mt-2 text-sm text-slate-400">{{ playlist.description }}</p>
    <p class="mt-4 text-sm text-slate-500">{{ playlist.trackCount }} tracks</p>
  </article>
</template>
