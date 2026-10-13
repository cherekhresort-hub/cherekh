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
  lookupStaffRoleByEmail,
  roleCanDelete,
  roleCanEditPricing,
  roleCanManageTeam,
  roleIsAdmin,
  roleLabel,
  type StaffRole,
  type StaffRoleLookup,
} from '../lib/roles'
import { isSupabaseConfigured, isAuthRoute } from '../lib/supabaseConfig'
import { getSupabase } from '../lib/supabase'
import { logStaffLogin } from '../lib/staffActivityLog'
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

const AUTH_STEP_TIMEOUT_MS = 10_000

const withTimeout = <T,>(promise: Promise<T>, label: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error(`${label} timed out`)),
      AUTH_STEP_TIMEOUT_MS
    )
    promise.then(
      (value) => {
        window.clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timer)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    )
  })

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

      // A failed lookup keeps the current role; only a confirmed "no role" clears it.
      const lookup = await lookupStaffRoleByEmail(email)
      if (!lookup.ok) throw new Error(`Role lookup failed: ${lookup.error}`)
      applyRole(lookup.role)
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

      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 'Session check')
        if (cancelled) return
        setSession(data.session)
        await withTimeout(resolveRoleForSession(data.session), 'Role lookup')
      } catch (error) {
        console.error('[Auth] startup:', error)
        if (!cancelled) {
          setSession(null)
          applyRole(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
      if (cancelled) return

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession)
        // Supabase calls made directly inside this callback can deadlock the auth lock.
        window.setTimeout(() => {
          void withTimeout(resolveRoleForSession(nextSession), 'Role lookup')
            .catch((error: unknown) => console.error('[Auth] role refresh:', error))
            .finally(() => setLoading(false))
        }, 0)
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

        let signInError: string | undefined
        try {
          const { error } = await withTimeout(
            supabase.auth.signInWithPassword({ email: normalizedEmail, password }),
            'Sign-in'
          )
          signInError = error?.message
        } catch {
          return { error: 'Could not reach the login server. Check your connection and try again.' }
        }
        if (signInError) return { error: signInError }

        // Role lookup requires an authenticated session (RLS on user_roles).
        // Sign-outs here are local: a failed check on this device must not end sessions on others.
        let lookup: StaffRoleLookup
        try {
          lookup = await withTimeout(lookupStaffRoleByEmail(normalizedEmail), 'Role lookup')
        } catch (error) {
          lookup = { ok: false, error: error instanceof Error ? error.message : String(error) }
        }
        if (!lookup.ok) {
          await supabase.auth.signOut({ scope: 'local' })
          return {
            error: 'Signed in, but could not check your staff access. Check your connection and try again.',
          }
        }
        if (!lookup.role) {
          await supabase.auth.signOut({ scope: 'local' })
          return {
            error:
              'This email is not authorized for the admin panel. Contact an administrator.',
          }
        }

        applyRole(lookup.role)
        void logStaffLogin(normalizedEmail, lookup.role)
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
      void logStaffLogin(normalizedEmail || email.trim(), 'admin')
      return {}
    },
    [usesSupabase, legacyAuthEnabled, applyRole]
  )

  const signOut = useCallback(async () => {
    if (usesSupabase) {
      const supabase = getSupabase()
      if (supabase) await supabase.auth.signOut({ scope: 'local' })
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
