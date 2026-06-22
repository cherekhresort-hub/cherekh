import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ResortSettings } from '../admin/types'
import { defaultResortSettings } from '../admin/data/settings'
import {
  loadSiteSettings,
  SITE_SETTINGS_CHANGED_EVENT,
} from '../lib/siteSettingsDb'
import { isAuthRoute } from '../lib/supabaseConfig'
import { buildResortContact, type ResortContact } from '../utils/contactFromSettings'

interface SiteSettingsContextValue {
  settings: ResortSettings
  contact: ResortContact
  refresh: () => Promise<void>
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null)

export const SiteSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ResortSettings>(defaultResortSettings)

  const refresh = async () => {
    const loaded = await loadSiteSettings()
    if (loaded) setSettings({ ...defaultResortSettings, ...loaded })
  }

  useEffect(() => {
    const onChange = () => {
      void refresh()
    }

    let timer: number | undefined
    if (isAuthRoute()) {
      void refresh()
    } else {
      timer = window.setTimeout(() => void refresh(), 8000)
    }

    window.addEventListener(SITE_SETTINGS_CHANGED_EVENT, onChange)
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      window.removeEventListener(SITE_SETTINGS_CHANGED_EVENT, onChange)
    }
  }, [])

  const value = useMemo(
    () => ({
      settings,
      contact: buildResortContact(settings),
      refresh,
    }),
    [settings]
  )

  return (
    <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>
  )
}

const useSiteSettings = (): SiteSettingsContextValue => {
  const ctx = useContext(SiteSettingsContext)
  if (!ctx) {
    return {
      settings: defaultResortSettings,
      contact: buildResortContact(defaultResortSettings),
      refresh: async () => {},
    }
  }
  return ctx
}

/** Shorthand for public pages — contact info merged with published settings. */
export const useResortContact = (): ResortContact => useSiteSettings().contact
