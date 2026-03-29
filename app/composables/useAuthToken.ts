export async function getAuthToken(): Promise<string | null> {
  try {
    const config = useRuntimeConfig()
    if (!config.public.supabaseUrl) return null

    const supabase = useSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    // Proactively refresh if within 60s of expiry to avoid sending a stale JWT
    const expiresAt = session.expires_at ?? 0
    if (Date.now() / 1000 > expiresAt - 60) {
      const { data } = await supabase.auth.refreshSession()
      return data.session?.access_token ?? null
    }

    return session.access_token
  } catch {
    return null
  }
}
