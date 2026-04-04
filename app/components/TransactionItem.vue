<script setup lang="ts">
import type { Transaction } from '~/types'
import { formatCurrency, formatRelativeTime } from '~/utils/formatters'

const props = withDefaults(defineProps<{
  transaction: Transaction
  compact?: boolean
}>(), { compact: false })

defineEmits<{ delete: [id: string] }>()

const auth = useAuthStore()
const catStore = useCategoryStore()
const category = computed(() => catStore.byId(props.transaction.category))
const isIncome = computed(() => props.transaction.type === 'income')

const sourceLabel = computed(() => {
  const map: Record<string, string> = {
    'ai-text': 'AI Text',
    'ai-image': 'AI Scan',
    'ai-voice': 'Voice',
    'manual': 'Manual'
  }
  return map[props.transaction.source] ?? props.transaction.source
})
</script>

<template>
  <div
    class="flex items-center gap-3 py-3 px-1 transition-colors"
    :class="{ 'hover:bg-slate-50 rounded-lg px-3 -mx-2': !compact }"
  >
    <!-- Category icon -->
    <span
      class="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
      :class="category?.bgColor ?? 'bg-slate-100'"
    >
      <UIcon
        :name="category?.icon ?? 'i-lucide-circle-ellipsis'"
        class="text-lg"
        :class="category?.color ?? 'text-slate-400'"
      />
    </span>

    <!-- Details -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-slate-800 truncate">
        {{ transaction.description }}
      </p>
      <div class="flex items-center gap-1.5 mt-0.5">
        <span class="text-xs text-slate-400">{{ formatRelativeTime(transaction.date, transaction.createdAt) }}</span>
        <span
          v-if="transaction.vendor && !compact"
          class="text-xs text-slate-400"
        >· {{ transaction.vendor }}</span>
        <span
          v-if="transaction.source !== 'manual' && !compact"
          class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600"
        >
          {{ sourceLabel }}
        </span>
        <span
          v-if="transaction.confidence && !compact"
          class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          :class="transaction.confidence >= 90 ? 'bg-green-50 text-green-600' : transaction.confidence >= 80 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'"
        >
          {{ transaction.confidence }}%
        </span>
      </div>
    </div>

    <!-- Amount -->
    <span
      class="text-sm font-bold shrink-0 tabular-nums"
      :class="isIncome ? 'text-emerald-600' : 'text-red-500'"
    >
      {{ isIncome ? '+' : '-' }}{{ formatCurrency(transaction.amount, auth.currency) }}
    </span>
  </div>
</template>
