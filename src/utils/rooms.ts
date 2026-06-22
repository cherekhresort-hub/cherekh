import { getBookings, getBookingRooms, type Booking } from './bookings'
import { availabilityRowsToBookings } from '../lib/bookingsDb'
import { getAvailabilityRowsCached } from '../lib/availabilityCache'
import { canEditPricing } from '../lib/permissions'
import { getCachedRoomRates, getCachedRoomInventory, getCachedRoomListPrices, notifyRoomRatesChanged, upsertRoomInventory, upsertRoomPricing, upsertRoomRate } from '../lib/roomRatesDb'
import { isSupabaseConfigured } from '../lib/supabase'
import { CONFERENCE_ROOM_ID, roomCatalog } from '../data/roomCatalog'
import { AvailabilityLoadError } from '../lib/bookingsDb'
import {
  bookingBlocksConferenceDate,
  datesInStayRange,
  normalizeEventDates,
} from './bookingHelpers'
import {
  getLegacyPoolUsage,
  isLegacyRoomType,
  isRoomUnitAvailable,
  LEGACY_ROOM_AVAILABILITY,
  LEGACY_ROOM_TYPE_IDS,
  countDirectBookingsOnRoom,
} from './legacyRoomTypes'
import { formatDisplayDate } from './dates'

export interface Room {
  id: string
  name: string
  label: string
  capacity: number
  includedGuests?: number
  maxExtraGuests?: number
  extraGuestPrice?: number
  price: number
  listPrice: number
  totalRooms: number
  roomNumber?: string
  description?: string
  features?: string[]
}

export interface RoomLineAvailabilityInput {
  roomType: string
  adults: number
  children: number
}

const STORAGE_KEY = 'cherekh_rooms'
const LEGACY_ROOM_IDS = [...LEGACY_ROOM_TYPE_IDS]

const defaultRooms: Room[] = [
  ...roomCatalog.map((room) => ({
    id: room.id,
    name: room.name,
    label: room.label,
    capacity: room.capacity,
    includedGuests: room.includedGuests,
    maxExtraGuests: room.maxExtraGuests,
    extraGuestPrice: room.extraGuestPrice,
    price: room.price,
    listPrice: 0,
    totalRooms: room.totalRooms,
    roomNumber: room.roomNumber,
    description: room.description,
    features: room.features,
  })),
  {
    id: 'conference',
    name: 'Conference Room',
    label: 'Conference Room',
    capacity: 100,
    price: 0,
    listPrice: 0,
    totalRooms: 1,
    description: 'Professional conference facility for meetings and events',
    features: ['Audio/Visual Equipment', 'Catering Available', '80-100 Capacity'],
  },
]

const isLegacyRoomData = (rooms: Room[]): boolean =>
  rooms.some((room) => LEGACY_ROOM_IDS.includes(room.id as (typeof LEGACY_ROOM_IDS)[number]))

const resolveRoomPrice = (
  roomId: string,
  catalogPrice: number,
  storedPrice?: number
): number => {
  const cachedRates = getCachedRoomRates()
  if (cachedRates && cachedRates[roomId] !== undefined) {
    return cachedRates[roomId]
  }
  if (storedPrice !== undefined) return storedPrice
  return catalogPrice
}

const resolveRoomTotalRooms = (
  roomId: string,
  catalogTotal: number,
  storedTotal?: number
): number => {
  const cachedInventory = getCachedRoomInventory()
  if (cachedInventory && cachedInventory[roomId] !== undefined) {
    return cachedInventory[roomId]
  }
  if (storedTotal !== undefined) return storedTotal
  return catalogTotal
}

const resolveRoomListPrice = (
  roomId: string,
  catalogListPrice: number,
  storedListPrice?: number
): number => {
  const cachedListPrices = getCachedRoomListPrices()
  if (cachedListPrices && cachedListPrices[roomId] !== undefined) {
    return cachedListPrices[roomId]
  }
  if (storedListPrice !== undefined) return storedListPrice
  return catalogListPrice
}

