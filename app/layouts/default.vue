<script setup lang="ts">
const auth = useAuthStore()
const tx = useTransactionStore()
const catStore = useCategoryStore()
const goalStore = useGoalStore()

// Await init so session state is resolved before checking isLoggedIn
await auth.init()

// Load data once when login state becomes true — watch prevents duplicate calls on token refresh
watch(() => auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBaseUrl as string
    if (apiBase) {
      tx.fetchFromApi(apiBase)
      catStore.fetchFromApi()
      goalStore.loadGoals()
    } else {
      tx.loadTransactions()
    }
  }
}, { immediate: true })
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

    <ConfirmDialog />
  </div>
</template>
