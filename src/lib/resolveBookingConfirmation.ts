import { fetchBookingConfirmation } from './bookingsDb'
import { readBookingConfirmationCache } from './bookingConfirmationCache'
import { getBookingById, type Booking } from '../utils/bookings'
import { normalizeEmail } from '../utils/validation'
import { isSupabaseConfigured } from './supabase'

const emailMatchesBooking = (booking: Booking, email: string | null | undefined): boolean => {
  if (!email?.trim() || !booking.email?.trim()) return false
  return normalizeEmail(booking.email) === normalizeEmail(email)
}

export const resolveBookingForThankYou = async (
  id: string,
  options: {
    stateBooking?: Booking | null
    email?: string | null
  }
): Promise<Booking | null> => {
  const { stateBooking, email } = options

  if (stateBooking?.id === id) return stateBooking

  const cached = readBookingConfirmationCache(id)
  if (cached?.id === id) return cached

  const local = getBookingById(id)
  if (local?.id === id && emailMatchesBooking(local, email)) return local

  if (isSupabaseConfigured() && email?.trim()) {
    const remote = await fetchBookingConfirmation(id, email)
    if (remote) return remote
  }

  return null
}
