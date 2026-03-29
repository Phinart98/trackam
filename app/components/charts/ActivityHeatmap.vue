<script setup lang="ts">
import type { Transaction } from '~/types'
import { formatCurrency } from '~/utils/formatters'

const props = defineProps<{
  transactions: Transaction[]
  months?: number
  currency?: string
}>()

const GAP = 2
const LABEL_WIDTH = 28

const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(320)

onMounted(() => {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
  }
})

const heatmapData = computed(() => {
  const months = props.months ?? 4
  const now = new Date()
  const start = new Date(now)
  start.setMonth(start.getMonth() - months)
  start.setDate(1)
  const startIso = start.toISOString().slice(0, 10)

  const dailyMap = new Map<string, number>()
  for (const tx of props.transactions) {
    if (tx.type !== 'expense') continue
    const d = tx.date.slice(0, 10)
    if (d < startIso) continue
    dailyMap.set(d, (dailyMap.get(d) ?? 0) + tx.amount)
  }

  const values = [...dailyMap.values()]
  const maxAmount = values.length ? Math.max(...values) : 1

  const weeks: { date: Date; iso: string; amount: number; intensity: number }[][] = []
  let currentWeek: typeof weeks[0] = []
  const cursor = new Date(start)

  const startDay = cursor.getDay()
  if (startDay > 0) {
    for (let i = 0; i < startDay; i++) currentWeek.push({ date: new Date(0), iso: '', amount: 0, intensity: -1 })
  }

  while (cursor <= now) {
    const iso = cursor.toISOString().slice(0, 10)
    const amount = dailyMap.get(iso) ?? 0
    const intensity = maxAmount > 0 ? amount / maxAmount : 0
    currentWeek.push({ date: new Date(cursor), iso, amount, intensity })

    if (cursor.getDay() === 6) {
      weeks.push(currentWeek)
      currentWeek = []
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  if (currentWeek.length) weeks.push(currentWeek)

  return { weeks, maxAmount, dailyMap }
})

// Compute cell size to always fit container
const cellSize = computed(() => {
  const weekCount = heatmapData.value.weeks.length
  if (weekCount === 0) return 12
  const available = containerWidth.value - LABEL_WIDTH
  const size = Math.floor(available / weekCount) - GAP
  return Math.max(8, Math.min(14, size))
})

const monthLabels = computed(() => {
  const labels: { label: string; weekIdx: number }[] = []
  let lastMonth = -1

  heatmapData.value.weeks.forEach((week, wIdx) => {
    for (const day of week) {
      if (day.intensity < 0) continue
      const m = day.date.getMonth()
      if (m !== lastMonth) {
        labels.push({ label: day.date.toLocaleDateString('en-GB', { month: 'short' }), weekIdx: wIdx })
        lastMonth = m
      }
    }
  })
  return labels
})

const narrative = computed(() => {
  const map = heatmapData.value.dailyMap
  if (map.size === 0) return ''

  let peakDay = ''
  let peakAmount = 0
  for (const [day, amount] of map) {
    if (amount > peakAmount) { peakDay = day; peakAmount = amount }
  }

  const dayName = new Date(peakDay).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
  const currency = props.currency ?? 'GHS'
  return `Biggest spending day: ${dayName} (${formatCurrency(peakAmount, currency)})`
})

const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function intensityColor(intensity: number): string {
  if (intensity < 0) return 'transparent'
  if (intensity === 0) return '#f1f5f9'
  if (intensity < 0.25) return '#fed7aa'
  if (intensity < 0.5) return '#fb923c'
  if (intensity < 0.75) return '#ea580c'
  return '#dc2626'
}
</script>

<template>
  <div ref="containerRef" role="img" aria-label="Daily spending activity heatmap">
    <!-- Month labels -->
    <div class="relative ml-7" style="height: 14px">
      <span
        v-for="m in monthLabels"
        :key="m.weekIdx"
        class="absolute text-[10px] text-slate-400 font-medium"
        :style="{ left: `${m.weekIdx * (cellSize + GAP)}px` }"
      >
        {{ m.label }}
      </span>
    </div>

    <div class="flex gap-0.5 mt-1">
      <!-- Day labels -->
      <div class="flex flex-col shrink-0 mr-1" :style="{ gap: `${GAP}px` }">
        <span
          v-for="label in dayLabels"
          :key="label"
          class="text-[9px] text-slate-400 leading-none flex items-center"
          :style="{ height: `${cellSize}px` }"
        >
          {{ label }}
        </span>
      </div>

      <!-- Heatmap grid -->
      <div class="flex" :style="{ gap: `${GAP}px` }">
        <div
          v-for="(week, wIdx) in heatmapData.weeks"
          :key="wIdx"
          class="flex flex-col"
          :style="{ gap: `${GAP}px` }"
        >
          <div
            v-for="(day, dIdx) in week"
            :key="dIdx"
            class="rounded-sm"
            :style="{
              width: `${cellSize}px`,
              height: `${cellSize}px`,
              backgroundColor: intensityColor(day.intensity),
            }"
            :title="day.iso ? `${day.iso}: ${day.amount > 0 ? day.amount.toFixed(0) : 'No spending'}` : ''"
          />
        </div>
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-1.5 mt-2 ml-7">
      <span class="text-[9px] text-slate-400">Less</span>
      <span v-for="i in 5" :key="i" class="rounded-sm" :style="{ width: `${cellSize}px`, height: `${cellSize}px`, backgroundColor: intensityColor((i - 1) * 0.25) }" />
      <span class="text-[9px] text-slate-400">More</span>
    </div>
    <p v-if="narrative" class="text-[11px] text-slate-500 mt-2 ml-7">{{ narrative }}</p>
  </div>
</template>
