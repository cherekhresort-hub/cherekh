import { useEffect, useState } from 'react'
import { fetchBookingCreatorsFromActivity, roleLabelForActivity } from '../../lib/staffActivityLog'
import type { Booking, BookingCreator } from '../../utils/bookings'

export type BookingCreatorLookup = (booking: Booking) => BookingCreator | undefined

export const bookingCreatorLabel = (creator: BookingCreator | undefined): string | null => {
  if (!creator) return null
  if (creator.type === 'website') return 'Website'
  return creator.role ? `${creator.email} · ${roleLabelForActivity(creator.role)}` : creator.email
}

/** Booking creator, falling back to the activity log for bookings saved before `bookedBy` existed. */
export const useBookingCreatorLookup = (isAdmin: boolean): BookingCreatorLookup => {
  const [fromActivity, setFromActivity] = useState<Map<string, BookingCreator>>(new Map())

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    void fetchBookingCreatorsFromActivity().then((creators) => {
      if (cancelled) return
      const next = new Map<string, BookingCreator>()
      creators.forEach((creator, id) => next.set(id, { type: 'staff', ...creator }))
      setFromActivity(next)
    })
    return () => {
      cancelled = true
    }
  }, [isAdmin])

  return (booking) => booking.bookedBy ?? fromActivity.get(booking.id)
}
