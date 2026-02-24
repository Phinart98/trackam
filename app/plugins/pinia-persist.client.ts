import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

export default defineNuxtPlugin((nuxtApp) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(nuxtApp.$pinia as any).use(piniaPluginPersistedstate)
})
