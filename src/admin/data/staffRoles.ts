import { getStaff } from './staff'

import { notifyAdminOfManagerAction } from '../../lib/adminNotifications'
import { canDeleteRecords } from '../../lib/permissions'

const STORAGE_KEY = 'cherekh_staff_roles'

export const DEFAULT_STAFF_ROLES: string[] = [
  'Property Manager',
  'Assistant Manager',
  'Front Desk Lead',
  'Front Desk',
  'Receptionist',
  'Concierge',
  'Housekeeping Lead',
  'Housekeeping',
  'Laundry',
  'Head Chef',
  'Sous Chef',
  'Kitchen',
  'Waiter / Waitress',
  'Bartender',
  'Maintenance',
  'Gardener',
  'Driver',
  'Night Security',
  'Security',
]

const normalize = (role: string): string => role.trim()

const sortAlpha = (list: string[]): string[] =>
  [...list].sort((a, b) => a.localeCompare(b, 'en'))

const readCustom = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

const persistCustom = (roles: string[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(roles))
}

/**
 * The full list of role choices shown in the staff form dropdown:
 *   built-in defaults  ∪  admin-added custom roles  ∪  roles already in use
 *
 * The third union member keeps options consistent if a role was deleted from
 * the dictionary but a staff member is still tagged with it.
 */
export const getStaffRoles = (): string[] => {
  const inUse = getStaff().map((s) => s.role).filter(Boolean)
  const merged = new Set<string>()
  ;[...DEFAULT_STAFF_ROLES, ...readCustom(), ...inUse]
    .map(normalize)
    .filter(Boolean)
    .forEach((r) => {
      // Case-insensitive de-dup, but preserve the first-seen casing
      const exists = [...merged].some(
        (existing) => existing.toLowerCase() === r.toLowerCase()
      )
      if (!exists) merged.add(r)
    })
  return sortAlpha([...merged])
}

export const hasStaffRole = (role: string): boolean => {
  const target = normalize(role).toLowerCase()
  if (!target) return false
  return getStaffRoles().some((r) => r.toLowerCase() === target)
}

/**
 * Add a custom role. Returns the canonical role string (existing casing if
 * it already exists, otherwise the trimmed input). No-op if blank.
 */
export const addStaffRole = (role: string): string | null => {
  const clean = normalize(role)
  if (!clean) return null
  const existing = getStaffRoles().find((r) => r.toLowerCase() === clean.toLowerCase())
  if (existing) return existing

  const custom = readCustom()
  persistCustom([...custom, clean])
  void notifyAdminOfManagerAction({
    category: 'staff',
    action: 'staff.role_added',
    title: 'Staff role added',
    message: `New role "${clean}" is available for assignments`,
  })
  return clean
}

export const isDefaultStaffRole = (role: string): boolean => {
  const target = normalize(role).toLowerCase()
  return DEFAULT_STAFF_ROLES.some((r) => r.toLowerCase() === target)
}

export const isCustomStaffRole = (role: string): boolean => {
  const target = normalize(role).toLowerCase()
  return readCustom().some((r) => r.toLowerCase() === target)
}

export const getStaffRoleUsageCount = (role: string): number => {
  const target = normalize(role).toLowerCase()
  if (!target) return 0
  return getStaff().filter((s) => s.role.toLowerCase() === target).length
}

export type DeleteStaffRoleError = 'default' | 'in-use' | 'not-found' | 'forbidden'

export interface DeleteStaffRoleResult {
  ok: boolean
  error?: DeleteStaffRoleError
  usageCount?: number
}

/**
 * Remove a user-added role. Built-in defaults can't be deleted, and a role
 * currently assigned to one or more staff members is also protected so we
 * don't silently orphan anyone.
 */
export const deleteStaffRole = (role: string): DeleteStaffRoleResult => {
  if (!canDeleteRecords()) return { ok: false, error: 'forbidden' }

  const clean = normalize(role)
  if (!clean) return { ok: false, error: 'not-found' }

  if (isDefaultStaffRole(clean)) {
    return { ok: false, error: 'default' }
  }

  const usageCount = getStaffRoleUsageCount(clean)
  if (usageCount > 0) {
    return { ok: false, error: 'in-use', usageCount }
  }

  const custom = readCustom()
  const remaining = custom.filter((r) => r.toLowerCase() !== clean.toLowerCase())
  if (remaining.length === custom.length) {
    return { ok: false, error: 'not-found' }
  }
  persistCustom(remaining)
  return { ok: true }
}