const syncRoomsWithCatalog = (rooms: Room[]): Room[] => {
  return defaultRooms.map((defaultRoom) => {
    const storedRoom = rooms.find((room) => room.id === defaultRoom.id)
    const price = resolveRoomPrice(
      defaultRoom.id,
      defaultRoom.price,
      storedRoom?.price
    )
    const listPrice = resolveRoomListPrice(
      defaultRoom.id,
      defaultRoom.listPrice,
      storedRoom?.listPrice
    )
    const totalRooms = resolveRoomTotalRooms(
      defaultRoom.id,
      defaultRoom.totalRooms,
      storedRoom?.totalRooms
    )
    const hasStored = Boolean(storedRoom)
    const changed =
      price !== defaultRoom.price ||
      listPrice !== defaultRoom.listPrice ||
      totalRooms !== defaultRoom.totalRooms

    return hasStored || changed
      ? { ...defaultRoom, price, listPrice, totalRooms }
      : defaultRoom
  })
}

const needsCatalogResync = (rooms: Room[]): boolean =>
  isLegacyRoomData(rooms) ||
  rooms.some(
    (room) =>
      room.includedGuests === undefined ||
      room.maxExtraGuests === undefined ||
      room.extraGuestPrice === undefined
  )

export const getRooms = (): Room[] => {
  if (typeof window === 'undefined') return defaultRooms

  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) {
    try {
      const rooms: Room[] = JSON.parse(stored)

      if (isLegacyRoomData(rooms) || needsCatalogResync(rooms)) {
        const syncedRooms = syncRoomsWithCatalog(rooms)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(syncedRooms))
        return syncedRooms
      }

      const syncedRooms = syncRoomsWithCatalog(rooms)
      const hasChanges =
        syncedRooms.length !== rooms.length ||
        syncedRooms.some((room, index) => {
          const existing = rooms[index]
          return (
            !existing ||
            existing.id !== room.id ||
            existing.price !== room.price ||
            existing.listPrice !== room.listPrice ||
            existing.totalRooms !== room.totalRooms
          )
        })

      if (hasChanges) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(syncedRooms))
      }

      return syncedRooms
    } catch {
      return defaultRooms
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultRooms))
  return defaultRooms
}

export const updateRoomPrice = async (
  id: string,
  price: number
): Promise<{ room: Room | null; synced: boolean }> => {
  if (!canEditPricing()) return { room: null, synced: false }

  const rooms = getRooms()
  const index = rooms.findIndex((r) => r.id === id)
  if (index === -1) return { room: null, synced: false }

  const nextPrice = Math.max(0, price)
  rooms[index] = {
    ...rooms[index],
    price: nextPrice,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms))

  const synced = await upsertRoomRate(id, nextPrice)
  notifyRoomRatesChanged()

  return { room: rooms[index], synced }
}

export const updateRoomPricing = async (
  id: string,
  price: number,
  listPrice: number
): Promise<{ room: Room | null; synced: boolean }> => {
  if (!canEditPricing()) return { room: null, synced: false }

  const rooms = getRooms()
  const index = rooms.findIndex((r) => r.id === id)
  if (index === -1) return { room: null, synced: false }

  const nextPrice = Math.max(0, Math.round(price))
  const nextListPrice = Math.max(nextPrice, Math.round(listPrice))
  rooms[index] = {
    ...rooms[index],
    price: nextPrice,
    listPrice: nextListPrice,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms))

  const synced = await upsertRoomPricing(id, nextPrice, nextListPrice)
  notifyRoomRatesChanged()

  return { room: rooms[index], synced }
}

export const updateRoom = (id: string, updates: Partial<Room>): Room | null => {
  const rooms = getRooms()
  const index = rooms.findIndex((r) => r.id === id)
  if (index === -1) return null

  rooms[index] = {
    ...rooms[index],
    ...updates,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms))
  return rooms[index]
}

export const updateRoomCount = async (
  id: string,
  count: number
): Promise<{ room: Room | null; synced: boolean }> => {
  if (!canEditPricing()) return { room: null, synced: false }

  const rooms = getRooms()
  const index = rooms.findIndex((r) => r.id === id)
  if (index === -1) return { room: null, synced: false }

  const nextCount = Math.max(0, count)
  rooms[index] = {
    ...rooms[index],
    totalRooms: nextCount,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms))

  const synced = await upsertRoomInventory(id, nextCount)
  notifyRoomRatesChanged()

  return { room: rooms[index], synced }
}

