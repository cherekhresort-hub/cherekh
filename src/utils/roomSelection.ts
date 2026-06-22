export const BOOKING_SELECTED_ROOMS_KEY = 'cherekh_booking_selected_rooms'

export interface BookingSelectedRoomsHint {
  roomIds: string[]
  checkIn?: string
  checkOut?: string
  adults?: number
  children?: number
  expires: number
}

const HINT_TTL_MS = 30 * 60 * 1000

const parseHint = (raw: string | null): BookingSelectedRoomsHint | null => {
  if (!raw) return null
  try {
    const hint = JSON.parse(raw) as BookingSelectedRoomsHint
    if (!Array.isArray(hint.roomIds) || hint.roomIds.length === 0 || hint.expires < Date.now()) {
      return null
    }
    return hint
  } catch {
    return null
  }
}

/** Read pending booking hint without removing it (for initial form state). */
export const peekSelectedRoomsHint = (): BookingSelectedRoomsHint | null => {
  try {
    return parseHint(sessionStorage.getItem(BOOKING_SELECTED_ROOMS_KEY))
  } catch {
    return null
  }
}

export const saveSelectedRoomsHint = (
  hint: Omit<BookingSelectedRoomsHint, 'expires'>
): void => {
  sessionStorage.setItem(
    BOOKING_SELECTED_ROOMS_KEY,
    JSON.stringify({
      ...hint,
      expires: Date.now() + HINT_TTL_MS,
    })
  )
}

export const consumeSelectedRoomsHint = (): BookingSelectedRoomsHint | null => {
  try {
    const hint = parseHint(sessionStorage.getItem(BOOKING_SELECTED_ROOMS_KEY))
    sessionStorage.removeItem(BOOKING_SELECTED_ROOMS_KEY)
    return hint
  } catch {
    sessionStorage.removeItem(BOOKING_SELECTED_ROOMS_KEY)
    return null
  }
}

export interface BookingSearchParams {
  checkIn: string
  checkOut: string
  guests: number
}

export const buildBookingUrl = (
  search: BookingSearchParams | null,
  extra?: Record<string, string>
): string => {
  const params = new URLSearchParams(extra)
  if (search?.checkIn) params.set('checkIn', search.checkIn)
  if (search?.checkOut) params.set('checkOut', search.checkOut)
  if (search?.guests) params.set('adults', String(search.guests))
  const query = params.toString()
  return query ? `/booking?${query}` : '/booking'
}
