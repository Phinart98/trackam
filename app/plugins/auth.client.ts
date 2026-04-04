/**
 * Initialize auth before any route middleware runs.
 * Nuxt awaits async plugins before mounting and before the first navigation,
 * so by the time auth.global.ts middleware evaluates, profile state is resolved.
 */
export default defineNuxtPlugin(async () => {
  const auth = useAuthStore()
  await auth.init()
})
