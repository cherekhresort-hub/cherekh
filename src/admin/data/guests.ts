import type { Guest, GuestTag } from '../types'
import { computeBookingFinancials, getBookings, countsTowardRevenue } from '../../utils/bookings'
import { applyTagOverride, getGuestOverrides, hasOverride } from './guestOverrides'

const TAG_BY_STAYS = (stays: number): GuestTag[] => {
  const tags: GuestTag[] = []
  if (stays === 1) tags.push('new')
  if (stays >= 2) tags.push('returning')
  if (stays >= 5) tags.push('frequent')
  if (stays >= 8) tags.push('vip')
  return tags
}

const buildId = (name: string, email: string): string => {
  const seed = `${name}-${email}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `guest-${seed}`
}

interface MutableGuest extends Omit<Guest, 'tags' | 'derivedTags' | 'hasTagOverride'> {
  derivedTags: GuestTag[]
}

const finalize = (guest: MutableGuest): Guest => {
  const override = getGuestOverrides()[guest.id]
  return {
    ...guest,
    tags: applyTagOverride(guest.derivedTags, override),
    hasTagOverride: hasOverride(override),
  }
}

/**
 * Build guest profiles purely from real bookings. Loyalty tags are derived
 * from stay count and then any admin tag overrides (see `guestOverrides.ts`)
 * are merged on top so manual pins/hides are respected.
 *
 * Returns an empty list until the first booking is created.
 */
export const getGuests = (): Guest[] => {
  const bookings = getBookings()
  if (bookings.length === 0) return []

  const map = new Map<string, MutableGuest>()

  bookings.forEach((booking) => {
    if (!countsTowardRevenue(booking)) return
    const key = `${booking.name}|${booking.email}`.toLowerCase()
    const fin = computeBookingFinancials(booking)
    const existing = map.get(key)
    if (existing) {
      existing.totalStays += 1
      if (!existing.lastStay || existing.lastStay < booking.checkOut) {
        existing.lastStay = booking.checkOut
      }
      existing.totalSpent += fin.total
      existing.derivedTags = TAG_BY_STAYS(existing.totalStays)
    } else {
      map.set(key, {
        id: buildId(booking.name, booking.email),
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        totalStays: 1,
        lastStay: booking.checkOut,
        totalSpent: fin.total,
        derivedTags: TAG_BY_STAYS(1),
        notes: booking.specialRequests || undefined,
      })
    }
  })

  return [...map.values()].map(finalize)
}
