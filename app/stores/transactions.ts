import { defineStore } from 'pinia'
import type { Transaction } from '~/types'
import { getCategoryById } from '~/utils/categories'
import { generateMockTransactions } from '~/utils/mockDataGenerator'
import { calculateBurnRate, trendDirection } from '~/utils/forecasting'

export type ChartRange = '1W' | '1M' | '3M' | '6M'

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as Transaction[],
    seeded: false,
    chartRange: '1M' as ChartRange,
  }),

  getters: {
    sorted: state => [...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),

    totalIncome: state => state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: state => state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    balance(): number { return this.totalIncome - this.totalExpenses },

    recentTransactions(): Transaction[] {
      return this.sorted.slice(0, 5)
    },

    categoryBreakdown(): { categoryId: string; name: string; amount: number; color: string; bgColor: string; dotColor: string; percentage: number }[] {
      const expenses = this.transactions.filter(t => t.type === 'expense')
      const total = expenses.reduce((s, t) => s + t.amount, 0)
      const grouped: Record<string, number> = {}
      expenses.forEach(t => { grouped[t.category] = (grouped[t.category] ?? 0) + t.amount })

      return Object.entries(grouped)
        .map(([id, amount]) => {
          const cat = getCategoryById(id)
          // Derive a solid dot color from bgColor class (bg-orange-100 → #f97316 etc.)
          const dotColor = DOT_COLOR_MAP[id] ?? '#94a3b8'
          return {
            categoryId: id,
            name: cat?.name ?? id,
            amount,
            color: cat?.color ?? 'text-slate-400',
            bgColor: cat?.bgColor ?? 'bg-slate-100',
            dotColor,
            percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
          }
        })
        .sort((a, b) => b.amount - a.amount)
    },

    // Replaces weeklyData — builds chart data based on chartRange
    chartData(): { labels: string[]; income: number[]; expenses: number[] } {
      const range = this.chartRange
      const labels: string[] = []
      const income: number[] = []
      const expenses: number[] = []
      const now = new Date()

      if (range === '1W') {
        // 7 daily bars
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          const iso = d.toISOString().slice(0, 10)
          labels.push(d.toLocaleDateString('en-GB', { weekday: 'short' }))
          const dayTxs = this.transactions.filter(t => t.date.startsWith(iso))
          income.push(dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
          expenses.push(dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
        }
      } else if (range === '1M') {
        // 4-5 weekly bars
        for (let i = 3; i >= 0; i--) {
          const weekEnd = new Date(now)
          weekEnd.setDate(weekEnd.getDate() - i * 7)
          const weekStart = new Date(weekEnd)
          weekStart.setDate(weekStart.getDate() - 7)
          const label = weekStart.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          labels.push(label)
          const txs = this.transactions.filter(t => {
            const d = new Date(t.date)
            return d >= weekStart && d < weekEnd
          })
          income.push(txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
          expenses.push(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
        }
      } else if (range === '3M') {
        // ~12 weekly bars
        for (let i = 11; i >= 0; i--) {
          const weekEnd = new Date(now)
          weekEnd.setDate(weekEnd.getDate() - i * 7)
          const weekStart = new Date(weekEnd)
          weekStart.setDate(weekStart.getDate() - 7)
          const label = weekStart.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
          labels.push(label)
          const txs = this.transactions.filter(t => {
            const d = new Date(t.date)
            return d >= weekStart && d < weekEnd
          })
          income.push(txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
          expenses.push(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
        }
      } else {
        // 6M — 6 monthly bars
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now)
          d.setMonth(d.getMonth() - i)
          const prefix = d.toISOString().slice(0, 7)
          labels.push(d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }))
          const txs = this.transactions.filter(t => t.date.startsWith(prefix))
          income.push(txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
          expenses.push(txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
        }
      }

      return { labels, income, expenses }
    },

    forecast(): ReturnType<typeof calculateBurnRate> & { trend: string } {
      const budget = 0 // will be overridden by component using auth store
      const result = calculateBurnRate(this.transactions, budget)
      const trend = trendDirection(this.transactions)
      return { ...result, trend }
    },

    weeklyData(): { labels: string[]; income: number[]; expenses: number[] } {
      // Keep for backwards compat — mirrors 1M chart data
      return this.chartData
    },
  },

  actions: {
    seed() {
      if (!this.seeded) {
        this.transactions = generateMockTransactions(6)
        this.seeded = true
      }
    },

    setChartRange(range: ChartRange) {
      this.chartRange = range
    },

    addTransaction(tx: Omit<Transaction, 'id'>) {
      this.transactions.unshift({ ...tx, id: Date.now().toString() })
    },

    deleteTransaction(id: string) {
      this.transactions = this.transactions.filter(t => t.id !== id)
    },
  },

  persist: true,
})

// Solid hex colors for category doughnut dots
const DOT_COLOR_MAP: Record<string, string> = {
  food: '#f97316',
  transport: '#eab308',
  market: '#ec4899',
  airtime: '#ef4444',
  bills: '#16a34a',
  health: '#3b82f6',
  education: '#6366f1',
  supplies: '#b45309',
  personal: '#a855f7',
  gifts: '#14b8a6',
  other_expense: '#94a3b8',
  sales: '#10b981',
  momo: '#ca8a04',
  salary: '#7c3aed',
  other_income: '#65a30d',
}
