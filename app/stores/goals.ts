import { defineStore } from 'pinia'
import type { Goal } from '~/types'

export const useGoalStore = defineStore('goals', {
  state: () => ({
    goals: [] as Goal[]
  }),

  getters: {
    active: state => state.goals.filter(g => g.currentAmount < g.targetAmount),
    completed: state => state.goals.filter(g => g.currentAmount >= g.targetAmount),
    totalSaved: state => state.goals.reduce((sum, g) => sum + g.currentAmount, 0),

    preview(): Goal[] {
      return [...this.active, ...this.completed].slice(0, 2)
    },

    progressMap(): Record<string, number> {
      const map: Record<string, number> = {}
      for (const g of this.goals) {
        map[g.id] = g.targetAmount > 0
          ? Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100)
          : 0
      }
      return map
    },

    daysLeftMap(): Record<string, number | null> {
      const map: Record<string, number | null> = {}
      for (const g of this.goals) {
        if (!g.deadline) {
          map[g.id] = null
          continue
        }
        const diff = new Date(g.deadline).getTime() - Date.now()
        map[g.id] = Math.max(0, Math.ceil(diff / 86400000))
      }
      return map
    }
  },

  actions: {
    addGoal(input: Omit<Goal, 'id' | 'createdAt'>) {
      const goal: Goal = {
        ...input,
        id: `goal_${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString()
      }
      this.goals.push(goal)
      return goal
    },

    updateGoal(id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>) {
      const goal = this.goals.find(g => g.id === id)
      if (goal) Object.assign(goal, updates)
    },

    addFunds(id: string, amount: number): boolean {
      const goal = this.goals.find(g => g.id === id)
      if (!goal) return false
      const newAmount = goal.currentAmount + amount
      const capped = newAmount >= goal.targetAmount
      goal.currentAmount = Math.min(newAmount, goal.targetAmount)
      return capped
    },

    removeFunds(id: string, amount: number) {
      const goal = this.goals.find(g => g.id === id)
      if (!goal) return
      goal.currentAmount = Math.max(0, goal.currentAmount - amount)
    },

    removeGoal(id: string) {
      this.goals = this.goals.filter(g => g.id !== id)
    }
  },

  persist: true
})
