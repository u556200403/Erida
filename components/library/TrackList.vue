<script setup lang="ts">
import type { LibraryTrackRow } from '~/types/library'

defineProps<{
  tracks: LibraryTrackRow[]
}>()
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-slate-800">
    <table class="w-full text-left text-sm">
      <thead class="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
        <tr>
          <th class="px-4 py-3 font-medium">Title</th>
          <th class="hidden px-4 py-3 font-medium sm:table-cell">Artist</th>
          <th class="hidden px-4 py-3 font-medium md:table-cell">Album</th>
          <th class="px-4 py-3 text-right font-medium">Time</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800">
        <tr v-for="track in tracks" :key="track.id" class="bg-slate-900/50 text-slate-200">
          <td class="px-4 py-3 font-medium text-white">
            <NuxtLink
              :to="{ name: 'tracks-id', params: { id: track.id } }"
              class="transition hover:text-violet-300"
            >
              {{ track.title }}
            </NuxtLink>
          </td>
          <td class="hidden px-4 py-3 sm:table-cell">{{ track.artist }}</td>
          <td class="hidden px-4 py-3 text-slate-400 md:table-cell">{{ track.album }}</td>
          <td class="px-4 py-3 text-right text-slate-400">{{ track.duration }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
