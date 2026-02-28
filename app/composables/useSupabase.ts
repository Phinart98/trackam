import { createClient } from '@supabase/supabase-js'

let supabaseInstance: ReturnType<typeof createClient> | null = null

export const useSupabase = () => {
  if (!supabaseInstance) {
    const config = useRuntimeConfig()
    supabaseInstance = createClient(
      config.public.supabaseUrl as string,
      config.public.supabaseAnonKey as string
    )
  }
  return supabaseInstance
}
