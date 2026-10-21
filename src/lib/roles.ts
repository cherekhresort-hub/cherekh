import { getSupabase, isSupabaseConfigured } from './supabase'
import type { Booking } from '../utils/bookings'

export type StaffRole = 'admin' | 'manager' | 'booking_officer'

const STAFF_ROLES: StaffRole[] = ['admin', 'manager', 'booking_officer']

const normalizeEmail = (email: string): string => email.trim().toLowerCase()

export type StaffRoleLookup =
  | { ok: true; role: StaffRole | null }
  | { ok: false; error: string }

/** `ok: false` means the lookup itself failed (network, timeout), not that the email has no role. */
export const lookupStaffRoleByEmail = async (email: string): Promise<StaffRoleLookup> => {
  if (!isSupabaseConfigured()) return { ok: true, role: 'admin' }

  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .ilike('email', normalizeEmail(email))
    .maybeSingle()

  if (error) {
    console.error('[Supabase] fetch role:', error.message)
    return { ok: false, error: error.message }
  }

  const role = data?.role
  if (role && STAFF_ROLES.includes(role as StaffRole)) return { ok: true, role: role as StaffRole }
  return { ok: true, role: null }
}

export const fetchStaffRoleByEmail = async (email: string): Promise<StaffRole | null> => {
  const result = await lookupStaffRoleByEmail(email)
  return result.ok ? result.role : null
}

export const roleCanDelete = (role: StaffRole | null): boolean => role === 'admin'

export const roleCanEditPricing = (role: StaffRole | null): boolean => role === 'admin'

export const roleIsAdmin = (role: StaffRole | null): boolean => role === 'admin'

export const roleCanManageTeam = (role: StaffRole | null): boolean => role === 'admin'

/** Booking officers may only change bookings they created; the database enforces the same rule. */
export const roleCanModifyBooking = (
  role: StaffRole | null,
  email: string | null | undefined,
  booking: Pick<Booking, 'bookedBy'>
): boolean => {
  if (role === 'admin' || role === 'manager') return true
  if (role !== 'booking_officer' || !email) return false
  const creator = booking.bookedBy
  return creator?.type === 'staff' && creator.email.toLowerCase() === email.trim().toLowerCase()
}

export const roleCanManageBills = (role: StaffRole | null): boolean =>
  role === 'admin' || role === 'manager'

export const roleLabel = (role: StaffRole | null): string => {
  if (role === 'admin') return 'Admin'
  if (role === 'manager') return 'Manager'
  if (role === 'booking_officer') return 'Booking officer'
  return 'Staff'
}

export const roleDescription = (role: StaffRole): string => {
  if (role === 'admin') return 'Full access including team management and deletions'
  if (role === 'manager') return 'All sections except team access, settings, and booking deletions'
  return 'Dashboard, bookings and rooms only; edits only own bookings, no bills'
}

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'booking_officer', label: 'Booking officer' },
]
