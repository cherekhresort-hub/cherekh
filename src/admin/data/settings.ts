import { SITE_HOST } from '../../data/siteConfig'
import {
  getCachedSiteSettings,
  notifySiteSettingsChanged,
  upsertSiteSettings,
} from '../../lib/siteSettingsDb'
import { notifyAdminOfManagerAction } from '../../lib/adminNotifications'
import type { ResortSettings } from '../types'

const STORAGE_KEY = 'cherekh_admin_settings'

export const defaultResortSettings: ResortSettings = {
  resortName: 'Cherekh Center',
  tagline: 'Experience peace in the hills of Thanchi, Bandarban',
  address: 'Cherekh Center, Thanchi, Bandarban, Bangladesh.',
  phone: '+880 1601 719735',
  email: 'cherekhcenter@gmail.com',
  website: SITE_HOST,
  checkInTime: '14:00',
  checkOutTime: '11:00',
}

export const getResortSettings = (): ResortSettings => {
  const cached = getCachedSiteSettings()
  if (cached) return { ...defaultResortSettings, ...cached }

  if (typeof window === 'undefined') return defaultResortSettings
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultResortSettings
    return { ...defaultResortSettings, ...JSON.parse(stored) }
  } catch {
    return defaultResortSettings
  }
}

export const saveResortSettings = async (settings: ResortSettings): Promise<boolean> => {
  const prev = getResortSettings()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

  const saved = await upsertSiteSettings(settings)
  notifySiteSettingsChanged()

  void notifyAdminOfManagerAction({
    category: 'system',
    action: 'settings.updated',
    title: 'Stay settings updated',
    message: `Settings saved for ${settings.resortName}${
      prev.checkInTime !== settings.checkInTime || prev.checkOutTime !== settings.checkOutTime
        ? ' (check-in/out times changed)'
        : ''
    }`,
  })

  return saved
}