/** Statuses that hold inventory (pending web bookings + confirmed). */
const BLOCKING_BOOKING_STATUSES: Booking['status'][] = ['pending', 'confirmed']

const datesOverlap = (
  checkIn: string,
  checkOut: string,
  booking: Booking
): boolean => {
  const bookingCheckIn = new Date(booking.checkIn + 'T00:00:00')
  const bookingCheckOut = new Date(booking.checkOut + 'T00:00:00')
  const requestedCheckIn = new Date(checkIn + 'T00:00:00')
  const requestedCheckOut = new Date(checkOut + 'T00:00:00')

  bookingCheckIn.setHours(0, 0, 0, 0)
  bookingCheckOut.setHours(0, 0, 0, 0)
  requestedCheckIn.setHours(0, 0, 0, 0)
  requestedCheckOut.setHours(0, 0, 0, 0)

  return requestedCheckIn < bookingCheckOut && requestedCheckOut > bookingCheckIn
}

const getOverlappingBookings = (
  checkIn: string,
  checkOut: string,
  bookings: Booking[],
  excludeBookingId?: string
): Booking[] =>
  bookings.filter((booking) => {
    if (excludeBookingId && booking.id === excludeBookingId) return false
    if (!BLOCKING_BOOKING_STATUSES.includes(booking.status)) return false
    return datesOverlap(checkIn, checkOut, booking)
  })

const getLineCapacity = (roomType: string): number => {
  const room = getRooms().find((r) => r.id === roomType)
  if (room) return room.capacity
  const catalog = roomCatalog.find((r) => r.id === roomType)
  return catalog?.capacity ?? 0
}

const lineFitsCapacity = (line: RoomLineAvailabilityInput): boolean => {
  const capacity = getLineCapacity(line.roomType)
  const guests = line.adults + line.children
  return line.adults >= 1 && guests > 0 && guests <= capacity
}

const filterAvailableRooms = (
  checkIn: string,
  checkOut: string,
  bookings: Booking[],
  roomType?: string,
  excludeRoomIds: string[] = [],
  excludeBookingId?: string
): Room[] => {
  const overlapping = getOverlappingBookings(checkIn, checkOut, bookings, excludeBookingId)
  const getLines = (b: Booking) => getBookingRooms(b)

  const allRooms = getRooms()
  return allRooms.filter((room) => {
    if (roomType && room.id !== roomType) return false
    if (excludeRoomIds.includes(room.id)) return false

    return isRoomUnitAvailable(room.id, room.totalRooms || 0, overlapping, getLines)
  })
}

export const getAvailableRooms = async (
  checkIn: string,
  checkOut: string,
  roomType?: string,
  excludeRoomIds: string[] = [],
  options?: { excludeBookingId?: string }
): Promise<Room[]> => {
  if (!checkIn || !checkOut) return getRooms()

  try {
    let bookings: Booking[]
    if (isSupabaseConfigured()) {
      const rows = await getAvailabilityRowsCached()
      bookings = availabilityRowsToBookings(rows)
    } else {
      bookings = getBookings()
    }
    return filterAvailableRooms(
      checkIn,
      checkOut,
      bookings,
      roomType,
      excludeRoomIds,
      options?.excludeBookingId
    )
  } catch (e) {
    if (e instanceof AvailabilityLoadError) throw e
    console.error('Error loading bookings:', e)
    return []
  }
}

const getBookingsForAvailability = async (): Promise<Booking[]> => {
  if (isSupabaseConfigured()) {
    const rows = await getAvailabilityRowsCached()
    return availabilityRowsToBookings(rows)
  }
  return getBookings()
}

export { AvailabilityLoadError }

const isConferenceDateBlocked = (
  date: string,
  bookings: Booking[],
  excludeBookingId?: string
): boolean => {
  for (const booking of bookings) {
    if (excludeBookingId && booking.id === excludeBookingId) continue
    if (!BLOCKING_BOOKING_STATUSES.includes(booking.status)) continue
    if (bookingBlocksConferenceDate(booking, date)) return true
  }
  return false
}

