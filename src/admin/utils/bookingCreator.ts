import { useCallback, useEffect, useState } from 'react'
import { fetchBookingCreatorsFromActivity, roleLabelForActivity } from '../../lib/staffActivityLog'
import { fetchStaffDirectory } from '../../lib/staffNames'
import type { Booking, BookingCreator } from '../../utils/bookings'

export type BookingCreatorLookup = (booking: Booking) => BookingCreator | undefined

/** Short name for compact lists: display name, else the email's local part. */
export const bookingCreatorShortName = (creator: BookingCreator | undefined): string | null => {
  if (!creator) return null
  if (creator.type === 'website') return 'Website'
  return creator.name?.trim() || creator.email.split('@')[0]
}

export const bookingCreatorLabel = (creator: BookingCreator | undefined): string | null => {
  if (!creator) return null
  if (creator.type === 'website') return 'Website'
  const who = creator.name?.trim() || creator.email
  return creator.role ? `${who} · ${roleLabelForActivity(creator.role)}` : who
}

/**
 * Booking creator with the member's current team name. Falls back to the activity log
 * (admins only) for bookings saved before `bookedBy` existed.
 */
export const useBookingCreatorLookup = (isAdmin: boolean): BookingCreatorLookup => {
  const [fromActivity, setFromActivity] = useState<Map<string, BookingCreator>>(new Map())
  const [names, setNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    void fetchStaffDirectory().then((directory) => {
      if (!cancelled) setNames(directory)
    })
    return () => {
      cancelled = true
    }
  }, [])

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

  return useCallback(
    (booking) => {
      const creator = booking.bookedBy ?? fromActivity.get(booking.id)
      if (creator?.type !== 'staff') return creator
      const current = names.get(creator.email.trim().toLowerCase())
      return current ? { ...creator, name: current } : creator
    },
    [fromActivity, names]
  )
}
