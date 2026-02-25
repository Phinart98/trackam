<script setup lang="ts">
import { Line } from 'vue-chartjs'

const props = defineProps<{
  data: { labels: string[]; income: number[]; expenses: number[] }
}>()

const chartData = computed(() => ({
  labels: props.data.labels,
  datasets: [
    {
      label: 'Income',
      data: props.data.income,
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: '#10b981',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    },
    {
      label: 'Expenses',
      data: props.data.expenses,
      borderColor: '#f87171',
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointBackgroundColor: '#f87171',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 12 } }
    },
    y: {
      grid: { color: 'rgba(0,0,0,0.04)' },
      ticks: { font: { size: 11 } }
    }
  }
}
</script>

<template>
  <div style="height: 200px">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>
