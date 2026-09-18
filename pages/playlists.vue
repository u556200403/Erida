<script setup lang="ts">
const library = useLibraryStore()

useHead({ title: 'Playlists · Erida' })
</script>

<template>
  <section>
    <p class="text-sm font-medium text-violet-400">Organize your music</p>
    <h1 class="mt-2 text-3xl font-semibold tracking-tight text-white">Playlists</h1>
    <p class="mt-2 text-slate-400">Demo playlists will later be replaced by music-library data.</p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <PlaylistsPlaylistCard
        v-for="playlist in library.playlists"
        :key="playlist.id"
        :playlist="playlist"
      />
    </div>
  </section>
</template>
