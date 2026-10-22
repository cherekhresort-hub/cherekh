import { getSupabase } from './supabase'
import { isSupabaseConfigured } from './supabaseConfig'

export const MAX_STAFF_NAME_LENGTH = 60

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** Own display name from `user_roles`; null when unset or before migration 058. */
export const fetchMyDisplayName = async (email: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('user_roles')
    .select('display_name')
    .ilike('email', normalizeEmail(email))
    .maybeSingle()
  if (error) return null
  const name = (data as { display_name?: string | null } | null)?.display_name
  return name?.trim() || null
}

export const saveMyDisplayName = async (name: string): Promise<string | null> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('set_my_display_name', { p_name: name })
  if (error) {
    if (/set_my_display_name|function .* does not exist|schema cache/i.test(error.message)) {
      throw new Error('Names need the latest database migration (058). Ask an admin to apply it.')
    }
    if (/display_name_too_long/i.test(error.message)) {
      throw new Error(`Name must be ${MAX_STAFF_NAME_LENGTH} characters or fewer.`)
    }
    throw new Error(error.message)
  }
  return typeof data === 'string' && data.trim() ? data.trim() : null
}

/** Lower-cased email → display name for all staff with a name set. */
export const fetchStaffDirectory = async (): Promise<Map<string, string>> => {
  const names = new Map<string, string>()
  if (!isSupabaseConfigured()) return names
  const supabase = getSupabase()
  if (!supabase) return names
  const { data, error } = await supabase.rpc('staff_directory')
  if (error || !Array.isArray(data)) return names
  for (const row of data as { email?: string; display_name?: string | null }[]) {
    const name = row.display_name?.trim()
    if (row.email && name) names.set(normalizeEmail(row.email), name)
  }
  return names
}
