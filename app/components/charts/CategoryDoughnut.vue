<script setup lang="ts">
import { Doughnut } from 'vue-chartjs'

const props = defineProps<{
  data: { name: string, amount: number, color: string, dotColor?: string, percentage: number }[]
}>()

const COLOR_MAP: Record<string, string> = {
  'text-orange-500': '#f97316',
  'text-yellow-500': '#eab308',
  'text-yellow-600': '#ca8a04',
  'text-pink-500': '#ec4899',
  'text-red-500': '#ef4444',
  'text-green-600': '#16a34a',
  'text-blue-500': '#3b82f6',
  'text-indigo-500': '#6366f1',
  'text-amber-700': '#b45309',
  'text-purple-500': '#a855f7',
  'text-teal-500': '#14b8a6',
  'text-slate-400': '#94a3b8',
  'text-emerald-600': '#059669',
  'text-violet-600': '#7c3aed',
  'text-lime-600': '#65a30d'
}

// Deterministic color for custom categories not in the static map
function hashColor(str: string): string {
  const palette = ['#f97316', '#eab308', '#ec4899', '#ef4444', '#16a34a', '#3b82f6', '#a855f7', '#14b8a6', '#f59e0b', '#06b6d4', '#8b5cf6', '#10b981']
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  return palette[hash % palette.length]!
}

const chartData = computed(() => ({
  labels: props.data.map(d => d.name),
  datasets: [{
    data: props.data.map(d => d.amount),
    backgroundColor: props.data.map(d => d.dotColor ?? COLOR_MAP[d.color] ?? hashColor(d.name)),
    borderWidth: 2,
    borderColor: '#ffffff',
    hoverOffset: 6
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '65%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      cornerRadius: 8
    }
  }
}
</script>

<template>
  <div
    style="height: 200px"
    role="img"
    aria-label="Spending breakdown by category (doughnut chart)"
  >
    <Doughnut
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>
