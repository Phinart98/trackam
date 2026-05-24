export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const publicRoutes = ['/', '/login']
  if (!publicRoutes.includes(to.path) && !auth.isLoggedIn) {
    return navigateTo('/')
  }
  // Only redirect to onboarding after init() has hydrated the profile from Supabase.
  // Before that, persisted cookie/localStorage may have stale onboarded=false from
  // a cold-start timeout or a bug — never redirect based on stale data.
  if (auth._initialized && auth.isLoggedIn && auth.profile && !auth.profile.onboarded && to.path !== '/onboarding') {
    return navigateTo('/onboarding')
  }
  if (to.path === '/onboarding' && auth.profile?.onboarded) {
    return navigateTo('/dashboard')
  }
})
