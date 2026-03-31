export async function getAuthToken(): Promise<string | null> {
  try {
    const config = useRuntimeConfig()
    if (!config.public.supabaseUrl) return null

    const supabase = useSupabase()
    // getSession() with autoRefreshToken:true already handles proactive refresh
    // internally via a background ticker. Do NOT call refreshSession() manually —
    // if expires_at is undefined (common right after signup), the old ?? 0 fallback
    // made it always try to refresh, returning null on any failure and cascading
    // into 401s on every API request.
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}
