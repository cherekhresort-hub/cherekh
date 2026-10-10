import { CONFERENCE_ROOM_ID } from '../../data/roomCatalog'
import { bookingIsConferenceOnly, getBookingEventDates } from '../../utils/bookingHelpers'
import {
  computeBookingFinancials,
  getBookingCashMovements,
  getBookingRooms,
  type Booking,
} from '../../utils/bookings'
import { addDays, toBusinessDay } from './dates'
import type { RevenueBooking } from './revenue'

const stayNights = (checkIn: string, checkOut: string): string[] => {
  const days: string[] = []
  if (!checkIn || !checkOut) return days
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) days.push(d)
  return days
}

export const revenueDaysOf = (booking: Booking): string[] => {
  if (bookingIsConferenceOnly(booking)) return getBookingEventDates(booking)
  const nights = stayNights(booking.checkIn, booking.checkOut)
  // Same-day bookings still earn on their check-in day.
  return nights.length > 0 ? nights : booking.checkIn ? [booking.checkIn] : []
}

export const toRevenueBooking = (booking: Booking): RevenueBooking => {
  const fin = computeBookingFinancials(booking)
  const guestRooms = getBookingRooms(booking).filter((line) => line.roomType !== CONFERENCE_ROOM_ID).length
  return {
    id: booking.id,
    status: booking.status,
    createdDay: toBusinessDay(booking.createdAt),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    revenueDays: revenueDaysOf(booking),
    guestRooms,
    total: fin.total,
    roomNet: Math.max(0, fin.roomRent - fin.discount),
    food: fin.foodTotal,
    other: Math.max(0, fin.total - Math.max(0, fin.roomRent - fin.discount) - fin.foodTotal),
    cash: getBookingCashMovements(booking).map((move) => ({
      amount: move.amount,
      isRefund: move.isRefund,
      day: toBusinessDay(move.recordedAt),
      method: move.method,
    })),
  }
}

export const toRevenueBookings = (bookings: Booking[]): RevenueBooking[] => bookings.map(toRevenueBooking)
