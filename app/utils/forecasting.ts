import type { Transaction } from '~/types'
import { getCurrencySymbol } from '~/utils/formatters'

interface DailyBucket {
  date: string
  income: number
  expenses: number
}

export function buildDailyBuckets(transactions: Transaction[]): DailyBucket[] {
  const map = new Map<string, DailyBucket>()
  for (const tx of transactions) {
    const date = tx.date.slice(0, 10)
    if (!map.has(date)) map.set(date, { date, income: 0, expenses: 0 })
    const b = map.get(date)!
    if (tx.type === 'income') b.income += tx.amount
    else b.expenses += tx.amount
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function exponentialMovingAverage(values: number[], period: number): number[] {
  if (values.length === 0) return []
  const alpha = 2 / (period + 1)
  const result: number[] = []
  let ema = values[0]!
  for (const v of values) {
    ema = alpha * v + (1 - alpha) * ema
    result.push(ema)
  }
  return result
}

export interface TrendLine {
  slope: number
  intercept: number
  predict: (dayIndex: number) => number
}

export function linearRegression(values: number[]): TrendLine {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, predict: () => values[0] ?? 0 }
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i]! - yMean)
    den += (i - xMean) ** 2
  }
  const slope = den !== 0 ? num / den : 0
  const intercept = yMean - slope * xMean
  return { slope, intercept, predict: i => Math.max(0, intercept + slope * i) }
}

export interface BurnRate {
  dailyAverage: number
  projectedMonthTotal: number
  projectedEndBalance: number
  burnPercent: number
  daysRemaining: number
  burnLabel: 'on-track' | 'warning' | 'over'
}

export function calculateBurnRate(transactions: Transaction[], monthlyBudget: number): BurnRate {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - dayOfMonth

  const monthPrefix = today.toISOString().slice(0, 7)
  const monthTxs = transactions.filter(t => t.date.startsWith(monthPrefix))

  let totalExpenses = 0, totalIncome = 0
  for (const t of monthTxs) {
    if (t.type === 'expense') totalExpenses += t.amount
    else totalIncome += t.amount
  }

  // Historical 3-month average (prior months only) — anchor for early-month projections
  const priorMonths: Map<string, { expenses: number, income: number }> = new Map()
  for (const t of transactions) {
    const prefix = t.date.slice(0, 7)
    if (prefix >= monthPrefix) continue
    if (!priorMonths.has(prefix)) priorMonths.set(prefix, { expenses: 0, income: 0 })
    const b = priorMonths.get(prefix)!
    if (t.type === 'expense') b.expenses += t.amount
    else b.income += t.amount
  }
  const recentMonths = [...priorMonths.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 3)
    .map(([, v]) => v)
  const histExpenses = recentMonths.length > 0
    ? recentMonths.reduce((s, m) => s + m.expenses, 0) / recentMonths.length
    : null
  const histIncome = recentMonths.length > 0
    ? recentMonths.reduce((s, m) => s + m.income, 0) / recentMonths.length
    : null

  // Blend weight: ramps from 0 (pure historical) on day 1 to 1 (pure current) by day 14
  // Matches industry practice (Copilot/Rocket Money) of anchoring to history early in the month
  const blendWeight = Math.min(dayOfMonth / 14, 1)
  const effectiveDays = Math.max(dayOfMonth, 1)
  const currentPaceExpenses = (totalExpenses / effectiveDays) * daysInMonth
  const currentPaceIncome = (totalIncome / effectiveDays) * daysInMonth

  const projectedMonthTotal = histExpenses !== null
    ? (1 - blendWeight) * histExpenses + blendWeight * currentPaceExpenses
    : currentPaceExpenses
  const projectedIncome = histIncome !== null
    ? (1 - blendWeight) * histIncome + blendWeight * currentPaceIncome
    : currentPaceIncome

  const dailyAverage = projectedMonthTotal / daysInMonth
  const projectedEndBalance = projectedIncome - projectedMonthTotal

  const budget = monthlyBudget || projectedIncome || 1
  const burnPercent = Math.round((projectedMonthTotal / budget) * 100)
  const burnLabel = burnPercent > 100 ? 'over' : burnPercent > 80 ? 'warning' : 'on-track'

  return { dailyAverage, projectedMonthTotal, projectedEndBalance, burnPercent, daysRemaining, burnLabel }
}

export function trendDirection(transactions: Transaction[]): 'improving' | 'declining' | 'stable' {
  const buckets = buildDailyBuckets(transactions.filter(t => t.type === 'expense'))
  if (buckets.length < 7) return 'stable'
  const recent = buckets.slice(-14).map(b => b.expenses)
  const { slope } = linearRegression(recent)
  // slope per day — normalise to weekly
  const weeklyChange = slope * 7
  const avgDaily = recent.reduce((a, b) => a + b, 0) / recent.length
  const pct = avgDaily > 0 ? weeklyChange / avgDaily : 0
  if (pct > 0.08) return 'declining'
  if (pct < -0.08) return 'improving'
  return 'stable'
}

export interface HealthScore {
  score: number
  label: string
  color: string
}

