import type { ResortSettings } from '../admin/types'
import { getSupabase, isSupabaseConfigured } from './supabase'

const CACHE_KEY = 'cherekh_site_settings_cache'
export const SITE_SETTINGS_CHANGED_EVENT = 'site-settings-changed'

const SETTINGS_ROW_ID = 'default'

type SiteSettingsRow = {
  id: string
  resort_name: string
  tagline: string
  address: string
  phone: string
  email: string
  website: string
  check_in_time: string
  check_out_time: string
  updated_at: string
}

let memoryCache: ResortSettings | null = null

const rowToSettings = (row: SiteSettingsRow): ResortSettings => ({
  resortName: row.resort_name,
  tagline: row.tagline,
  address: row.address,
  phone: row.phone,
  email: row.email,
  website: row.website,
  checkInTime: row.check_in_time,
  checkOutTime: row.check_out_time,
})

const settingsToRow = (settings: ResortSettings): Omit<SiteSettingsRow, 'updated_at'> => ({
  id: SETTINGS_ROW_ID,
  resort_name: settings.resortName.trim(),
  tagline: settings.tagline.trim(),
  address: settings.address.trim(),
  phone: settings.phone.trim(),
  email: settings.email.trim(),
  website: settings.website.trim(),
  check_in_time: settings.checkInTime,
  check_out_time: settings.checkOutTime,
})

const readLocalCache = (): ResortSettings | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as ResortSettings) : null
  } catch {
    return null
  }
}

const writeLocalCache = (settings: ResortSettings): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CACHE_KEY, JSON.stringify(settings))
}

export const getCachedSiteSettings = (): ResortSettings | null => memoryCache

export const notifySiteSettingsChanged = (): void => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SITE_SETTINGS_CHANGED_EVENT))
}

/** Load published settings from Supabase (or local cache when offline). */
export const loadSiteSettings = async (): Promise<ResortSettings | null> => {
  if (!isSupabaseConfigured()) {
    memoryCache = readLocalCache()
    return memoryCache
  }

  const supabase = getSupabase()
  if (!supabase) {
    memoryCache = readLocalCache()
    return memoryCache
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle()

  if (error) {
    console.error('[Supabase] fetch site_settings:', error.message)
    memoryCache = readLocalCache()
    return memoryCache
  }

  if (!data) {
    memoryCache = readLocalCache()
    return memoryCache
  }

  const settings = rowToSettings(data as SiteSettingsRow)
  memoryCache = settings
  writeLocalCache(settings)
  return settings
}

/** Persist settings for all website visitors (admin only; RLS enforced). */
export const upsertSiteSettings = async (settings: ResortSettings): Promise<boolean> => {
  memoryCache = settings
  writeLocalCache(settings)

  if (!isSupabaseConfigured()) return true

  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase.from('site_settings').upsert(
    {
      ...settingsToRow(settings),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[Supabase] upsert site_settings:', error.message)
    return false
  }

  return true
}
