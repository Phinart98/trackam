<script setup lang="ts">
import { getGreeting } from '~/utils/formatters'

const auth = useAuthStore()
const greeting = computed(() => getGreeting(auth.displayName))
const today = computed(() => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }))
</script>

<template>
  <header class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3">
    <div class="flex items-center justify-between max-w-lg mx-auto">
      <div>
        <p class="text-sm font-semibold text-slate-800">{{ greeting }}</p>
        <p class="text-xs text-slate-400">{{ today }}</p>
      </div>
      <div class="flex items-center gap-2">
        <UAvatar
          :text="auth.displayName.charAt(0).toUpperCase()"
          size="sm"
          class="bg-emerald-500 text-white font-bold"
        />
      </div>
    </div>
  </header>
</template>
