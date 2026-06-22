import {
  calculateExtraGuestCountForParty,
  getBookableRoomRef,
  getRoomSelectLabel,
  getRoomTypeSummary,
  roomCatalog,
  CONFERENCE_ROOM_ID,
} from '../data/roomCatalog'
import { addDaysToDateString, formatDisplayDate } from './dates'
import { getRooms, type Room } from './rooms'
import type { Booking } from './bookings'

export const ARRIVAL_TIME_OPTIONS = [
  { value: 'before-12', label: 'Before 12:00 PM' },
  { value: '12-14', label: '12:00 PM – 2:00 PM' },
  { value: '14-16', label: '2:00 PM – 4:00 PM (standard check-in)' },
  { value: '16-18', label: '4:00 PM – 6:00 PM' },
  { value: '18-20', label: '6:00 PM – 8:00 PM' },
  { value: 'after-20', label: 'After 8:00 PM' },
  { value: 'unsure', label: 'Not sure yet' },
] as const

export const getArrivalTimeLabel = (value: string): string =>
  ARRIVAL_TIME_OPTIONS.find((option) => option.value === value)?.label ?? value

export const bookingIncludesConference = (
  booking: Pick<Booking, 'roomType' | 'rooms'>
): boolean =>
  booking.roomType === CONFERENCE_ROOM_ID ||
  Boolean(booking.rooms?.some((line) => line.roomType === CONFERENCE_ROOM_ID))

export const getScheduleFieldLabel = (
  booking: Pick<Booking, 'roomType' | 'rooms'>
): string => (bookingIncludesConference(booking) ? 'Event timeline' : 'Expected arrival time')

export const formatScheduleNotes = (
  value: string,
  booking: Pick<Booking, 'roomType' | 'rooms'>
): string =>
  bookingIncludesConference(booking) ? value : getArrivalTimeLabel(value)

export const bookingHasGuestRooms = (
  booking: Pick<Booking, 'roomType' | 'rooms'>
): boolean => {
  if (booking.rooms && booking.rooms.length > 0) {
    return booking.rooms.some((line) => line.roomType !== CONFERENCE_ROOM_ID)
  }
  return Boolean(booking.roomType && booking.roomType !== CONFERENCE_ROOM_ID)
}

export const getBookingEventTimeline = (
  booking: Pick<Booking, 'roomType' | 'rooms' | 'eventTimeline' | 'expectedArrivalTime'>
): string | undefined => {
  if (!bookingIncludesConference(booking)) return undefined
  const timeline = booking.eventTimeline?.trim()
  if (timeline) return timeline
  if (!bookingHasGuestRooms(booking)) {
    const legacy = booking.expectedArrivalTime?.trim()
    if (legacy) return legacy
  }
  return undefined
}

export const getBookingArrivalTime = (
  booking: Pick<Booking, 'roomType' | 'rooms' | 'expectedArrivalTime'>
): string | undefined => {
  if (!bookingHasGuestRooms(booking)) return undefined
  return booking.expectedArrivalTime?.trim() || undefined
}

export const bookingIsConferenceOnly = (
  booking: Pick<Booking, 'roomType' | 'rooms'>
): boolean => bookingIncludesConference(booking) && !bookingHasGuestRooms(booking)

/** Admin guest-ID slots — one host for conference-only; headcount for guest rooms only. */
export const getGuestDetailSlotCount = (
  booking: Pick<Booking, 'roomType' | 'rooms' | 'totalGuests' | 'adults' | 'children'>
): number => {
  if (bookingIsConferenceOnly(booking)) return 1

  const lines =
    booking.rooms && booking.rooms.length > 0
      ? booking.rooms
      : booking.roomType
        ? [
            {
              roomType: booking.roomType,
              adults: booking.adults ?? 1,
              children: booking.children ?? 0,
              totalGuests: booking.totalGuests ?? 1,
            },
          ]
        : []

  const guestRoomHeadcount = lines
    .filter((line) => line.roomType !== CONFERENCE_ROOM_ID)
    .reduce(
      (sum, line) =>
        sum + (line.totalGuests ?? (line.adults ?? 0) + (line.children ?? 0)),
      0
    )

  if (guestRoomHeadcount > 0) return guestRoomHeadcount

  return Math.max(1, booking.totalGuests || 1)
}

