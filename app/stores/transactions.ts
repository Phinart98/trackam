import type { Transaction } from '~/types'
import { calculateBurnRate, trendDirection } from '~/utils/forecasting'

export type ChartRange = '1W' | '1M' | '3M' | '6M'

const sumByType = (txs: { type: string, amount: number }[], type: 'income' | 'expense') =>
  txs.filter(t => t.type === type).reduce((s, t) => s + t.amount, 0)

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as Transaction[],
    chartRange: '1M' as ChartRange,
    loading: false,
    aiInsight: null as string | null,
    aiInsightAt: 0, // unix timestamp ms when last generated
    aiInsightTxCount: 0 // transaction count when last generated
  }),

  getters: {
    sorted: state => [...state.transactions].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateDiff !== 0) return dateDiff
      // Same date: sort by insertion time so entries appear in the order they were added
      return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    }),

    totalIncome: state => sumByType(state.transactions, 'income'),
    totalExpenses: state => sumByType(state.transactions, 'expense'),
    balance(): number { return this.totalIncome - this.totalExpenses },

    recentTransactions(): Transaction[] {
      return this.sorted.slice(0, 5)
    },

    categoryBreakdown(): { categoryId: string, name: string, amount: number, color: string, bgColor: string, dotColor: string, percentage: number }[] {
      const expenses = this.transactions.filter(t => t.type === 'expense')
      const total = expenses.reduce((s, t) => s + t.amount, 0)
      const grouped: Record<string, number> = {}
      expenses.forEach(t => (grouped[t.category] = (grouped[t.category] ?? 0) + t.amount))

      const catStore = useCategoryStore()
      return Object.entries(grouped)
        .map(([id, amount]) => {
          const cat = catStore.byId(id)
          return {
            categoryId: id,
            name: cat?.name ?? id,
            amount,
            color: cat?.color ?? 'text-slate-400',
            bgColor: cat?.bgColor ?? 'bg-slate-100',
            dotColor: cat?.dotColor ?? '#94a3b8',
            percentage: total > 0 ? Math.round((amount / total) * 100) : 0
          }
        })
        .sort((a, b) => b.amount - a.amount)
    },

    chartData(): { labels: string[], income: number[], expenses: number[] } {
      const range = this.chartRange
      const labels: string[] = []
      const income: number[] = []
      const expenses: number[] = []
      const now = new Date()

      if (range === '1W') {
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          const iso = d.toISOString().slice(0, 10)
          labels.push(d.toLocaleDateString('en-GB', { weekday: 'short' }))
          const dayTxs = this.transactions.filter(t => t.date.startsWith(iso))
          income.push(sumByType(dayTxs, 'income'))
          expenses.push(sumByType(dayTxs, 'expense'))
        }
      } else if (range === '1M' || range === '3M') {
        const weeks = range === '1M' ? 4 : 12
        for (let i = weeks - 1; i >= 0; i--) {
          const weekEnd = new Date(now)
          weekEnd.setDate(weekEnd.getDate() - i * 7)
          // Include end date (add 1 day so today's transactions are not excluded)
          const weekEndInclusive = new Date(weekEnd)
          weekEndInclusive.setDate(weekEndInclusive.getDate() + 1)
          const weekStart = new Date(weekEnd)
          weekStart.setDate(weekStart.getDate() - 7)
          labels.push(weekStart.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }))
          const txs = this.transactions.filter((t) => {
            const d = new Date(t.date)
            return d >= weekStart && d < weekEndInclusive
          })
          income.push(sumByType(txs, 'income'))
          expenses.push(sumByType(txs, 'expense'))
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now)
          d.setMonth(d.getMonth() - i)
          const prefix = d.toISOString().slice(0, 7)
          labels.push(d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }))
          const txs = this.transactions.filter(t => t.date.startsWith(prefix))
          income.push(sumByType(txs, 'income'))
          expenses.push(sumByType(txs, 'expense'))
        }
      }

      return { labels, income, expenses }
    },

    forecast(): ReturnType<typeof calculateBurnRate> & { trend: string } {
      const budget = useAuthStore().profile?.monthlyBudget ?? 0
      const result = calculateBurnRate(this.transactions, budget)
      const trend = trendDirection(this.transactions)
      return { ...result, trend }
    }

  },

  actions: {
    async loadTransactions() {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string
      if (apiBaseUrl) await this.fetchFromApi(apiBaseUrl)
    },

    /** Fetch all transactions from the backend API. */
    async fetchFromApi(apiBaseUrl: string) {
      this.loading = true
      try {
        const token = await getAuthToken()
        const data = await $fetch<Transaction[]>(`${apiBaseUrl}/api/transactions`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        this.transactions = data
      } catch (err) {
        // Do not auto-logout on 401 — a token failure (cold start race, network blip)
        // should not blow away the user's Supabase session. The onAuthStateChange
        // listener in the auth store handles genuine sign-out events.
        console.warn('Failed to fetch transactions from API:', err)
      } finally {
        this.loading = false
      }
    },

    /** Save a transaction to the API. Throws on failure so callers can show an error. */
    async saveTransaction(tx: Omit<Transaction, 'id'>) {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string
      if (!apiBaseUrl) throw new Error('No API configured')

      const token = await getAuthToken()
      const saved = await $fetch<Transaction>(`${apiBaseUrl}/api/transactions`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: tx
      })
      this.transactions.unshift(saved)
    },

    /** Delete a transaction — from API if available, always from local store. */
    async removeTransaction(id: string) {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string

      if (apiBaseUrl) {
        try {
          const token = await getAuthToken()
          await $fetch(`${apiBaseUrl}/api/transactions/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
        } catch (err: unknown) {
          // Only remove locally if API returned 404 (already deleted remotely)
          if ((err as { statusCode?: number })?.statusCode !== 404) {
            console.warn('Failed to delete from API:', err)
            return
          }
        }
        this.transactions = this.transactions.filter(t => t.id !== id)
      } else {
        this.transactions = this.transactions.filter(t => t.id !== id)
      }
    },

    setChartRange(range: ChartRange) {
      this.chartRange = range
    },

    addTransaction(tx: Omit<Transaction, 'id'>) {
      this.transactions.unshift({ ...tx, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` })
    }
  },

  persist: {
    pick: ['transactions', 'chartRange', 'aiInsight', 'aiInsightAt', 'aiInsightTxCount']
  }
})
