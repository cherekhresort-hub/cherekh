import type { OtherChargeKind } from '../../utils/bookings'
import { dayInRange, type DateRange } from './dates'

/**
 * Minimal booking shape used by finance reporting. Built from bookings by
 * `toRevenueBookings` (revenueAdapter.ts) so these functions stay pure.
 */
export interface RevenueCashMove {
  amount: number
  isRefund: boolean
  /** Asia/Dhaka calendar day */
  day: string
  method?: string
}

export interface RevenueBooking {
  id: string
  status: 'pending' | 'confirmed' | 'checked-out' | 'cancelled'
  /** Asia/Dhaka day the booking was created */
  createdDay: string
  checkIn: string
  checkOut: string
  /** Days the booking earns revenue on (stay nights, or event days for conference-only). */
  revenueDays: string[]
  /** Guest rooms (excludes the conference hall) occupied on each revenue day. */
  guestRooms: number
  /** Booking value after discount, including extras. */
  total: number
  roomNet: number
  food: number
  other: number
  /** Non-food extras broken down by analytics kind. */
  otherByKind: Partial<Record<OtherChargeKind, number>>
  cash: RevenueCashMove[]
}

/** Only stays that happened (or are confirmed to happen) earn revenue. */
export const EARNING_STATUSES: RevenueBooking['status'][] = ['confirmed', 'checked-out']

export const earnsRevenue = (booking: Pick<RevenueBooking, 'status'>): boolean =>
  EARNING_STATUSES.includes(booking.status)

export interface RevenueEarned {
  total: number
  rooms: number
  food: number
  other: number
  otherByKind: Partial<Record<OtherChargeKind, number>>
  roomNights: number
}

const EMPTY_EARNED: RevenueEarned = {
  total: 0,
  rooms: 0,
  food: 0,
  other: 0,
  otherByKind: {},
  roomNights: 0,
}

const scaleOtherByKind = (
  kinds: Partial<Record<OtherChargeKind, number>> | undefined,
  share: number
): Partial<Record<OtherChargeKind, number>> => {
  const out: Partial<Record<OtherChargeKind, number>> = {}
  for (const [key, value] of Object.entries(kinds ?? {})) {
    if (!value) continue
    out[key as OtherChargeKind] = value * share
  }
  return out
}

const mergeOtherByKind = (
  a: Partial<Record<OtherChargeKind, number>>,
  b: Partial<Record<OtherChargeKind, number>>
): Partial<Record<OtherChargeKind, number>> => {
  const out: Partial<Record<OtherChargeKind, number>> = { ...a }
  for (const [key, value] of Object.entries(b)) {
    if (!value) continue
    const kind = key as OtherChargeKind
    out[kind] = (out[kind] ?? 0) + value
  }
  return out
}

/** Share of a booking earned on days that satisfy `includeDay` (value spread evenly across revenue days). */
export const earnedFor = (booking: RevenueBooking, includeDay: (day: string) => boolean): RevenueEarned => {
  if (!earnsRevenue(booking) || booking.revenueDays.length === 0) return EMPTY_EARNED
  const days = booking.revenueDays.filter(includeDay).length
  if (days === 0) return EMPTY_EARNED
  const share = days / booking.revenueDays.length
  return {
    total: booking.total * share,
    rooms: booking.roomNet * share,
    food: booking.food * share,
    other: booking.other * share,
    otherByKind: scaleOtherByKind(booking.otherByKind, share),
    roomNights: booking.guestRooms * days,
  }
}

const addEarned = (a: RevenueEarned, b: RevenueEarned): RevenueEarned => ({
  total: a.total + b.total,
  rooms: a.rooms + b.rooms,
  food: a.food + b.food,
  other: a.other + b.other,
  otherByKind: mergeOtherByKind(a.otherByKind, b.otherByKind),
  roomNights: a.roomNights + b.roomNights,
})

/** Accrual revenue: booking value spread across its stay nights that fall in the range. */
export const revenueEarned = (bookings: RevenueBooking[], range: DateRange | null): RevenueEarned =>
  bookings.reduce((acc, b) => addEarned(acc, earnedFor(b, (day) => dayInRange(day, range))), EMPTY_EARNED)

/** Per-day earned revenue (rounded later by the caller). */
export const earnedByDay = (bookings: RevenueBooking[], days: string[]): Map<string, RevenueEarned> => {
  const map = new Map<string, RevenueEarned>(days.map((d) => [d, { ...EMPTY_EARNED, otherByKind: {} }]))
  bookings.forEach((b) => {
    if (!earnsRevenue(b) || b.revenueDays.length === 0) return
    const perDay = 1 / b.revenueDays.length
    b.revenueDays.forEach((day) => {
      const row = map.get(day)
      if (!row) return
      row.total += b.total * perDay
      row.rooms += b.roomNet * perDay
      row.food += b.food * perDay
      row.other += b.other * perDay
      row.otherByKind = mergeOtherByKind(row.otherByKind, scaleOtherByKind(b.otherByKind, perDay))
      row.roomNights += b.guestRooms
    })
  })
  return map
}

export interface CashReceived {
  received: number
  refunded: number
  net: number
  byMethod: Record<string, { received: number; refunded: number }>
}

/** Cash basis: guest payments and refunds dated in the range (all statuses — money moved regardless). */
export const cashReceived = (bookings: RevenueBooking[], range: DateRange | null): CashReceived => {
  const out: CashReceived = { received: 0, refunded: 0, net: 0, byMethod: {} }
  bookings.forEach((b) =>
    b.cash.forEach((move) => {
      if (!dayInRange(move.day, range)) return
      const key = move.method ?? 'unspecified'
      const bucket = (out.byMethod[key] ??= { received: 0, refunded: 0 })
      if (move.isRefund) {
        out.refunded += move.amount
        bucket.refunded += move.amount
      } else {
        out.received += move.amount
        bucket.received += move.amount
      }
    })
  )
  out.net = out.received - out.refunded
  return out
}

export interface GuestBalances {
  /** Earned but not yet paid (stays that happened, money still owed). */
  receivables: number
  /** Paid before being earned (advances for future nights). Liability, not revenue. */
  advances: number
  /** Net cash kept on cancelled bookings (not revenue until classified). */
  cancelledRetained: number
}

export const guestBalancesAsOf = (bookings: RevenueBooking[], asOf: string): GuestBalances => {
  const out: GuestBalances = { receivables: 0, advances: 0, cancelledRetained: 0 }
  bookings.forEach((b) => {
    const net = b.cash.reduce((sum, m) => (m.day <= asOf ? sum + (m.isRefund ? -m.amount : m.amount) : sum), 0)
    if (b.status === 'cancelled') {
      if (net > 0) out.cancelledRetained += net
      return
    }
    const earned = earnedFor(b, (day) => day <= asOf).total
    const diff = earned - net
    if (diff > 0.5) out.receivables += diff
    else if (diff < -0.5) out.advances += -diff
  })
  return out
}
