<script setup lang="ts">
const navigation = [
  { label: 'Library', to: '/' },
  { label: 'Playlists', to: '/playlists' },
]
</script>

<template>
  <div class="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
    <aside class="border-b border-slate-800 bg-slate-900 px-5 py-6 md:border-r md:border-b-0">
      <NuxtLink to="/" class="text-xl font-semibold tracking-tight text-white">
        Erida
      </NuxtLink>

      <nav class="mt-8 flex gap-2 md:flex-col" aria-label="Main navigation">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
          active-class="bg-slate-800 text-white"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </aside>

    <main class="mx-auto w-full max-w-6xl px-5 py-8 md:px-10">
      <slot />
    </main>
  </div>
</template>
