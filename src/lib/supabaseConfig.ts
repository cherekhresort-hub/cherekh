/** Env-only check — does not import @supabase/supabase-js */
export const isSupabaseConfigured = (): boolean =>
  Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() &&
      import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  )

export const isAuthRoute = (path = window.location.pathname): boolean =>
  path.startsWith('/admin') || path === '/login'