/** True when every listed event date is free for the conference room. */
export const areConferenceEventDatesAvailable = async (
  eventDates: string[],
  options?: { excludeBookingId?: string }
): Promise<boolean> => {
  const normalized = normalizeEventDates(eventDates)
  if (normalized.length === 0) return false

  try {
    const bookings = await getBookingsForAvailability()
    for (const date of normalized) {
      if (isConferenceDateBlocked(date, bookings, options?.excludeBookingId)) {
        return false
      }
    }
    return true
  } catch (e) {
    if (e instanceof AvailabilityLoadError) return false
    throw e
  }
}

/** Remaining bookable units for a room type on given dates. */
export const getRemainingRoomUnits = async (
  checkIn: string,
  checkOut: string,
  roomType: string,
  options?: { excludeBookingId?: string }
): Promise<number> => {
  if (!checkIn || !checkOut || !roomType) return 0

  let bookings: Booking[]
  try {
    bookings = await getBookingsForAvailability()
  } catch (e) {
    if (e instanceof AvailabilityLoadError) return 0
    throw e
  }

  const overlapping = getOverlappingBookings(
    checkIn,
    checkOut,
    bookings,
    options?.excludeBookingId
  )
  const getLines = (b: Booking) => getBookingRooms(b)

  if (isLegacyRoomType(roomType)) {
    const pool = LEGACY_ROOM_AVAILABILITY[roomType]
    if (!pool) return 0
    const usage = getLegacyPoolUsage(pool, overlapping, getLines)
    return Math.max(0, pool.length - usage)
  }

  const room = getRooms().find((r) => r.id === roomType)
  if (!room) return 0

  if (roomType === CONFERENCE_ROOM_ID) {
    const days = datesInStayRange(checkIn, checkOut)
    if (days.length === 0) return 0
    for (const day of days) {
      if (isConferenceDateBlocked(day, bookings, options?.excludeBookingId)) return 0
    }
    return Math.max(0, (room.totalRooms || 0))
  }

  const direct = countDirectBookingsOnRoom(roomType, overlapping, getLines)
  const total = room.totalRooms || 0
  if (direct >= total) return 0

  if (!isRoomUnitAvailable(roomType, total, overlapping, getLines)) return 0

  return Math.max(0, total - direct)
}

/** True when every requested room line still has inventory and fits capacity. */
export const areRoomsAvailableForBooking = async (
  checkIn: string,
  checkOut: string,
  roomTypes: string[],
  options?: {
    excludeBookingId?: string
    lines?: RoomLineAvailabilityInput[]
    conferenceEventDates?: string[]
  }
): Promise<boolean> => {
  if (!checkIn || !checkOut || roomTypes.length === 0) return false

  const filledLines = options?.lines?.filter((l) => l.roomType) ?? []
  if (filledLines.length > 0) {
    for (const line of filledLines) {
      if (!lineFitsCapacity(line)) return false
    }
  }

  try {
    const neededByType: Record<string, number> = {}
    roomTypes.forEach((type) => {
      neededByType[type] = (neededByType[type] ?? 0) + 1
    })

    for (const [type, needed] of Object.entries(neededByType)) {
      if (type === CONFERENCE_ROOM_ID && options?.conferenceEventDates?.length) {
        const conferenceFree = await areConferenceEventDatesAvailable(
          options.conferenceEventDates,
          { excludeBookingId: options?.excludeBookingId }
        )
        if (!conferenceFree) return false
        continue
      }

      const remaining = await getRemainingRoomUnits(checkIn, checkOut, type, {
        excludeBookingId: options?.excludeBookingId,
      })
      if (remaining < needed) return false
    }

    return true
  } catch (e) {
    if (e instanceof AvailabilityLoadError) return false
    throw e
  }
}

export const getRoomById = (id: string): Room | null => {
  const rooms = getRooms()
  return rooms.find((r) => r.id === id) || null
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (dateString: string): string =>
  formatDisplayDate(dateString, 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
