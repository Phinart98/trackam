export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const publicRoutes = ['/', '/login']
  if (!publicRoutes.includes(to.path) && !auth.isLoggedIn) {
    return navigateTo('/')
  }
  if (auth.isLoggedIn && !auth.profile?.onboarded && to.path !== '/onboarding') {
    return navigateTo('/onboarding')
  }
  if (to.path === '/onboarding' && auth.profile?.onboarded) {
    return navigateTo('/dashboard')
  }
})
