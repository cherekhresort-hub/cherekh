import {
  computeBookingFinancials,
  getBookingRooms,
  type Booking,
} from '../../utils/bookings'
import { getResortSettings } from '../data/settings'
import { formatShortDate } from './date'
import { formatBDT } from './format'
import {
  bookingIsConferenceOnly,
  formatEventDatesDisplay,
  getBookingDurationCount,
  getBookingEventDates,
} from '../../utils/bookingHelpers'
import { formatBookingId } from '../../utils/bookingId'

/** Strip all non-digit characters; useful for `tel:` and `https://wa.me/` URLs. */
export const sanitizePhone = (phone: string): string => phone.replace(/\D+/g, '')

export const telHref = (phone: string): string => `tel:${phone.trim()}`

export const whatsappHref = (phone: string, body: string): string => {
  const cleaned = sanitizePhone(phone)
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(body)}`
}

export interface BookingMessageBundle {
  whatsappBody: string
  summary: string
}

export const buildBookingMessages = (booking: Booking): BookingMessageBundle => {
  const settings = getResortSettings()
  const rooms = getBookingRooms(booking)
  const fin = computeBookingFinancials(booking)
  const isConferenceOnly = bookingIsConferenceOnly(booking)
  const nights = getBookingDurationCount(booking)
  const bookingId = formatBookingId(booking.id)
  const roomNames = rooms.map((r) => r.roomName).join(', ') || booking.roomName
  const stayLine = isConferenceOnly
    ? `Event dates: ${formatEventDatesDisplay(getBookingEventDates(booking))} (${nights} event day${nights === 1 ? '' : 's'})`
    : `Stay: ${formatShortDate(booking.checkIn)} → ${formatShortDate(booking.checkOut)} (${nights} night${nights === 1 ? '' : 's'})`

  const summary = [
    `${settings.resortName} — Booking #${bookingId}`,
    `Guest: ${booking.name}`,
    stayLine,
    `Rooms: ${roomNames}`,
    `Guests: ${booking.totalGuests}`,
    fin.total > 0 ? `Total: ${formatBDT(fin.total)}` : null,
    fin.outstanding > 0 ? `Outstanding: ${formatBDT(fin.outstanding)}` : null,
    `Status: ${booking.status}`,
  ]
    .filter(Boolean)
    .join('\n')

  const whatsappBody = `Hello ${booking.name},\n\nHere are your booking details with ${settings.resortName}:\n\n${summary}\n\nLet us know if you need anything before your stay!`

  return { whatsappBody, summary }
}
