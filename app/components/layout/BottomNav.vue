<script setup lang="ts">
const route = useRoute()

const navItems = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'History', icon: 'i-lucide-clock', to: '/history' },
  { label: 'Add', icon: 'i-lucide-plus', to: '/add', isAction: true },
  { label: 'Advisor', icon: 'i-lucide-message-circle', to: '/advisor' },
  { label: 'More', icon: 'i-lucide-menu', to: '/more' }
]

const isActive = (to: string) => route.path === to
</script>

<template>
  <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 safe-area-bottom">
    <div class="flex items-end justify-around px-2 py-1">
      <template
        v-for="item in navItems"
        :key="item.to"
      >
        <!-- Elevated Add button -->
        <NuxtLink
          v-if="item.isAction"
          :to="item.to"
          :aria-label="item.label"
          class="flex flex-col items-center -mt-5"
        >
          <span
            class="flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform active:scale-95"
            :class="isActive(item.to) ? 'bg-emerald-600 shadow-emerald-200' : 'bg-emerald-500 shadow-emerald-200'"
          >
            <UIcon
              name="i-lucide-plus"
              class="text-white text-2xl"
              aria-hidden="true"
            />
          </span>
          <span
            class="text-[11px] mt-1 font-medium"
            :class="isActive(item.to) ? 'text-emerald-600' : 'text-slate-400'"
          >
            {{ item.label }}
          </span>
        </NuxtLink>

        <!-- Regular nav tabs -->
        <NuxtLink
          v-else
          :to="item.to"
          :aria-label="item.label"
          class="flex flex-col items-center py-2 px-3 min-w-[56px] transition-colors"
          :class="isActive(item.to) ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'"
        >
          <UIcon
            :name="item.icon"
            class="text-xl mb-0.5"
            aria-hidden="true"
          />
          <span class="text-[11px] font-medium">{{ item.label }}</span>
        </NuxtLink>
      </template>
    </div>
  </nav>
</template>
