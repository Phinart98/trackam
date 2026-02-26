// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt'
  ],

  devtools: {
    enabled: false
  },

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'TrackAm — Track Your Money, Grow Your Business',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Syne:wght@700;800&display=swap' }
      ]
    }
  },

  ssr: false,

  vite: {
    resolve: {
      dedupe: ['pinia', 'vue', '@vue/runtime-core']
    },
    optimizeDeps: {
      include: ['chart.js', 'vue-chartjs', 'pinia-plugin-persistedstate']
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
