import type { StaffActivityEntry } from './staffActivityLog'
import { isStaffLoginEntry } from './staffActivityLog'

const CAPITAL_ACTIONS = new Set(['owner_contribution', 'capital_withdrawal'])

export const getActivityDestination = (entry: StaffActivityEntry): string | null => {
  if (isStaffLoginEntry(entry)) return null
  switch (entry.category) {
    case 'booking':
      return entry.entityId
        ? `/admin/bookings?id=${encodeURIComponent(entry.entityId)}`
        : '/admin/bookings'
    case 'inquiry':
      return entry.entityId
        ? `/admin/inquiries?id=${encodeURIComponent(entry.entityId)}`
        : '/admin/inquiries'
    case 'guest':
      return entry.entityId
        ? `/admin/guests?id=${encodeURIComponent(entry.entityId)}`
        : '/admin/guests'
    case 'housekeeping':
      return '/admin/housekeeping'
    case 'staff':
      return entry.entityId
        ? `/admin/staff?id=${encodeURIComponent(entry.entityId)}`
        : '/admin/staff'
    case 'team':
      return '/admin/team-access'
    case 'finance':
      if (CAPITAL_ACTIONS.has(entry.action)) return '/admin/investments'
      return entry.entityId
        ? `/admin/expenses?id=${encodeURIComponent(entry.entityId)}`
        : '/admin/expenses'
    case 'settings':
    case 'system':
      return '/admin/settings'
    default:
      return '/admin/activity'
  }
}

export const getActivityDestinationLabel = (entry: StaffActivityEntry): string => {
  if (isStaffLoginEntry(entry)) return ''
  switch (entry.category) {
    case 'booking':
      return entry.entityId ? 'Open booking' : 'Go to bookings'
    case 'inquiry':
      return entry.entityId ? 'View inquiry' : 'Go to inquiries'
    case 'guest':
      return entry.entityId ? 'View guest' : 'Go to guests'
    case 'housekeeping':
      return 'Go to housekeeping'
    case 'staff':
      return entry.entityId ? 'View staff member' : 'Go to staff'
    case 'team':
      return 'Go to team access'
    case 'finance':
      if (CAPITAL_ACTIONS.has(entry.action)) return 'Go to investment'
      return entry.entityId ? 'Open expense' : 'Go to expenses'
    case 'settings':
    case 'system':
      return 'Go to settings'
    default:
      return 'View'
  }
}
