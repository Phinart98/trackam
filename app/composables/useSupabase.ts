import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export const useSupabase = (): SupabaseClient => {
  if (client) return client

  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const key = config.public.supabaseAnonKey as string

  if (!url || !key) {
    throw new Error('Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    }
  })

  return client
}