export interface RoomOption {
  value: string
  label: string
  typeSummary: string
  capacity: number
  includedGuests: number
  maxExtraGuests: number
  extraGuestPrice: number
  price: number
  listPrice: number
  isConference: boolean
}

export interface RoomBookingLine {
  id: string
  roomType: string
  adults: number
  children: number
}

export const createRoomLine = (
  roomType = '',
  adults = 1,
  children = 0
): RoomBookingLine => ({
  id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  roomType,
  adults,
  children,
})

export const roomToOption = (room: Room): RoomOption => {
  const ref = getBookableRoomRef(room.id)
  const catalogRoom = roomCatalog.find((entry) => entry.id === room.id)

  return {
    value: room.id,
    label: ref?.selectLabel ?? (catalogRoom ? getRoomSelectLabel(catalogRoom) : room.name),
    typeSummary: ref?.typeSummary ?? (catalogRoom ? getRoomTypeSummary(catalogRoom) : room.label ?? room.name),
    capacity: room.capacity,
    includedGuests: room.includedGuests ?? catalogRoom?.includedGuests ?? ref?.includedGuests ?? room.capacity,
    maxExtraGuests: room.maxExtraGuests ?? catalogRoom?.maxExtraGuests ?? ref?.maxExtraGuests ?? 0,
    extraGuestPrice: room.extraGuestPrice ?? catalogRoom?.extraGuestPrice ?? ref?.extraGuestPrice ?? 1000,
    price: room.price,
    listPrice: room.listPrice,
    isConference: ref?.isConference ?? false,
  }
}

export const getLineTotalGuests = (line: RoomBookingLine): number =>
  line.adults + line.children

export const calculateLineNightlyRate = (line: RoomBookingLine, option?: RoomOption) => {
  if (!option) {
    return { basePrice: 0, extraGuestCount: 0, extraGuestFee: 0, nightlyTotal: 0 }
  }

  const extraGuestCount = calculateExtraGuestCountForParty(
    line.adults,
    line.children,
    option.includedGuests,
    option.maxExtraGuests
  )
  const extraGuestFee = extraGuestCount * option.extraGuestPrice

  return {
    basePrice: option.price,
    extraGuestCount,
    extraGuestFee,
    nightlyTotal: option.price + extraGuestFee,
  }
}

export const calculateStayNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut || checkOut <= checkIn) return 0

  return Math.ceil(
    (new Date(checkOut + 'T00:00:00').getTime() -
      new Date(checkIn + 'T00:00:00').getTime()) /
      (1000 * 60 * 60 * 24)
  )
}

export const normalizeEventDates = (dates: string[]): string[] =>
  [...new Set(dates.filter(Boolean))].sort()

/** Calendar days covered by a stay range (check-in through night before check-out). */
export const datesInStayRange = (checkIn: string, checkOut: string): string[] => {
  if (!checkIn || !checkOut || checkOut <= checkIn) return []

  const dates: string[] = []
  let current = checkIn
  while (current < checkOut) {
    dates.push(current)
    current = addDaysToDateString(current, 1)
  }
  return dates
}

/** Event day(s) for a conference booking — explicit list or legacy stay range. */
export const getBookingEventDates = (
  booking: Pick<Booking, 'checkIn' | 'checkOut' | 'eventDates' | 'roomType' | 'rooms'>
): string[] => {
  if (booking.eventDates && booking.eventDates.length > 0) {
    return normalizeEventDates(booking.eventDates)
  }
  if (bookingIncludesConference(booking)) {
    return datesInStayRange(booking.checkIn, booking.checkOut)
  }
  return []
}

export const deriveConferenceBounds = (
  eventDates: string[]
): { checkIn: string; checkOut: string } => {
  const sorted = normalizeEventDates(eventDates)
  if (sorted.length === 0) return { checkIn: '', checkOut: '' }
  return {
    checkIn: sorted[0],
    checkOut: addDaysToDateString(sorted[sorted.length - 1], 1),
  }
}

export const getConferenceEventDayCount = (
  booking: Pick<Booking, 'checkIn' | 'checkOut' | 'eventDates' | 'roomType' | 'rooms'>
): number => getBookingEventDates(booking).length

