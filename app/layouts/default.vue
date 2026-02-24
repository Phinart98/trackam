<script setup lang="ts">
const auth = useAuthStore()
const router = useRouter()

// Redirect to login if not authenticated
onMounted(() => {
  if (!auth.isLoggedIn) {
    router.replace('/')
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <AppLayoutAppHeader />
    <main class="flex-1 overflow-y-auto pb-24 max-w-lg mx-auto w-full">
      <slot />
    </main>
    <AppLayoutBottomNav />
  </div>
</template>
