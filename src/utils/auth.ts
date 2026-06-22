import { isLegacyAuthEnabled } from '../lib/legacyAuth'

const AUTH_STORAGE_KEY = 'cherekh_admin_auth'
const DEFAULT_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'admin123'

export interface AuthUser {
  username: string
  isAuthenticated: boolean
}

/** Local-only fallback when Supabase env vars are missing (never in production). */
export const legacyLogin = (username: string, password: string): boolean => {
  if (!isLegacyAuthEnabled()) return false

  if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
    const authData = {
      username,
      isAuthenticated: true,
      loginTime: new Date().toISOString(),
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
    return true
  }
  return false
}

export const legacyLogout = (): void => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const isLegacyAuthenticated = (): boolean => {
  if (!isLegacyAuthEnabled()) return false
  if (typeof window === 'undefined') return false

  const authData = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!authData) return false

  try {
    const parsed = JSON.parse(authData)
    if (parsed.loginTime) {
      const loginTime = new Date(parsed.loginTime)
      const now = new Date()
      const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60)
      if (hoursDiff > 24) {
        legacyLogout()
        return false
      }
    }
    return parsed.isAuthenticated === true
  } catch {
    return false
  }
}

export const getCurrentUser = (): AuthUser | null => {
  if (!isLegacyAuthEnabled()) return null
  if (typeof window === 'undefined') return null

  const authData = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!authData) return null

  try {
    const parsed = JSON.parse(authData)
    return {
      username: parsed.username || '',
      isAuthenticated: parsed.isAuthenticated === true,
    }
  } catch {
    return null
  }
}

/** @deprecated Use `useAuth()` from AuthProvider instead. */
export const login = legacyLogin
/** @deprecated Use `useAuth().signOut` instead. */
export const logout = legacyLogout
/** @deprecated Use `useAuth().isAuthenticated` instead. */
export const isAuthenticated = isLegacyAuthenticated
