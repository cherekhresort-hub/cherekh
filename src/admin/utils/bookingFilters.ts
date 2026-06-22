import type { Booking } from '../../utils/bookings'
import { computeBookingFinancials } from '../../utils/bookings'
import { getBookingEventDates, bookingIncludesConference } from '../../utils/bookingHelpers'
import { addDaysToDateString } from '../../utils/dates'
import { toISODate } from './date'

export type DatePreset =
  | 'all'
  | 'arrivals-today'
  | 'departures-today'
  | 'in-house'
  | 'upcoming'
  | 'this-week'
  | 'custom'

export type DateRangeMode = 'stay-overlaps' | 'check-in' | 'booked-on'

export type PaymentFilter = 'all' | 'paid' | 'partial' | 'pending' | 'outstanding' | 'refunded'

export interface BookingFilterState {
  datePreset: DatePreset
  dateFrom: string
  dateTo: string
  dateMode: DateRangeMode
  paymentFilter: PaymentFilter
}

export const defaultBookingFilters = (): BookingFilterState => ({
  datePreset: 'all',
  dateFrom: '',
  dateTo: '',
  dateMode: 'stay-overlaps',
  paymentFilter: 'all',
})

export const hasActiveBookingFilters = (
  filters: BookingFilterState,
  search = ''
): boolean =>
  filters.datePreset !== 'all' ||
  filters.paymentFilter !== 'all' ||
  Boolean(search.trim())

const isoDatePart = (iso: string | undefined): string => {
  if (!iso) return ''
  return iso.slice(0, 10)
}

const weekBounds = (today: string): { from: string; to: string } => {
  const date = new Date(`${today}T12:00:00`)
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { from: toISODate(monday), to: toISODate(sunday) }
}

/** Stay touches any night/day in [from, to] (inclusive calendar dates). */
export const bookingStayOverlapsRange = (
  booking: Booking,
  from: string,
  to: string
): boolean => {
  if (!from || !to || to < from) return true

  const eventDates = getBookingEventDates(booking)
  if (bookingIncludesConference(booking) && eventDates.length > 0) {
    return eventDates.some((d) => d >= from && d <= to)
  }

  const rangeEndExclusive = addDaysToDateString(to, 1)
  return booking.checkIn < rangeEndExclusive && booking.checkOut > from
}

export const bookingCheckInInRange = (booking: Booking, from: string, to: string): boolean => {
  if (!from || !to || to < from) return true

  const eventDates = getBookingEventDates(booking)
  const checkIn =
    bookingIncludesConference(booking) && eventDates.length > 0
      ? eventDates[0]
      : booking.checkIn

  return checkIn >= from && checkIn <= to
}

export const bookingBookedInRange = (booking: Booking, from: string, to: string): boolean => {
  if (!from || !to || to < from) return true
  const booked = isoDatePart(booking.createdAt)
  if (!booked) return false
  return booked >= from && booked <= to
}

const matchesCustomDateRange = (booking: Booking, filters: BookingFilterState): boolean => {
  const { dateFrom, dateTo, dateMode } = filters
  if (!dateFrom && !dateTo) return true

  const from = dateFrom || dateTo
  const to = dateTo || dateFrom
  if (to < from) return false

  if (dateMode === 'check-in') return bookingCheckInInRange(booking, from, to)
  if (dateMode === 'booked-on') return bookingBookedInRange(booking, from, to)
  return bookingStayOverlapsRange(booking, from, to)
}

const isActiveStayStatus = (status: Booking['status']): boolean =>
  status === 'pending' || status === 'confirmed'

export const matchesDatePreset = (
  booking: Booking,
  preset: DatePreset,
  today: string = toISODate()
): boolean => {
  if (preset === 'all') return true
  if (preset === 'custom') return true

  const eventDates = getBookingEventDates(booking)
  const hasEventDates = bookingIncludesConference(booking) && eventDates.length > 0

  switch (preset) {
    case 'arrivals-today':
      if (booking.status === 'cancelled') return false
      if (hasEventDates) return eventDates.includes(today)
      return booking.checkIn === today

    case 'departures-today':
      if (booking.status === 'cancelled') return false
      if (hasEventDates) return eventDates.includes(today)
      return booking.checkOut === today

    case 'in-house':
      if (!isActiveStayStatus(booking.status)) return false
      if (hasEventDates) return eventDates.includes(today)
      return booking.checkIn <= today && booking.checkOut > today

    case 'upcoming':
      if (booking.status === 'cancelled' || booking.status === 'checked-out') return false
      if (hasEventDates) return eventDates.some((d) => d > today)
      return booking.checkIn > today

    case 'this-week': {
      const { from, to } = weekBounds(today)
      return bookingStayOverlapsRange(booking, from, to)
    }

    default:
      return true
  }
}

export const matchesPaymentFilter = (booking: Booking, filter: PaymentFilter): boolean => {
  if (filter === 'all') return true

  const fin = computeBookingFinancials(booking)

  switch (filter) {
    case 'paid':
      return fin.status === 'paid'
    case 'partial':
      return fin.status === 'partial'
    case 'pending':
      return fin.status === 'pending'
    case 'refunded':
      return fin.status === 'refunded'
    case 'outstanding':
      return fin.outstanding > 0 && booking.status !== 'cancelled'
    default:
      return true
  }
}

export const applyBookingFilters = (
  bookings: Booking[],
  filters: BookingFilterState
): Booking[] =>
  bookings.filter((booking) => {
    if (!matchesDatePreset(booking, filters.datePreset)) return false
    if (filters.datePreset === 'custom' && !matchesCustomDateRange(booking, filters)) return false
    if (!matchesPaymentFilter(booking, filters.paymentFilter)) return false
    return true
  })
