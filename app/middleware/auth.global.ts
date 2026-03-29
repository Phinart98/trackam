export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const publicRoutes = ['/', '/login']
  if (!publicRoutes.includes(to.path) && !auth.isLoggedIn) {
    return navigateTo('/')
  }
  if (to.path === '/onboarding' && auth.profile?.onboarded) {
    return navigateTo('/dashboard')
  }
})
