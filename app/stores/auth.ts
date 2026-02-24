import { defineStore } from 'pinia'
import type { UserProfile } from '~/types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    profile: null as UserProfile | null,
    isLoggedIn: false,
  }),

  getters: {
    currency: state => state.profile?.currency ?? 'GHS',
    displayName: state => state.profile?.name ?? 'there',
  },

  actions: {
    async login(email: string, _password: string) {
      await new Promise(resolve => setTimeout(resolve, 600))
      const name = email.split('@')[0] ?? 'User'
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1)
      this.isLoggedIn = true
      if (!this.profile) {
        this.profile = {
          name: capitalized,
          email,
          currency: 'GHS',
          businessType: '',
          onboarded: false,
        }
      }
    },

    completeOnboarding(currency: string, businessType: string, monthlyBudget?: number) {
      if (!this.profile) return
      this.profile.currency = currency
      this.profile.businessType = businessType
      this.profile.monthlyBudget = monthlyBudget
      this.profile.onboarded = true
    },

    logout() {
      this.isLoggedIn = false
      this.profile = null
    },
  },

  persist: true,
})
