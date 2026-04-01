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
    async loadGoals() {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string
      if (!apiBaseUrl) return
      try {
        const token = await getAuthToken()
        const data = await $fetch<Goal[]>(`${apiBaseUrl}/api/goals`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        this.goals = data.map(normalizeGoal)
      } catch (err) {
        console.warn('Failed to fetch goals from API:', err)
      }
    },

    async addGoal(input: Omit<Goal, 'id' | 'createdAt'>) {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string

      if (apiBaseUrl) {
        try {
          const token = await getAuthToken()
          const saved = await $fetch<Goal>(`${apiBaseUrl}/api/goals`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: input
          })
          this.goals.push(normalizeGoal(saved))
          return normalizeGoal(saved)
        } catch (err) {
          console.warn('Failed to save goal to API, saving locally:', err)
        }
      }

      // Fallback: local only
      const goal: Goal = {
        ...input,
        id: `goal_${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString()
      }
      this.goals.push(goal)
      return goal
    },

    async updateGoal(id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>) {
      const goal = this.goals.find(g => g.id === id)
      if (!goal) return

      const merged = { ...goal, ...updates }
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string

      if (apiBaseUrl) {
        try {
          const token = await getAuthToken()
          const saved = await $fetch<Goal>(`${apiBaseUrl}/api/goals/${id}`, {
            method: 'PUT',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: merged
          })
          Object.assign(goal, normalizeGoal(saved))
          return
        } catch (err) {
          console.warn('Failed to update goal on API, updating locally:', err)
        }
      }

      Object.assign(goal, updates)
    },

    async addFunds(id: string, amount: number): Promise<boolean> {
      const goal = this.goals.find(g => g.id === id)
      if (!goal) return false
      const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount)
      const capped = newAmount >= goal.targetAmount
      await this.updateGoal(id, { currentAmount: newAmount })
      return capped
    },

    async removeFunds(id: string, amount: number) {
      const goal = this.goals.find(g => g.id === id)
      if (!goal) return
      await this.updateGoal(id, { currentAmount: Math.max(0, goal.currentAmount - amount) })
    },

    async removeGoal(id: string) {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string

      if (apiBaseUrl) {
        try {
          const token = await getAuthToken()
          await $fetch(`${apiBaseUrl}/api/goals/${id}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
        } catch (err: unknown) {
          if ((err as { statusCode?: number })?.statusCode !== 404) {
            console.warn('Failed to delete goal from API:', err)
            return
          }
        }
      }

      this.goals = this.goals.filter(g => g.id !== id)
    }
  },

  persist: true
})

/** Normalize backend response: ensure numeric fields are numbers (JSON may send strings for BigDecimal). */
function normalizeGoal(g: Goal): Goal {
  return {
    ...g,
    id: String(g.id),
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    createdAt: g.createdAt ?? new Date().toISOString()
  }
}
