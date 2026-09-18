export default defineNuxtConfig({
  ssr: false,
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  vite: {
    server: {
      watch: {
        ignored: /[/\\]src-tauri[/\\]target[/\\]/,
      },
    },
  },
  typescript: {
    strict: true,
  },
})
