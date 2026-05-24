export async function getAuthToken(): Promise<string | null> {
  try {
    const config = useRuntimeConfig()
    if (!config.public.supabaseUrl) return null

    const supabase = useSupabase()
    // autoRefreshToken handles proactive refresh; calling refreshSession() manually
    // 401s right after signup when expires_at is undefined.
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}
