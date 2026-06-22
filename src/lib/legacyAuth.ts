import { isSupabaseConfigured } from './supabase'

/**
 * Legacy localStorage admin login (admin/admin123) is allowed only in local dev
 * when Supabase is not configured. Never enabled in production builds.
 */
export const isLegacyAuthEnabled = (): boolean =>
  import.meta.env.DEV && !isSupabaseConfigured()