export const getBookingDurationCount = (
  booking: Pick<Booking, 'checkIn' | 'checkOut' | 'eventDates' | 'roomType' | 'rooms'>
): number => {
  if (bookingIsConferenceOnly(booking) || (booking.eventDates?.length ?? 0) > 0) {
    return getConferenceEventDayCount(booking)
  }
  return calculateStayNights(booking.checkIn, booking.checkOut)
}

export const formatEventDatesDisplay = (dates: string[]): string => {
  const normalized = normalizeEventDates(dates)
  if (normalized.length === 0) return ''
  if (normalized.length <= 3) {
    return normalized.map((d) => formatDisplayDate(d)).join(', ')
  }
  return `${formatDisplayDate(normalized[0])} – ${formatDisplayDate(normalized[normalized.length - 1])} (${normalized.length} event days)`
}

export const bookingBlocksConferenceDate = (
  booking: Pick<Booking, 'checkIn' | 'checkOut' | 'eventDates' | 'roomType' | 'rooms' | 'status'>,
  date: string
): boolean => {
  if (!bookingIncludesConference(booking)) return false
  return getBookingEventDates(booking).includes(date)
}

export const formatEventDayLabel = (count: number): string =>
  count === 1 ? '1 Event Day' : `${count} Event Days`

export const formatNightLabel = (count: number): string =>
  count === 1 ? '1 night' : `${count} nights`

/** Price-summary duration — event days for conference-only bookings, nights otherwise. */
export const formatBookingDurationLabel = (
  count: number,
  conferenceOnly: boolean
): string => (conferenceOnly ? formatEventDayLabel(count) : formatNightLabel(count))

/**
 * Compute the expected stay total for a booking using the room catalog as the
 * source of truth for prices, included guests, and extra-guest fees. Pure
 * function — does not read or mutate localStorage, so it can run on the server,
 * in `saveBooking`, or to derive a suggested total in the admin UI.
 */
export const calculateBookingTotal = (
  booking: Pick<
    Booking,
    | 'checkIn'
    | 'checkOut'
    | 'eventDates'
    | 'rooms'
    | 'roomType'
    | 'adults'
    | 'children'
    | 'totalGuests'
  >
): number => {
  const nights = calculateStayNights(booking.checkIn, booking.checkOut)
  const conferenceDays =
    booking.eventDates && booking.eventDates.length > 0
      ? normalizeEventDates(booking.eventDates).length
      : nights

  if (nights <= 0 && conferenceDays <= 0) return 0

  const lines =
    booking.rooms && booking.rooms.length > 0
      ? booking.rooms
      : booking.roomType
        ? [
            {
              roomType: booking.roomType,
              roomName: '',
              adults: booking.adults ?? 1,
              children: booking.children ?? 0,
              totalGuests:
                booking.totalGuests ?? (booking.adults ?? 1) + (booking.children ?? 0),
            },
          ]
        : []

  return lines.reduce((sum, line) => {
    const ref = getBookableRoomRef(line.roomType)
    if (!ref) return sum

    const stored = getRooms().find((room) => room.id === line.roomType)
    const nightlyPrice = stored?.price ?? 0

    if (ref.isConference) {
      const days = conferenceDays > 0 ? conferenceDays : nights
      return sum + nightlyPrice * days
    }

    if (nights <= 0) return sum

    const extraGuests = calculateExtraGuestCountForParty(
      line.adults,
      line.children ?? 0,
      ref.includedGuests,
      ref.maxExtraGuests
    )
    return sum + (nightlyPrice + extraGuests * ref.extraGuestPrice) * nights
  }, 0)
}

export const calculateBookingEstimate = (
  lines: RoomBookingLine[],
  roomOptions: RoomOption[],
  nights: number
) => {
  const lineBreakdown = lines
    .filter((line) => line.roomType)
    .map((line) => {
      const option = roomOptions.find((room) => room.value === line.roomType)
      const rates = calculateLineNightlyRate(line, option)
      return {
        line,
        option,
        ...rates,
        stayTotal: rates.nightlyTotal * nights,
      }
    })

  const nightlyTotal = lineBreakdown.reduce((sum, item) => sum + item.nightlyTotal, 0)
  const estimatedTotal = lineBreakdown.reduce((sum, item) => sum + item.stayTotal, 0)

  return { lineBreakdown, nightlyTotal, estimatedTotal }
}
