<script setup lang="ts">
const auth = useAuthStore()
const tx = useTransactionStore()
const router = useRouter()

// Seed synchronously so data is available on the first render
if (auth.isLoggedIn) {
  tx.seed()
}

onMounted(() => {
  if (!auth.isLoggedIn) {
    router.replace('/')
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Desktop sidebar -->
    <LayoutSideNav />

    <!-- Mobile header -->
    <LayoutAppHeader />

    <!-- Main content — offset by sidebar on desktop -->
    <main class="lg:pl-60 pb-24 lg:pb-6 min-h-screen">
      <div class="max-w-5xl mx-auto">
        <slot />
      </div>
    </main>

    <!-- Mobile bottom nav -->
    <LayoutBottomNav />
  </div>
</template>
