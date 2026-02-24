import { defineStore } from 'pinia'
import type { Transaction } from '~/types'
import { MOCK_TRANSACTIONS } from '~/utils/mockData'
import { getCategoryById } from '~/utils/categories'

export const useTransactionStore = defineStore('transactions', {
  state: () => ({
    transactions: [] as Transaction[],
    seeded: false,
  }),

  getters: {
    sorted: state => [...state.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),

    totalIncome: state => state.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
    totalExpenses: state => state.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
    balance(): number { return this.totalIncome - this.totalExpenses },

    recentTransactions(): Transaction[] {
      return this.sorted.slice(0, 5)
    },

    categoryBreakdown(): { categoryId: string; name: string; amount: number; color: string; bgColor: string; percentage: number }[] {
      const expenses = this.transactions.filter(t => t.type === 'expense')
      const total = expenses.reduce((s, t) => s + t.amount, 0)
      const grouped: Record<string, number> = {}
      expenses.forEach(t => { grouped[t.category] = (grouped[t.category] ?? 0) + t.amount })

      return Object.entries(grouped)
        .map(([id, amount]) => {
          const cat = getCategoryById(id)
          return {
            categoryId: id,
            name: cat?.name ?? id,
            amount,
            color: cat?.color ?? 'text-slate-400',
            bgColor: cat?.bgColor ?? 'bg-slate-100',
            percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
          }
        })
        .sort((a, b) => b.amount - a.amount)
    },

    weeklyData(): { labels: string[]; income: number[]; expenses: number[] } {
      const labels: string[] = []
      const income: number[] = []
      const expenses: number[] = []

      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - (i + 1) * 7)
        const weekEnd = new Date()
        weekEnd.setDate(weekEnd.getDate() - i * 7)

        const label = `W${4 - i}`
        labels.push(label)

        const weekTxs = this.transactions.filter(t => {
          const d = new Date(t.date)
          return d >= weekStart && d < weekEnd
        })

        income.push(weekTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))
        expenses.push(weekTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
      }

      return { labels, income, expenses }
    },
  },

  actions: {
    seed() {
      if (!this.seeded) {
        this.transactions = [...MOCK_TRANSACTIONS]
        this.seeded = true
      }
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
