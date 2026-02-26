<script setup lang="ts">
import { formatCurrency } from '~/utils/formatters'
import { calculateBurnRate, trendDirection, computeHealthScore, weekOverWeek, detectAnomalies } from '~/utils/forecasting'

const auth = useAuthStore()
const tx = useTransactionStore()

const ranges = ['1W', '1M', '3M', '6M'] as const

// Animated counter — counts from 0 to target over ~1.2s
const displayBalance = ref(0)
const displayIncome = ref(0)
const displayExpenses = ref(0)
let animatedOnce = false

function animateCounter(target: number, setter: (v: number) => void, duration = 1200) {
  const start = performance.now()
  function tick(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - (1 - progress) ** 3 // ease-out cubic
    setter(Math.round(target * eased))
    if (progress < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

onMounted(() => {
  if (!animatedOnce) {
    animatedOnce = true
    animateCounter(tx.balance, v => { displayBalance.value = v })
    animateCounter(tx.totalIncome, v => { displayIncome.value = v })
    animateCounter(tx.totalExpenses, v => { displayExpenses.value = v })
  }
})

const forecast = computed(() => {
  const budget = auth.profile?.monthlyBudget ?? 0
  return calculateBurnRate(tx.transactions, budget)
})

const trend = computed(() => trendDirection(tx.transactions))

const insightText = computed(() => {
  const t = trend.value
  const top = tx.categoryBreakdown[0]
  if (t === 'declining' && top) {
    return `Your spending is trending up. ${top.name} accounts for ${top.percentage}% of expenses — consider reviewing it.`
  }
  if (t === 'improving') {
    return `Great work — your spending is trending down this week. Keep it up!`
  }
  if (top) {
    return `${top.name} is your largest expense at ${top.percentage}% of total spend. On track for this month.`
  }
  return 'Add more transactions to get personalised insights.'
})

const burnBarColor = computed(() => {
  const pct = forecast.value.burnPercent
  if (pct > 100) return 'bg-red-400'
  if (pct > 80) return 'bg-amber-400'
  return 'bg-emerald-400'
})

const healthScore = computed(() => computeHealthScore(tx.transactions, auth.profile?.monthlyBudget ?? 0))
const pulse = computed(() => weekOverWeek(tx.transactions))
const alerts = computed(() => detectAnomalies(tx.transactions, auth.currency))

const healthStroke = computed(() => {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (healthScore.value.score / 100) * circumference
  return { circumference, offset }
})

const healthRingColor = computed(() => {
  const s = healthScore.value.score
  if (s >= 70) return 'stroke-emerald-500'
  if (s >= 40) return 'stroke-amber-500'
  return 'stroke-red-500'
})

// Plain-language narratives for non-data-literate users
const activityNarrative = computed(() => {
  const d = tx.chartData
  const totalInc = d.income.reduce((s, v) => s + v, 0)
  const totalExp = d.expenses.reduce((s, v) => s + v, 0)
  const rangeLabel = tx.chartRange === '1W' ? 'this week' : tx.chartRange === '1M' ? 'this month' : tx.chartRange === '3M' ? 'these 3 months' : 'these 6 months'
  if (totalInc === 0 && totalExp === 0) return 'No activity yet for this period.'
  if (totalInc > totalExp) return `${rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)}, you earned more than you spent — that's good!`
  if (totalExp > totalInc) return `${rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)}, you spent more than you earned — be careful.`
  return `${rangeLabel.charAt(0).toUpperCase() + rangeLabel.slice(1)}, your income and spending are about equal.`
})

const categoryNarrative = computed(() => {
  const cats = tx.categoryBreakdown
  if (cats.length === 0) return ''
  const top = cats[0]!
  const totalSpend = cats.reduce((s, c) => s + c.amount, 0)
  return `${top.name} is where most of your money goes — ${formatCurrency(top.amount, auth.currency)} out of ${formatCurrency(totalSpend, auth.currency)} total.`
})

const healthExplanation = computed(() => {
  const s = healthScore.value.score
  if (s >= 70) return 'You are earning well, spending carefully, and tracking your money. Keep going!'
  if (s >= 40) return 'You are doing okay, but there is room to spend less or earn more.'
  return 'Your spending is higher than your income. Try to cut costs or find more income this week.'
})
</script>

<template>
  <div class="px-4 pt-5 pb-6 lg:px-6 lg:pt-6">

    <!-- Desktop page title -->
    <div class="hidden lg:flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 font-display">Dashboard</h1>
        <p class="text-sm text-slate-400 mt-0.5">{{ new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}</p>
      </div>
      <NuxtLink to="/add">
        <button class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 active:scale-95 transition-all shadow-sm">
          <UIcon name="i-lucide-plus" class="text-base" />
          Add Entry
        </button>
      </NuxtLink>
    </div>

    <!-- Balance Card (full width) -->
    <div class="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 lg:p-6 text-white shadow-lg shadow-emerald-200/60 relative overflow-hidden mb-5">
      <div class="absolute inset-0 opacity-[0.06]" style="background-image: repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%); background-size: 20px 20px;" />

      <div class="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <p class="text-emerald-100 text-xs font-semibold uppercase tracking-widest mb-2">Net Balance</p>
          <ClientOnly>
            <p class="text-4xl lg:text-5xl font-bold tracking-tight">
              {{ formatCurrency(displayBalance, auth.currency) }}
            </p>
          </ClientOnly>
          <!-- trend badge -->
          <div class="flex items-center gap-1.5 mt-2">
            <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              :class="trend === 'improving' ? 'bg-emerald-500/30 text-emerald-200' : trend === 'declining' ? 'bg-red-500/30 text-red-200' : 'bg-white/10 text-white/60'">
              <UIcon :name="trend === 'improving' ? 'i-lucide-trending-down' : trend === 'declining' ? 'i-lucide-trending-up' : 'i-lucide-minus'" class="text-xs" />
              {{ trend === 'improving' ? 'Spending down' : trend === 'declining' ? 'Spending up' : 'Stable' }}
            </span>
          </div>
        </div>

        <div class="flex gap-6 lg:gap-10">
          <div>
            <div class="flex items-center gap-1.5 mb-1">
              <UIcon name="i-lucide-trending-up" class="text-emerald-200 text-sm" />
              <span class="text-emerald-200 text-xs font-medium">Income</span>
            </div>
            <ClientOnly>
              <p class="text-white font-bold text-lg">{{ formatCurrency(displayIncome, auth.currency) }}</p>
            </ClientOnly>
          </div>
          <div class="w-px bg-white/20 hidden lg:block" />
          <div>
            <div class="flex items-center gap-1.5 mb-1">
              <UIcon name="i-lucide-trending-down" class="text-red-300 text-sm" />
              <span class="text-emerald-200 text-xs font-medium">Expenses</span>
            </div>
            <ClientOnly>
              <p class="text-white font-bold text-lg">{{ formatCurrency(displayExpenses, auth.currency) }}</p>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile quick actions -->
    <div class="grid grid-cols-2 gap-3 mb-5 lg:hidden">
      <NuxtLink to="/add" class="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md active:scale-[0.98] transition-all">
        <span class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
          <UIcon name="i-lucide-plus-circle" class="text-emerald-600 text-lg" />
        </span>
        <span class="text-sm font-semibold text-slate-800">Add Entry</span>
      </NuxtLink>
      <NuxtLink to="/add?tab=scan" class="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md active:scale-[0.98] transition-all">
        <span class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
          <UIcon name="i-lucide-camera" class="text-amber-600 text-lg" />
        </span>
        <span class="text-sm font-semibold text-slate-800">Snap Receipt</span>
      </NuxtLink>
    </div>

    <!-- AI Insight Card -->
    <div class="bg-gradient-to-r from-violet-50 to-emerald-50 border border-violet-100 rounded-xl p-4 mb-5 flex items-start gap-3">
      <div class="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
        <UIcon name="i-lucide-sparkles" class="text-violet-600 text-sm" />
      </div>
      <div>
        <p class="text-xs font-bold text-violet-700 mb-0.5">AI Insight</p>
        <p class="text-sm text-slate-700 leading-relaxed">{{ insightText }}</p>
      </div>
    </div>

    <!-- Main grid: chart + forecast side by side on desktop -->
    <div class="lg:grid lg:grid-cols-2 lg:gap-5 space-y-5 lg:space-y-0 mb-5">

      <!-- Chart card -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-bar-chart-3" class="text-emerald-500 text-lg" />
            <h3 class="text-sm font-bold text-slate-800">Your Money Flow</h3>
          </div>
          <!-- Range selector -->
          <div class="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              v-for="r in ranges"
              :key="r"
              class="px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all"
              :class="tx.chartRange === r ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
              @click="tx.setChartRange(r)"
            >
              {{ r }}
            </button>
          </div>
        </div>
        <div class="flex gap-4 mb-2">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span class="text-xs text-slate-500">Income</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span class="text-xs text-slate-500">Expenses</span>
          </div>
        </div>
        <p class="text-[13px] text-slate-500 leading-relaxed mb-3">{{ activityNarrative }}</p>
        <ChartsWeeklyTrendChart :data="tx.chartData" />
      </div>

      <!-- Forecast Card -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-calendar-check" class="text-amber-500 text-lg" />
          <h3 class="text-sm font-bold text-slate-800">Rest of This Month</h3>
          <span class="ml-auto text-xs text-slate-400">{{ forecast.daysRemaining }}d left</span>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="bg-emerald-50 rounded-xl p-3">
            <p class="text-xs text-emerald-600 font-medium mb-1">Money Left End of Month</p>
            <ClientOnly>
              <p class="text-lg font-bold text-emerald-700">{{ formatCurrency(Math.abs(forecast.projectedEndBalance), auth.currency) }}</p>
            </ClientOnly>
            <p class="text-[10px] text-emerald-500 mt-0.5">{{ forecast.projectedEndBalance >= 0 ? 'projected profit' : 'projected deficit' }}</p>
          </div>
          <div class="bg-amber-50 rounded-xl p-3">
            <p class="text-xs text-amber-600 font-medium mb-1">You Spend Per Day</p>
            <ClientOnly>
              <p class="text-lg font-bold text-amber-700">{{ formatCurrency(forecast.dailyAverage, auth.currency) }}</p>
            </ClientOnly>
            <p class="text-[10px] text-amber-500 mt-0.5">per day average</p>
          </div>
        </div>

        <!-- Budget progress bar -->
        <div class="mb-3">
          <div class="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Budget spent so far</span>
            <span>{{ Math.min(forecast.burnPercent, 999) }}%</span>
          </div>
          <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="burnBarColor"
              :style="{ width: `${Math.min(forecast.burnPercent, 100)}%` }"
            />
          </div>
        </div>

        <!-- At-this-rate sentence -->
        <ClientOnly>
          <p class="text-xs text-slate-500 leading-relaxed">
            At this rate you'll spend
            <strong class="text-slate-700">{{ formatCurrency(forecast.projectedMonthTotal, auth.currency) }}</strong>
            this month
            <span :class="forecast.burnLabel === 'over' ? 'text-red-500 font-semibold' : forecast.burnLabel === 'warning' ? 'text-amber-500 font-semibold' : 'text-emerald-600 font-semibold'">
              — {{ forecast.burnLabel === 'over' ? 'over budget' : forecast.burnLabel === 'warning' ? 'watch spending' : 'on track' }}
            </span>
          </p>
        </ClientOnly>
      </div>
    </div>

    <!-- Second row: categories + recent transactions -->
    <div class="lg:grid lg:grid-cols-2 lg:gap-5 space-y-5 lg:space-y-0">

      <!-- Category Breakdown -->
      <div v-if="tx.categoryBreakdown.length > 0" class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-pie-chart" class="text-violet-500 text-lg" />
          <h3 class="text-sm font-bold text-slate-800">Where Your Money Goes</h3>
        </div>
        <p v-if="categoryNarrative" class="text-[13px] text-slate-500 leading-relaxed mb-3">{{ categoryNarrative }}</p>
        <div class="flex gap-4 items-center">
          <div class="w-32 shrink-0">
            <ChartsCategoryDoughnut :data="tx.categoryBreakdown" />
          </div>
          <div class="flex-1 space-y-2 min-w-0">
            <div
              v-for="cat in tx.categoryBreakdown.slice(0, 5)"
              :key="cat.categoryId"
              class="flex items-center gap-2"
            >
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: cat.dotColor }" />
              <span class="text-xs text-slate-600 truncate flex-1">{{ cat.name }}</span>
              <span class="text-xs font-semibold text-slate-800 shrink-0">{{ formatCurrency(cat.amount, auth.currency) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Transactions -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-clock" class="text-slate-400 text-lg" />
            <h3 class="text-sm font-bold text-slate-800">Recent</h3>
          </div>
          <NuxtLink to="/history" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            See all
          </NuxtLink>
        </div>

        <div v-if="tx.recentTransactions.length > 0" class="divide-y divide-slate-50">
          <TransactionItem
            v-for="t in tx.recentTransactions"
            :key="t.id"
            :transaction="t"
            compact
          />
        </div>

        <div v-else class="py-8 text-center">
          <UIcon name="i-lucide-inbox" class="text-slate-300 text-3xl mb-2" />
          <p class="text-sm text-slate-400">No transactions yet</p>
          <NuxtLink to="/add" class="text-sm font-semibold text-emerald-600 mt-1 inline-block">
            Add your first entry
          </NuxtLink>
        </div>
      </div>

    </div>

    <!-- Third row: Health Score + Week Pulse + Smart Alerts -->
    <div class="lg:grid lg:grid-cols-3 lg:gap-5 space-y-5 lg:space-y-0 mt-5">

      <!-- Financial Health Score -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-heart" class="text-rose-500 text-lg" />
          <h3 class="text-sm font-bold text-slate-800">How Are You Doing?</h3>
        </div>
        <div class="flex items-center gap-5">
          <!-- SVG circle gauge -->
          <div class="relative w-28 h-28 shrink-0">
            <svg class="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke-width="8" class="stroke-slate-100" />
              <circle
                cx="60" cy="60" r="54" fill="none" stroke-width="8" stroke-linecap="round"
                :class="healthRingColor"
                :stroke-dasharray="healthStroke.circumference"
                :stroke-dashoffset="healthStroke.offset"
                style="transition: stroke-dashoffset 1s ease-out"
              />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-2xl font-bold text-slate-800">{{ healthScore.score }}</span>
              <span class="text-[10px] font-medium text-slate-400">/ 100</span>
            </div>
          </div>
          <div>
            <p class="text-sm font-bold" :class="healthScore.color">{{ healthScore.label }}</p>
            <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ healthExplanation }}</p>
          </div>
        </div>
      </div>

      <!-- Week-over-Week Pulse -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-activity" class="text-blue-500 text-lg" />
          <h3 class="text-sm font-bold text-slate-800">This Week vs Last Week</h3>
        </div>
        <div class="space-y-3">
          <!-- Income comparison -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-slate-500">Money Earned</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                :class="pulse.incomeChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'">
                {{ pulse.incomeChange >= 0 ? '↑ Up' : '↓ Down' }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-600">
              <ClientOnly>
                <span class="text-slate-400">Last wk:</span>
                <strong>{{ formatCurrency(pulse.lastWeekIncome, auth.currency) }}</strong>
                <UIcon name="i-lucide-arrow-right" class="text-slate-300 text-base" />
                <span class="text-slate-400">This wk:</span>
                <strong :class="pulse.incomeChange >= 0 ? 'text-emerald-600' : 'text-red-500'">{{ formatCurrency(pulse.thisWeekIncome, auth.currency) }}</strong>
              </ClientOnly>
            </div>
          </div>
          <div class="h-px bg-slate-100" />
          <!-- Expenses comparison -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-slate-500">Money Spent</span>
              <span class="text-xs font-bold px-2 py-0.5 rounded-full"
                :class="pulse.expenseChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'">
                {{ pulse.expenseChange <= 0 ? '↓ Down' : '↑ Up' }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-slate-600">
              <ClientOnly>
                <span class="text-slate-400">Last wk:</span>
                <strong>{{ formatCurrency(pulse.lastWeekExpenses, auth.currency) }}</strong>
                <UIcon name="i-lucide-arrow-right" class="text-slate-300 text-base" />
                <span class="text-slate-400">This wk:</span>
                <strong :class="pulse.expenseChange <= 0 ? 'text-emerald-600' : 'text-red-500'">{{ formatCurrency(pulse.thisWeekExpenses, auth.currency) }}</strong>
              </ClientOnly>
            </div>
          </div>
        </div>
      </div>

      <!-- Smart Alerts -->
      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="flex items-center gap-2 mb-4">
          <UIcon name="i-lucide-bell-ring" class="text-amber-500 text-lg" />
          <h3 class="text-sm font-bold text-slate-800">Things to Watch</h3>
        </div>
        <div v-if="alerts.length > 0" class="space-y-2.5">
          <div
            v-for="(alert, i) in alerts"
            :key="i"
            class="flex items-start gap-2.5 p-2.5 rounded-lg"
            :class="alert.bgColor"
          >
            <UIcon :name="alert.icon" class="text-base shrink-0 mt-0.5" :class="alert.color" />
            <p class="text-xs leading-relaxed" :class="alert.color">{{ alert.message }}</p>
          </div>
        </div>
        <div v-else class="py-6 text-center">
          <UIcon name="i-lucide-check-circle" class="text-emerald-400 text-2xl mb-1" />
          <p class="text-xs text-slate-400">All clear — no anomalies detected</p>
        </div>
      </div>

    </div>
  </div>
</template>
