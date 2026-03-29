import { defineStore } from 'pinia'
import type { UserProfile } from '~/types'
import { getAuthToken } from '~/composables/useAuthToken'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    profile: null as UserProfile | null,
    isLoggedIn: false,
    authError: null as string | null,
    _listenerAttached: false,
    _unsubscribeAuth: null as (() => void) | null,
  }),

  getters: {
    currency: state => state.profile?.currency ?? 'GHS',
    displayName: state => state.profile?.name ?? 'there',
    useRealAuth: () => {
      const config = useRuntimeConfig()
      return !!(config.public.supabaseUrl && config.public.supabaseAnonKey)
    }
  },

  actions: {
    /** Initialize Supabase auth listener — call once from app layout. */
    async init() {
      if (!this.useRealAuth || this._listenerAttached) return
      this._listenerAttached = true

      const supabase = useSupabase()

      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        this.isLoggedIn = true
        if (!this.profile) {
          const meta = session.user.user_metadata ?? {}
          this.profile = {
            name: (meta.name as string) || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            currency: 'GHS',
            businessType: '',
            onboarded: false
          }
        }
      } else {
        // No valid session — clear stale persisted state
        this.isLoggedIn = false
        this.profile = null
      }

      // Listen for auth state changes (sign in, sign out, token refresh)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          this.isLoggedIn = true
        } else if (event === 'SIGNED_OUT') {
          this.isLoggedIn = false
          this.profile = null
        }
      })
      this._unsubscribeAuth = () => subscription.unsubscribe()
    },

    /** Sign in with email + password. */
    async login(email: string, password: string) {
      this.authError = null

      if (!this.useRealAuth) {
        // Mock mode for demo without Supabase
        await new Promise(resolve => setTimeout(resolve, 600))
        const name = email.split('@')[0] ?? 'User'
        this.isLoggedIn = true
        if (!this.profile) {
          this.profile = {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            email,
            currency: 'GHS',
            businessType: '',
            onboarded: false
          }
        }
        return
      }

      const supabase = useSupabase()
      const { error, data: { user } } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        this.authError = error.message
        throw new Error(error.message)
      }

      this.isLoggedIn = true

      // Use server-returned user_metadata — authoritative source for name and onboarded state
      const meta = user?.user_metadata ?? {}
      const apiBase = useRuntimeConfig().public.apiBaseUrl as string | undefined
      if (apiBase) {
        try {
          const token = await getAuthToken()
          const serverProfile = await $fetch<UserProfile>(`${apiBase}/api/profile`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
          this.profile = serverProfile
        } catch {
          // Backend not yet reachable — fall back to metadata
          this.profile = {
            name: (meta.name as string) || email.split('@')[0] || 'User',
            email,
            currency: 'GHS',
            businessType: '',
            onboarded: false
          }
        }
      } else {
        this.profile = {
          name: (meta.name as string) || email.split('@')[0] || 'User',
          email,
          currency: 'GHS',
          businessType: '',
          onboarded: false
        }
      }
    },

    /** Create a new account with email + password + optional name. */
    async signUp(email: string, password: string, name?: string) {
      this.authError = null

      if (!this.useRealAuth) {
        await this.login(email, password)
        if (this.profile && name) this.profile.name = name
        return
      }

      const supabase = useSupabase()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || email.split('@')[0] }
        }
      })

      if (error) {
        this.authError = error.message
        throw new Error(error.message)
      }

      this.isLoggedIn = true
      this.profile = {
        name: name || (email.split('@')[0] ?? 'user').replace(/^\w/, c => c.toUpperCase()) || 'User',
        email,
        currency: 'GHS',
        businessType: '',
        onboarded: false
      }
    },

    completeOnboarding(currency: string, businessType: string, monthlyBudget?: number) {
      if (!this.profile) return
      this.profile.currency = currency
      this.profile.businessType = businessType
      this.profile.monthlyBudget = monthlyBudget
      this.profile.onboarded = true
    },

    /** Persist current profile state to backend (fire-and-forget). */
    async saveProfile() {
      if (!this.profile) return
      const apiBase = useRuntimeConfig().public.apiBaseUrl as string | undefined
      if (!apiBase) return
      try {
        const token = await getAuthToken()
        await $fetch(`${apiBase}/api/profile`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: this.profile
        })
      } catch {
        // Non-critical — profile is still saved locally in Pinia
      }
    },

    async logout() {
      this._unsubscribeAuth?.()
      this._unsubscribeAuth = null
      this._listenerAttached = false
      if (this.useRealAuth) {
        try {
          const supabase = useSupabase()
          await supabase.auth.signOut()
        } catch {
          // Sign out locally even if network fails
        }
      }
      this.isLoggedIn = false
      this.profile = null

      // Clear all user data from other stores
      useTransactionStore().$reset()
      useGoalStore().$reset()
      useCategoryStore().$reset()
      useChatStore().$reset()
    }
  },

  persist: {
    pick: ['profile', 'isLoggedIn']
  }
})
