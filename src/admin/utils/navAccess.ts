import type { AdminNavItem } from '../data/navigation'
import type { StaffRole } from '../../lib/roles'

const MANAGER_BLOCKED_PATHS = ['/admin/team-access', '/admin/settings', '/admin/activity'] as const

const BOOKING_OFFICER_PATHS = [
  '/admin',
  '/admin/bookings',
  '/admin/rooms',
  '/admin/guests',
  '/admin/inquiries',
] as const

const BOOKING_OFFICER_PATH_SET = new Set<string>(BOOKING_OFFICER_PATHS)

const normalizePath = (path: string): string => {
  if (path === '/admin' || path === '/admin/') return '/admin'
  return path.replace(/\/$/, '')
}

export const canAccessAdminPath = (role: StaffRole | null, path: string): boolean => {
  if (!role) return false

  const normalized = normalizePath(path)

  if (role === 'admin') return true

  if (role === 'manager') {
    return !MANAGER_BLOCKED_PATHS.some(
      (blocked) => normalized === blocked || normalized.startsWith(`${blocked}/`)
    )
  }

  if (role === 'booking_officer') {
    return BOOKING_OFFICER_PATH_SET.has(normalized)
  }

  return false
}

export const filterNavItemsForRole = (
  items: AdminNavItem[],
  role: StaffRole | null
): AdminNavItem[] => items.filter((item) => canAccessAdminPath(role, item.to))

export const getMobileNavItems = (
  items: AdminNavItem[],
  role: StaffRole | null
): AdminNavItem[] => filterNavItemsForRole(items, role)
