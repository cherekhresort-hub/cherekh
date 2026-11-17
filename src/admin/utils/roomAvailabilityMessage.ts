import { getBookableRoomRef } from '../../data/roomCatalog'
import { getBookingById, getBookingRooms, type Booking } from '../../utils/bookings'
import { bookingIncludesConference, getBookingEventDates } from '../../utils/bookingHelpers'
import { formatBookingId } from '../../utils/bookingId'
import { formatDisplayDate } from '../../utils/dates'
import { getRoomAvailabilityIssues, type RoomAvailabilityIssue } from '../../utils/rooms'

const shortDay = (iso: string): string =>
  formatDisplayDate(iso, 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Stay or event dates that the conflicting booking is holding. */
export const formatBookingHoldDates = (booking: Booking): string => {
  if (bookingIncludesConference(booking)) {
    const events = getBookingEventDates(booking)
    if (events.length === 0) {
      // fall through to stay bounds
    } else if (events.length <= 3) {
      return events.map(shortDay).join(', ')
    } else {
      return `${shortDay(events[0])} – ${shortDay(events[events.length - 1])} (${events.length} event days)`
    }
  }
  if (!booking.checkIn) return ''
  if (!booking.checkOut || booking.checkOut <= booking.checkIn) return shortDay(booking.checkIn)
  return `${shortDay(booking.checkIn)} – ${shortDay(booking.checkOut)}`
}

export const describeAvailabilityIssues = (issues: RoomAvailabilityIssue[]): string =>
  issues
    .map((issue) => {
      const roomName = getBookableRoomRef(issue.roomType)?.name ?? `Room ${issue.roomType}`
      if (issue.reason === 'capacity') return `${roomName} has too many guests for its capacity.`
      if (issue.reason === 'unknown') {
        return `Could not check availability for ${roomName}. Please try again.`
      }

      const holders = issue.conflictingBookingIds.map((id) => {
        const existing = getBookingById(id)
        const ref = `#${formatBookingId(id)}`
        if (!existing) return { label: ref, dates: '' }
        return {
          label: existing.name ? `${existing.name} (${ref})` : ref,
          dates: formatBookingHoldDates(existing),
        }
      })

      if (holders.length === 0) {
        return `${roomName} is not available for the selected dates.`
      }

      if (holders.length === 1) {
        const holder = holders[0]
        return holder.dates
          ? `${roomName} is already booked for ${holder.dates} by ${holder.label}.`
          : `${roomName} is already booked by ${holder.label}.`
      }

      const parts = holders.map((holder) =>
        holder.dates ? `for ${holder.dates} by ${holder.label}` : `by ${holder.label}`
      )
      return `${roomName} is already booked ${parts.join(', and ')}.`
    })
    .join(' ')

/** Explains why an existing booking's rooms cannot be held (e.g. when confirming it). */
export const explainBookingUnavailable = async (booking: Booking): Promise<string> => {
  const lines = getBookingRooms(booking).filter((line) => line.roomType)
  const issues = await getRoomAvailabilityIssues(
    booking.checkIn,
    booking.checkOut,
    lines.map((line) => line.roomType),
    {
      excludeBookingId: booking.id,
      lines: lines.map((line) => ({
        roomType: line.roomType,
        adults: line.adults ?? 1,
        children: line.children ?? 0,
      })),
      conferenceEventDates: booking.eventDates,
    }
  )
  return issues.length > 0
    ? describeAvailabilityIssues(issues)
    : 'Rooms are not available for the selected dates.'
}
