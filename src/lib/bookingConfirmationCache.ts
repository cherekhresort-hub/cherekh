import type { Booking } from '../utils/bookings'

const storageKey = (id: string) => `cherekh_booking_confirmation_${id}`

export const cacheBookingConfirmation = (booking: Booking): void => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(storageKey(booking.id), JSON.stringify(booking))
  } catch {
    /* quota / private mode */
  }
}

export const readBookingConfirmationCache = (id: string): Booking | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(storageKey(id))
    return raw ? (JSON.parse(raw) as Booking) : null
  } catch {
    return null
  }
}
