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
          const userEmail = session.user.email || ''
          const fallback = {
            name: (meta.name as string) || userEmail.split('@')[0] || 'User',
            email: userEmail
          }
          // Read onboarded from Supabase user_metadata — available immediately, no backend call needed.
          // This is set by saveOnboardedFlag() when the user completes onboarding.
          const metaOnboarded = meta.onboarded === true
          this.profile = {
            ...fallback,
            currency: 'GHS',
            businessType: '',
            onboarded: metaOnboarded
          }

          // Start transaction fetch NOW, concurrent with the profile fetch below.
          // On session resume (page reload), this runs at the same time as the 5s profile fetch
          // so data is ready by the time the app mounts. Loading guard prevents duplicates.
          const apiBase = useRuntimeConfig().public.apiBaseUrl as string | undefined
          if (apiBase) useTransactionStore().fetchFromApi(apiBase)

          // Blocking fetch with 5s timeout to load full profile (currency, businessType, etc.)
          // onboarded routing is already correct from metadata above
          // (apiBase already declared above)
          if (apiBase) {
            try {
              const token = await getAuthToken()
              if (token) {
                const timeout = new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('timeout')), 5000)
                )
                const server = await Promise.race([
                  $fetch<Record<string, unknown>>(`${apiBase}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                  }),
                  timeout
                ])
                if (server) {
                  this.profile = mapServerProfile(server, fallback)
                  // Backfill: if backend says onboarded but metadata doesn't have the flag yet
                  // (users who onboarded before saveOnboardedFlag() was added), write it now.
                  // After this runs once, all future sessions use metadata — no backend needed.
                  if (this.profile.onboarded && !metaOnboarded) {
                    this.saveOnboardedFlag().catch(() => {})
                  }
                }
              }
            } catch {
              // Backend unreachable or cold-start timeout.
              // A user in this path has a valid Supabase session but no Pinia profile —
              // they're a returning user on a new device or cleared localStorage.
              // New users always have a Pinia profile set by signUp(), so they never reach here.
              // Only default to true if Supabase metadata confirms they completed onboarding.
              // New users who hit a cold-start timeout would otherwise skip onboarding entirely.
              if (this.profile && metaOnboarded) this.profile.onboarded = true
            }
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
              onboarded: meta.onboarded === true
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
      const userEmail = user?.email || email
      // For returning users, Pinia persist already has the correct profile in
      // localStorage (including onboarded:true). Use it as the cold-start fallback.
      // Also check Supabase user_metadata.onboarded — set by saveOnboardedFlag() on completion.
      const persisted = this.profile?.email === userEmail ? this.profile : null
      const fallback: UserProfile = {
        name: (meta.name as string) || email.split('@')[0] || 'User',
        email: userEmail,
        currency: persisted?.currency || 'GHS',
        businessType: persisted?.businessType || '',
        onboarded: (meta.onboarded === true) || (persisted?.onboarded ?? false)
      }

      const apiBase = useRuntimeConfig().public.apiBaseUrl as string | undefined
      // Start transaction fetch NOW, concurrent with the profile fetch below.
      // The layout watch also calls fetchFromApi after mount, but the loading guard makes it a no-op.
      if (apiBase) useTransactionStore().fetchFromApi(apiBase)
      if (apiBase) {
        try {
          const token = await getAuthToken()
          const timeout = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          )
          const server = await Promise.race([
            $fetch<Record<string, unknown>>(`${apiBase}/api/profile`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {}
            }),
            timeout
          ])
          this.profile = mapServerProfile(server, { name: fallback.name, email: fallback.email })
          // Backfill metadata for users who onboarded before saveOnboardedFlag() was added
          if (this.profile.onboarded && meta.onboarded !== true) {
            this.saveOnboardedFlag().catch(() => {})
          }
        } catch {
          // Cold start timeout — fall back to fallback (onboarded already correct from metadata + persisted)
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

    /**
     * Write onboarded:true into Supabase user_metadata so it survives cleared localStorage.
     * Called alongside saveProfile() when the user completes onboarding.
     */
    async saveOnboardedFlag() {
      if (!this.useRealAuth) return
      try {
        const supabase = useSupabase()
        await supabase.auth.updateUser({ data: { onboarded: true } })
      } catch {
        // Non-critical — onboarded is also stored in the backend profile
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