export function computeHealthScore(transactions: Transaction[], monthlyBudget: number): HealthScore {
  if (transactions.length === 0) return { score: 0, label: 'No data', color: 'text-slate-400' }

  let totalIncome = 0, totalExpenses = 0
  for (const t of transactions) {
    if (t.type === 'income') totalIncome += t.amount
    else totalExpenses += t.amount
  }

  // Factor 1: Income/Expense ratio (35%) — 100 if income ≥ 2× expenses
  const ratio = totalExpenses > 0 ? totalIncome / totalExpenses : 2
  const ratioScore = Math.min(100, Math.round((ratio / 2) * 100))

  // Factor 2: Spending trend (25%)
  const trend = trendDirection(transactions)
  const trendScore = trend === 'improving' ? 100 : trend === 'stable' ? 60 : 20

  // Factor 3: Budget adherence (25%)
  const burn = calculateBurnRate(transactions, monthlyBudget)
  const budgetScore = burn.burnPercent <= 70
    ? 100
    : burn.burnPercent <= 100
      ? Math.round(100 - (burn.burnPercent - 70) * 2)
      : Math.max(0, Math.round(40 - (burn.burnPercent - 100)))

  // Factor 4: Tracking consistency — days with txs out of last 30 (15%)
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentDays = new Set(
    transactions
      .filter(t => new Date(t.date) >= thirtyDaysAgo)
      .map(t => t.date.slice(0, 10))
  )
  const consistencyScore = Math.round((recentDays.size / 30) * 100)

  const score = Math.round(
    ratioScore * 0.35 + trendScore * 0.25 + budgetScore * 0.25 + consistencyScore * 0.15
  )

  const label = score >= 70 ? 'Excellent' : score >= 40 ? 'Good' : 'Needs Attention'
  const color = score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-red-500'

  return { score, label, color }
}

export interface WeekPulse {
  incomeChange: number
  expenseChange: number
  netChange: number
  thisWeekIncome: number
  lastWeekIncome: number
  thisWeekExpenses: number
  lastWeekExpenses: number
}

export function weekOverWeek(transactions: Transaction[]): WeekPulse {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(weekStart.getDate() - 7)
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)

  const thisWeek = transactions.filter((t) => {
    const d = new Date(t.date)
    return d >= weekStart && d <= today
  })
  const lastWeek = transactions.filter((t) => {
    const d = new Date(t.date)
    return d >= prevWeekStart && d < weekStart
  })

  const thisWeekIncome = thisWeek.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const lastWeekIncome = lastWeek.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const thisWeekExpenses = thisWeek.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const lastWeekExpenses = lastWeek.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const pctChange = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0

  return {
    incomeChange: pctChange(thisWeekIncome, lastWeekIncome),
    expenseChange: pctChange(thisWeekExpenses, lastWeekExpenses),
    netChange: pctChange(thisWeekIncome - thisWeekExpenses, lastWeekIncome - lastWeekExpenses),
    thisWeekIncome,
    lastWeekIncome,
    thisWeekExpenses,
    lastWeekExpenses
  }
}

export interface SmartAlert {
  message: string
  icon: string
  color: string
  bgColor: string
}

export function detectAnomalies(transactions: Transaction[], currency: string): SmartAlert[] {
  const alerts: SmartAlert[] = []
  if (transactions.length < 14) return alerts

  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentTxs = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo && t.type === 'expense')
  const thisWeekTxs = transactions.filter(t => new Date(t.date) >= sevenDaysAgo && t.type === 'expense')

  // Category anomalies — compare this week's category spend to 30-day weekly average
  const catTotals30d: Record<string, number> = {}
  const catTotals7d: Record<string, number> = {}
  recentTxs.forEach(t => (catTotals30d[t.category] = (catTotals30d[t.category] ?? 0) + t.amount))
  thisWeekTxs.forEach(t => (catTotals7d[t.category] = (catTotals7d[t.category] ?? 0) + t.amount))

  for (const [cat, weekTotal] of Object.entries(catTotals7d)) {
    const monthTotal = catTotals30d[cat] ?? 0
    const weeklyAvg = monthTotal / 4.3
    if (weeklyAvg > 0 && weekTotal > weeklyAvg * 1.3) {
      const pct = Math.round(((weekTotal - weeklyAvg) / weeklyAvg) * 100)
      const catName = cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')
      alerts.push({
        message: `${catName} spending is ${pct}% above your weekly average`,
        icon: 'i-lucide-alert-triangle',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50'
      })
    }
  }

  // Income momentum
  const pulse = weekOverWeek(transactions)
  if (pulse.incomeChange > 10) {
    alerts.push({
      message: `Income is up ${pulse.incomeChange}% this week — nice momentum!`,
      icon: 'i-lucide-rocket',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    })
  } else if (pulse.incomeChange < -15) {
    alerts.push({
      message: `Income dropped ${Math.abs(pulse.incomeChange)}% vs last week — keep an eye on it`,
      icon: 'i-lucide-alert-circle',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    })
  }

  // Savings opportunity — top expense category
  const sorted = Object.entries(catTotals30d).sort((a, b) => b[1] - a[1])
  if (sorted.length > 0) {
    const [topCat, topAmount] = sorted[0]!
    const monthlySavings = Math.round(topAmount * 0.1)
    if (monthlySavings > 5) {
      const catName = topCat.charAt(0).toUpperCase() + topCat.slice(1).replace('_', ' ')
      alerts.push({
        message: `Reducing ${catName} by 10% could save ~${getCurrencySymbol(currency)} ${monthlySavings}/month`,
        icon: 'i-lucide-piggy-bank',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      })
    }
  }

  // Tracking streak
  const allDates = new Set(transactions.map(t => t.date.slice(0, 10)))
  const months = new Set(transactions.map(t => t.date.slice(0, 7)))
  if (months.size >= 3) {
    alerts.push({
      message: `You've tracked ${allDates.size} days across ${months.size} months — great consistency`,
      icon: 'i-lucide-flame',
      color: 'text-violet-600',
      bgColor: 'bg-violet-50'
    })
  }

  return alerts.slice(0, 3)
}
