import type { StaffActivityEntry } from './staffActivityLog'

export const getActivityDestination = (entry: StaffActivityEntry): string => {
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
    case 'settings':
    case 'system':
      return '/admin/settings'
    default:
      return '/admin/activity'
  }
}

export const getActivityDestinationLabel = (entry: StaffActivityEntry): string => {
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
    case 'settings':
    case 'system':
      return 'Go to settings'
    default:
      return 'View'
  }
}
