import type { StaffActivityEntry } from './staffActivityLog'
import { isStaffLoginEntry } from './staffActivityLog'

const CAPITAL_ACTIONS = new Set(['owner_contribution', 'capital_withdrawal'])

const MENU_ACTION_PREFIX = 'menu.'

/** Element ids to highlight on the destination page (`?highlight=a,b`). */
export const HIGHLIGHT_PARAM = 'highlight'

/** Booking drawer tab to open (`/admin/bookings?id=…&tab=payment`). */
export const BOOKING_TAB_PARAM = 'tab'

export const BOOKING_DRAWER_TABS = ['overview', 'payment', 'bills', 'guests', 'notes'] as const
export type BookingDrawerTab = (typeof BOOKING_DRAWER_TABS)[number]

/** Section-level highlight targets inside the booking drawer. */
export const BOOKING_HIGHLIGHT = {
  status: 'booking-status',
  stay: 'booking-stay',
  rooms: 'booking-rooms',
  paymentSummary: 'booking-payment-summary',
  transactions: 'booking-transactions',
  bills: 'booking-bills',
  guests: 'booking-guests',
  notes: 'booking-notes',
} as const

/** Highlighted when a deep link's specific row no longer exists. */
export const BOOKING_TAB_FALLBACK: Record<BookingDrawerTab, string | undefined> = {
  overview: undefined,
  payment: BOOKING_HIGHLIGHT.transactions,
  bills: BOOKING_HIGHLIGHT.bills,
  guests: BOOKING_HIGHLIGHT.guests,
  notes: BOOKING_HIGHLIGHT.notes,
}

const metadataIds = (entry: StaffActivityEntry, key: string): string[] => {
  const value = entry.metadata?.[key]
  const list = Array.isArray(value) ? value : [value]
  return list.filter((id): id is string => typeof id === 'string' && id.length > 0)
}

type BookingFocus = { tab: BookingDrawerTab; highlight: string[]; label: string }

const bookingFocus = (entry: StaffActivityEntry): BookingFocus | null => {
  const row = (key: string, section: string) => {
    const ids = metadataIds(entry, key)
    return ids.length > 0 ? ids : [section]
  }
  switch (entry.action) {
    case 'booking.created':
      return { tab: 'overview', highlight: [], label: 'Open booking' }
    case 'booking.status':
      return { tab: 'overview', highlight: [BOOKING_HIGHLIGHT.status], label: 'View status' }
    case 'booking.updated':
      return { tab: 'overview', highlight: [BOOKING_HIGHLIGHT.stay], label: 'View reservation' }
    case 'booking.rooms_changed':
      return { tab: 'overview', highlight: [BOOKING_HIGHLIGHT.rooms], label: 'View rooms' }
    case 'booking.total_updated':
    case 'booking.discount':
    case 'booking.discount_removed':
      return { tab: 'payment', highlight: [BOOKING_HIGHLIGHT.paymentSummary], label: 'View pricing' }
    case 'booking.payment':
      return { tab: 'payment', highlight: row('transactionId', BOOKING_HIGHLIGHT.transactions), label: 'View payment' }
    case 'booking.payment_deleted':
      return { tab: 'payment', highlight: [BOOKING_HIGHLIGHT.transactions], label: 'View payments' }
    case 'booking.extra_added':
      return { tab: 'bills', highlight: row('extraIds', BOOKING_HIGHLIGHT.bills), label: 'View bill' }
    case 'booking.extra_removed':
      return { tab: 'bills', highlight: [BOOKING_HIGHLIGHT.bills], label: 'View bills' }
    case 'booking.guest_info':
      return { tab: 'guests', highlight: [BOOKING_HIGHLIGHT.guests], label: 'View guest details' }
    case 'booking.note':
      return { tab: 'notes', highlight: row('noteId', BOOKING_HIGHLIGHT.notes), label: 'View note' }
    case 'booking.note_deleted':
      return { tab: 'notes', highlight: [BOOKING_HIGHLIGHT.notes], label: 'View notes' }
    default:
      return null
  }
}

const withQuery = (path: string, params: Record<string, string | string[] | undefined>): string => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const text = Array.isArray(value) ? value.join(',') : value
    if (text) query.set(key, text)
  }
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}

