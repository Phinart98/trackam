import type { UserProfile } from '~/types'
import { getAuthToken } from '~/composables/useAuthToken'

/** Maps the backend BusinessProfile response to the frontend UserProfile shape. */
function mapServerProfile(
  server: Record<string, unknown>,
  fallback: { name: string, email: string }
): UserProfile {
  return {
    name: (server.ownerName as string) || fallback.name,
    email: fallback.email,
    currency: (server.currency as string) || 'GHS',
    businessType: (server.businessType as string) || '',
    monthlyBudget: server.monthlyBudget as number | undefined,
    onboarded: server.onboarded === true
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    profile: null as UserProfile | null,
    isLoggedIn: false,
    authError: null as string | null,
    _listenerAttached: false,
    _unsubscribeAuth: null as (() => void) | null
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

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        this.isLoggedIn = true
        if (!this.profile) {
          const meta = session.user.user_metadata ?? {}
          const fallback = {
            name: (meta.name as string) || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || ''
          }
          // Set immediate fallback profile so the UI isn't blocked
          this.profile = { ...fallback, currency: 'GHS', businessType: '', onboarded: false }

          // Fetch real profile from backend in background (non-blocking)
          const apiBase = useRuntimeConfig().public.apiBaseUrl as string | undefined
          if (apiBase) {
            getAuthToken().then((token) => {
              if (!token) return
              $fetch<Record<string, unknown>>(`${apiBase}/api/profile`, {
                headers: { Authorization: `Bearer ${token}` }
              }).then((server) => {
                if (server && this.profile) {
                  this.profile = mapServerProfile(server, fallback)
                }
              }).catch(() => { /* backend unreachable — keep fallback */ })
            })
          }
        }
      } else {
        this.isLoggedIn = false
        this.profile = null
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          this.isLoggedIn = true
          // If no profile yet (e.g. arriving via email confirmation link before
          // login() is called), set a fallback so the app isn't stuck in limbo.
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

      const meta = user?.user_metadata ?? {}
      const fallback: UserProfile = {
        name: (meta.name as string) || email.split('@')[0] || 'User',
        email: user?.email || email,
        currency: 'GHS',
        businessType: '',
        onboarded: false
      }

      const apiBase = useRuntimeConfig().public.apiBaseUrl as string | undefined
      if (apiBase) {
        try {
          const token = await getAuthToken()
          // Race the fetch against a 3-second timeout to avoid blocking on cold starts
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          )
          const server = await Promise.race([
            $fetch<Record<string, unknown>>(`${apiBase}/api/profile`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            }),
            timeout
          ])
          this.profile = mapServerProfile(server, { name: fallback.name, email: fallback.email })
        } catch {
          // Cold start timeout or network error — use metadata fallback
          this.profile = fallback
        }
      } else {
        this.profile = fallback
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
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: name || email.split('@')[0] },
          emailRedirectTo: `${window.location.origin}/login`
        }
      })

      if (error) {
        this.authError = error.message
        throw new Error(error.message)
      }

      // Supabase returns session=null when email confirmation is required.
      // Never log the user in until they've verified their email.
      if (!data.session) {
        throw Object.assign(new Error('confirm_email'), { code: 'confirm_email' })
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
          body: {
            ownerName: this.profile.name,
            businessName: this.profile.businessType,
            businessType: this.profile.businessType,
            currency: this.profile.currency,
            monthlyBudget: this.profile.monthlyBudget,
            onboarded: this.profile.onboarded
          }
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
