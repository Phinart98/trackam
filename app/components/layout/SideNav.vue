<script setup lang="ts">
const route = useRoute()
const auth = useAuthStore()

const navItems = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'History', icon: 'i-lucide-clock', to: '/history' },
  { label: 'Add Entry', icon: 'i-lucide-plus-circle', to: '/add' },
  { label: 'AI Advisor', icon: 'i-lucide-message-circle', to: '/advisor' },
  { label: 'More', icon: 'i-lucide-menu', to: '/more' }
]

const isActive = (to: string) => route.path === to
</script>

<template>
  <aside class="hidden lg:flex flex-col fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-100 z-40">
    <!-- Logo -->
    <div class="px-5 py-5 border-b border-slate-100">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <UIcon
            name="i-lucide-trending-up"
            class="text-white text-sm"
          />
        </div>
        <span class="text-lg font-bold text-slate-900 font-display">TrackAm</span>
      </div>
    </div>

    <!-- User info -->
    <div class="px-5 py-4 border-b border-slate-100">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
          <span class="text-sm font-bold text-white">{{ auth.displayName.charAt(0).toUpperCase() }}</span>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-slate-800 truncate">
            {{ auth.displayName }}
          </p>
          <p class="text-xs text-slate-400 truncate">
            {{ auth.profile?.email }}
          </p>
        </div>
      </div>
    </div>

    <!-- Nav links -->
    <nav class="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
        :class="isActive(item.to)
          ? 'bg-emerald-50 text-emerald-700'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'"
      >
        <UIcon
          :name="item.icon"
          class="text-lg shrink-0"
          :class="isActive(item.to) ? 'text-emerald-600' : 'text-slate-400'"
        />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- Footer -->
    <div class="px-5 py-4 border-t border-slate-100">
      <p class="text-[10px] text-slate-400">
        TrackAm v1.0 · BeOrchid 2026
      </p>
    </div>
  </aside>
</template>
