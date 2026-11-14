import type { Booking } from '../../utils/bookings'

export interface PreviousGuest {
  name: string
  email: string
  phone: string
  lastCheckIn: string
  stays: number
}

/** Digits only, with Bangladesh's +880 / 880 prefix folded into the local leading 0. */
export const phoneDigits = (phone: string): string => {
  const digits = phone.replace(/\D+/g, '')
  return digits.startsWith('880') ? `0${digits.slice(3)}` : digits
}

const MIN_QUERY_DIGITS = 4

/** Past guests whose phone contains the typed digits, most recent booking first. */
export const findPreviousGuests = (bookings: Booking[], query: string, limit = 5): PreviousGuest[] => {
  const needle = phoneDigits(query)
  if (needle.length < MIN_QUERY_DIGITS) return []

  const byPhone = new Map<string, { latest: Booking; stays: number }>()
  for (const booking of bookings) {
    if (booking.guestHidden || !booking.phone) continue
    const key = phoneDigits(booking.phone)
    if (!key.includes(needle)) continue
    const entry = byPhone.get(key)
    if (!entry) {
      byPhone.set(key, { latest: booking, stays: 1 })
      continue
    }
    entry.stays += 1
    if ((booking.createdAt ?? '') > (entry.latest.createdAt ?? '')) entry.latest = booking
  }

  return [...byPhone.values()]
    .sort((a, b) => (b.latest.createdAt ?? '').localeCompare(a.latest.createdAt ?? ''))
    .slice(0, limit)
    .map(({ latest, stays }) => ({
      name: latest.name,
      email: latest.email,
      phone: latest.phone,
      lastCheckIn: latest.checkIn,
      stays,
    }))
}
