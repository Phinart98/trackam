// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@vite-pwa/nuxt'
  ],

  ssr: false,

  devtools: {
    enabled: false
  },

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

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseAnonKey: '',
      apiBaseUrl: ''
    }
  },

  icon: {
    clientBundle: {
      scan: true,
      includeCustomCollections: true
    }
  },

  compatibilityDate: '2025-01-15',

  vite: {
    resolve: {
      dedupe: ['pinia', 'vue', '@vue/runtime-core']
    },
    optimizeDeps: {
      include: ['chart.js', 'vue-chartjs', 'pinia-plugin-persistedstate']
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'TrackAm',
      short_name: 'TrackAm',
      description: 'AI-powered financial tracker for Africa\'s informal economy',
      theme_color: '#10b981',
      background_color: '#f8fafc',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}']
    }
  }
})