const bookingDestination = (entry: StaffActivityEntry): string => {
  if (!entry.entityId || entry.action === 'booking.deleted') return '/admin/bookings'
  const focus = bookingFocus(entry)
  return withQuery('/admin/bookings', {
    id: entry.entityId,
    [BOOKING_TAB_PARAM]: focus && focus.tab !== 'overview' ? focus.tab : undefined,
    [HIGHLIGHT_PARAM]: focus?.highlight,
  })
}

const isCapitalEntry = (entry: StaffActivityEntry): boolean =>
  CAPITAL_ACTIONS.has(entry.action) ||
  (entry.action === 'ledger_reversed' && CAPITAL_ACTIONS.has(String(entry.metadata?.kind ?? '')))

const financeDestination = (entry: StaffActivityEntry): string => {
  if (isCapitalEntry(entry)) return '/admin/investments'
  if (entry.entityId) return withQuery('/admin/expenses', { id: entry.entityId })
  if (entry.action === 'transfer' || entry.action === 'adjustment' || entry.action === 'ledger_reversed') {
    return withQuery('/admin/expenses', { tab: 'settings' })
  }
  return '/admin/expenses'
}

export const getActivityDestination = (entry: StaffActivityEntry): string | null => {
  if (isStaffLoginEntry(entry)) return null
  if (entry.action.startsWith(MENU_ACTION_PREFIX)) {
    return withQuery('/admin/menu', { [HIGHLIGHT_PARAM]: metadataIds(entry, 'changedItemIds') })
  }
  switch (entry.category) {
    case 'booking':
      return bookingDestination(entry)
    case 'inquiry':
      return entry.entityId && entry.action !== 'inquiry.deleted'
        ? withQuery('/admin/inquiries', { id: entry.entityId })
        : '/admin/inquiries'
    case 'guest':
      return entry.entityId ? withQuery('/admin/guests', { id: entry.entityId }) : '/admin/guests'
    case 'housekeeping':
      return withQuery('/admin/housekeeping', { [HIGHLIGHT_PARAM]: entry.entityId ?? undefined })
    case 'staff':
      return entry.entityId ? withQuery('/admin/staff', { id: entry.entityId }) : '/admin/staff'
    case 'team':
      return withQuery('/admin/team-access', {
        [HIGHLIGHT_PARAM]: entry.action === 'team.member_deleted' ? undefined : entry.entityId ?? undefined,
      })
    case 'finance':
      return financeDestination(entry)
    case 'settings':
    case 'system':
      return '/admin/settings'
    default:
      return '/admin/activity'
  }
}

export const getActivityDestinationLabel = (entry: StaffActivityEntry): string => {
  if (isStaffLoginEntry(entry)) return ''
  if (entry.action.startsWith(MENU_ACTION_PREFIX)) {
    return metadataIds(entry, 'changedItemIds').length > 0 ? 'View changes in menu' : 'Go to menu'
  }
  switch (entry.category) {
    case 'booking':
      if (!entry.entityId || entry.action === 'booking.deleted') return 'Go to bookings'
      return bookingFocus(entry)?.label ?? 'Open booking'
    case 'inquiry':
      return entry.entityId && entry.action !== 'inquiry.deleted' ? 'View inquiry' : 'Go to inquiries'
    case 'guest':
      return entry.entityId ? 'View guest' : 'Go to guests'
    case 'housekeeping':
      return entry.entityId ? 'View room' : 'Go to housekeeping'
    case 'staff':
      return entry.entityId ? 'View staff member' : 'Go to staff'
    case 'team':
      return entry.entityId && entry.action !== 'team.member_deleted' ? 'View team member' : 'Go to team access'
    case 'finance':
      if (isCapitalEntry(entry)) return 'Go to investment'
      if (entry.entityId) return 'Open expense'
      if (entry.action === 'transfer' || entry.action === 'adjustment' || entry.action === 'ledger_reversed') {
        return 'Go to accounts'
      }
      return 'Go to expenses'
    case 'settings':
    case 'system':
      return 'Go to settings'
    default:
      return 'View'
  }
}
