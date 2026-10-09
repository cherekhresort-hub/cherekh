import { getBookableRoomRef } from '../../data/roomCatalog'
import { getBookingById, getBookingRooms, type Booking } from '../../utils/bookings'
import { formatBookingId } from '../../utils/bookingId'
import { getRoomAvailabilityIssues, type RoomAvailabilityIssue } from '../../utils/rooms'

export const describeAvailabilityIssues = (issues: RoomAvailabilityIssue[]): string =>
  issues
    .map((issue) => {
      const roomName = getBookableRoomRef(issue.roomType)?.name ?? `Room ${issue.roomType}`
      if (issue.reason === 'capacity') return `${roomName} has too many guests for its capacity.`
      if (issue.reason === 'unknown') return `Could not check availability for ${roomName}. Please try again.`
      const holders = issue.conflictingBookingIds.map((id) => {
        const existing = getBookingById(id)
        const ref = `#${formatBookingId(id)}`
        return existing?.name ? `${existing.name} (${ref})` : ref
      })
      return holders.length > 0
        ? `${roomName} is already booked for these dates by ${holders.join(', ')}.`
        : `${roomName} is not available for these dates.`
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
    : 'Rooms are not available for these dates.'
}
