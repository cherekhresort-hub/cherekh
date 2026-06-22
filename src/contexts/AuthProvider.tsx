import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { setActiveStaffRole } from '../lib/permissions'
import {
  fetchStaffRoleByEmail,
  roleCanDelete,
  roleCanEditPricing,
  roleCanManageTeam,
  roleIsAdmin,
  roleLabel,
  type StaffRole,
} from '../lib/roles'
import { isSupabaseConfigured, isAuthRoute } from '../lib/supabaseConfig'
import { getSupabase } from '../lib/supabase'
import { isLegacyAuthEnabled } from '../lib/legacyAuth'
import {
  isLegacyAuthenticated,
  legacyLogin,
  legacyLogout,
} from '../utils/auth'

type AuthContextValue = {
  user: User | null
  session: Session | null
  role: StaffRole | null
  roleLabel: string
  canDelete: boolean
  canEditPricing: boolean
  isAdmin: boolean
  canManageTeam: boolean
  loading: boolean
  isAuthenticated: boolean
  usesSupabase: boolean
  signIn: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const usesSupabase = isSupabaseConfigured()
  const legacyAuthEnabled = isLegacyAuthEnabled()
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<StaffRole | null>(null)
  const [legacyAuth, setLegacyAuth] = useState(false)
  const [loading, setLoading] = useState(() => isAuthRoute() && usesSupabase)

  const applyRole = useCallback((nextRole: StaffRole | null) => {
    setRole(nextRole)
    setActiveStaffRole(nextRole)
  }, [])

  const resolveRoleForSession = useCallback(
    async (nextSession: Session | null) => {
      if (!usesSupabase) {
        applyRole(legacyAuth ? 'admin' : null)
        return
      }

      const email = nextSession?.user?.email
      if (!email) {
        applyRole(null)
        return
      }

      const resolved = await fetchStaffRoleByEmail(email)
      applyRole(resolved)
    },
    [usesSupabase, legacyAuth, applyRole]
  )

  useEffect(() => {
    if (!isAuthRoute()) {
      setLoading(false)
      return
    }

    if (!usesSupabase) {
      if (!legacyAuthEnabled) {
        applyRole(null)
        setLegacyAuth(false)
        setLoading(false)
        return
      }
      const authed = isLegacyAuthenticated()
      setLegacyAuth(authed)
      applyRole(authed ? 'admin' : null)
      setLoading(false)
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void (async () => {
      const supabase = getSupabase()
      if (cancelled) return
      if (!supabase) {
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      setSession(data.session)
      await resolveRoleForSession(data.session)
      setLoading(false)

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession)
        void resolveRoleForSession(nextSession).then(() => setLoading(false))
      })
      unsubscribe = () => subscription.unsubscribe()
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [usesSupabase, legacyAuthEnabled, resolveRoleForSession, applyRole])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase()

      if (usesSupabase) {
        const supabase = getSupabase()
        if (!supabase) return { error: 'Supabase is not configured.' }

        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (error) return { error: error.message }

        // Role lookup requires an authenticated session (RLS on user_roles).
        const allowedRole = await fetchStaffRoleByEmail(normalizedEmail)
        if (!allowedRole) {
          await supabase.auth.signOut()
          return {
            error:
              'This email is not authorized for the admin panel. Contact an administrator.',
          }
        }

        applyRole(allowedRole)
        return {}
      }

      if (!legacyAuthEnabled) {
        return {
          error:
            'Admin login requires Supabase. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        }
      }

      const ok = legacyLogin(email, password)
      if (!ok) return { error: 'Invalid email or password.' }
      setLegacyAuth(true)
      applyRole('admin')
      return {}
    },
    [usesSupabase, legacyAuthEnabled, applyRole]
  )

  const signOut = useCallback(async () => {
    if (usesSupabase) {
      const supabase = getSupabase()
      if (supabase) await supabase.auth.signOut()
      setSession(null)
      applyRole(null)
      return
    }
    legacyLogout()
    setLegacyAuth(false)
    applyRole(null)
  }, [usesSupabase, applyRole])

  const isAuthenticated = usesSupabase
    ? Boolean(session && role)
    : legacyAuthEnabled && legacyAuth
  const canDelete = roleCanDelete(role)
  const canEditPricing = roleCanEditPricing(role)
  const isAdmin = roleIsAdmin(role)
  const canManageTeam = roleCanManageTeam(role)

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      role,
      roleLabel: roleLabel(role),
      canDelete,
      canEditPricing,
      isAdmin,
      canManageTeam,
      loading,
      isAuthenticated,
      usesSupabase,
      signIn,
      signOut,
    }),
    [
      session,
      role,
      canDelete,
      canEditPricing,
      isAdmin,
      canManageTeam,
      loading,
      isAuthenticated,
      usesSupabase,
      signIn,
      signOut,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
