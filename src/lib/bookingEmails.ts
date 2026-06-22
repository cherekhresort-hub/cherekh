import type { Booking } from '../utils/bookings'
import { computeBookingFinancials, getBookingRooms } from '../utils/bookings'
import { formatEventDatesDisplay, getBookingDurationCount, getBookingEventDates, bookingIsConferenceOnly } from '../utils/bookingHelpers'
import { getResortContact } from '../utils/contactFromSettings'
import { siteConfig } from '../data/siteConfig'
import { normalizeEmail } from '../utils/validation'
import {
  getEmailJsConfigStatus,
  getEmailJsResortInbox,
  sendGuestBookingEmail,
  sendResortBookingEmail,
} from './emailjs'

const formatBDT = (value: number): string =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDisplayDate = (iso: string): string => {
  if (!iso) return ''
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const buildRoomsSummary = (booking: Booking): string => {
  const rooms = getBookingRooms(booking)
  if (rooms.length === 0) return booking.roomName || '—'
  return rooms
    .map((r) => {
      const guests = r.totalGuests ?? r.adults + r.children
      return `${r.roomName} (${guests} guest${guests === 1 ? '' : 's'})`
    })
    .join('; ')
}

/** Template variables — use the same keys in both EmailJS templates. */
export const buildBookingEmailParams = (booking: Booking): Record<string, string> => {
  const fin = computeBookingFinancials(booking)
  const isConferenceOnly = bookingIsConferenceOnly(booking)
  const nights = getBookingDurationCount(booking)
  const isConference = booking.roomType === 'conference'
  const emailQuery =
    booking.email?.trim() ? `&email=${encodeURIComponent(normalizeEmail(booking.email))}` : ''
  const confirmationPath = isConference
    ? `/conference-thank-you?id=${booking.id}${emailQuery}`
    : `/thank-you?id=${booking.id}${emailQuery}`

  const resortContact = getResortContact()

  return {
    guest_name: booking.name || 'Guest',
    guest_email: booking.email || '',
    guest_phone: booking.phone || '',
    booking_id: booking.id,
    check_in: isConferenceOnly
      ? formatEventDatesDisplay(getBookingEventDates(booking))
      : formatDisplayDate(booking.checkIn),
    check_out: isConferenceOnly
      ? `${nights} event day${nights === 1 ? '' : 's'}`
      : formatDisplayDate(booking.checkOut),
    nights: String(nights),
    rooms_summary: buildRoomsSummary(booking),
    adults: String(booking.adults ?? 0),
    children: String(booking.children ?? 0),
    total_guests: String(booking.totalGuests ?? 0),
    subtotal: formatBDT(fin.subtotal),
    discount: formatBDT(fin.discount),
    total: formatBDT(fin.total),
    status: booking.status,
    special_requests: booking.specialRequests?.trim() || '—',
    resort_name: 'Cherekh Center',
    resort_phone: resortContact.phoneDisplay,
    resort_email: resortContact.email,
    website_url: siteConfig.origin,
    booking_url: `${siteConfig.origin}${confirmationPath}`,
    reply_to: booking.email || resortContact.email,
  }
}

/**
 * Sends guest + resort notification emails. Never throws — booking save must succeed
 * even if EmailJS is down or misconfigured.
 */
export const sendBookingCreatedEmails = async (booking: Booking): Promise<void> => {
  const emailConfig = getEmailJsConfigStatus()
  if (!emailConfig.ok) {
    if (import.meta.env.DEV) {
      console.info(
        '[EmailJS] Skipped — set VITE_EMAILJS_USER_ID in .env.local, save the file, then restart dev server. Missing:',
        emailConfig.missing.join(', ')
      )
    }
    return
  }

  const params = buildBookingEmailParams(booking)
  const resortInbox = getEmailJsResortInbox()
  const tasks: Promise<void>[] = []

  const guestEmail = booking.email?.trim()
  if (guestEmail) {
    tasks.push(
      sendGuestBookingEmail({
        ...params,
        to_email: guestEmail,
        to_name: booking.name || 'Guest',
      })
    )
  }

  tasks.push(
    sendResortBookingEmail({
      ...params,
      to_email: resortInbox,
      to_name: 'Cherekh Center',
    })
  )

  const results = await Promise.allSettled(tasks)
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const target = index === 0 && guestEmail ? 'guest' : 'resort'
      console.error(`[EmailJS] ${target} booking email failed:`, result.reason)
    }
  })
}
