<script setup lang="ts">
import { Line } from 'vue-chartjs'
import type { ChartOptions, TooltipItem } from 'chart.js'
import { getCurrencySymbol } from '~/utils/formatters'

const props = defineProps<{
  data: { labels: string[], income: number[], expenses: number[] }
  currency?: string
}>()

const symbol = computed(() => getCurrencySymbol(props.currency ?? 'GHS'))

const baseDataset = { fill: true, tension: 0.4, pointRadius: 5, pointBorderColor: '#fff', pointBorderWidth: 2 }

const chartData = computed(() => ({
  labels: props.data.labels,
  datasets: [
    { ...baseDataset, label: 'Income', data: props.data.income, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', pointBackgroundColor: '#10b981' },
    { ...baseDataset, label: 'Expenses', data: props.data.expenses, borderColor: '#f87171', backgroundColor: 'rgba(248, 113, 113, 0.1)', pointBackgroundColor: '#f87171' }
  ]
}))

const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx: TooltipItem<'line'>) =>
          ` ${ctx.dataset.label ?? ''}: ${symbol.value} ${(ctx.parsed.y ?? 0).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
      }
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11 } }
    },
    y: {
      min: 0,
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: {
        font: { size: 11 },
        callback: (value: number | string) => {
          const v = Number(value)
          const s = symbol.value
          return v >= 1000 ? `${s}${(v / 1000).toFixed(0)}k` : `${s}${v}`
        }
      }
    }
  }
}))
</script>

<template>
  <div
    style="height: 200px"
    role="img"
    aria-label="Income and expenses trend chart"
  >
    <Line
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>
