import { useCallback, useEffect, useMemo, useState } from 'react'
import { getBookings, getBookingRooms } from '../../utils/bookings'
import { ROOM_RATES_CHANGED_EVENT } from '../../lib/roomRatesDb'
import { getRooms, type Room } from '../../utils/rooms'
import { roomCatalog, facilityCatalog } from '../../data/roomCatalog'
import { toISODate } from '../utils/date'
import type { RoomStatus } from '../types'

export interface AdminRoom extends Room {
  bedType?: string
  bedCategory?: 'double' | 'couple'
  isAC: boolean
  isConference?: boolean
  capacityLabel?: string
  image: string
  status: RoomStatus
  currentGuest?: string
  currentCheckIn?: string
  currentCheckOut?: string
  nextGuest?: string
  nextCheckIn?: string
}

const bookingStatusForRoom = (
  roomId: string,
  bookings: ReturnType<typeof getBookings>
) => {
  const today = toISODate()

  let status: RoomStatus = 'available'
  let currentGuest: string | undefined
  let currentCheckIn: string | undefined
  let currentCheckOut: string | undefined
  let nextGuest: string | undefined
  let nextCheckIn: string | undefined

  const relevantBookings = bookings.filter(
    (b) => b.status === 'confirmed' && getBookingRooms(b).some((r) => r.roomType === roomId)
  )

  const inHouse = relevantBookings.find((b) => b.checkIn <= today && b.checkOut > today)
  if (inHouse) {
    status = 'occupied'
    currentGuest = inHouse.name
    currentCheckIn = inHouse.checkIn
    currentCheckOut = inHouse.checkOut
  }

  const upcoming = relevantBookings
    .filter((b) => b.checkIn > today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0]
  if (upcoming) {
    nextGuest = upcoming.name
    nextCheckIn = upcoming.checkIn
  }

  const departingToday = relevantBookings.find((b) => b.checkOut === today)
  if (!inHouse && departingToday) status = 'cleaning'

  return {
    status,
    currentGuest,
    currentCheckIn,
    currentCheckOut,
    nextGuest,
    nextCheckIn,
  }
}

const computeRoomStatuses = (rooms: Room[]): AdminRoom[] => {
  const bookings = getBookings()
  const catalogById = new Map(roomCatalog.map((r) => [r.id, r]))
  const conferenceFacility = facilityCatalog.conference

  return rooms
    .map((room) => {
    const occupancy = bookingStatusForRoom(room.id, bookings)

    if (room.id === 'conference') {
      return {
        ...room,
        name: conferenceFacility.name,
        description: room.description ?? conferenceFacility.description,
        features: room.features ?? conferenceFacility.features,
        bedType: 'Event space',
        isAC: false,
        isConference: true,
        capacityLabel: conferenceFacility.capacity,
        image: conferenceFacility.images[0] ?? '/images/CherekhLogoFinal.png',
        ...occupancy,
      }
    }

    const catalog = catalogById.get(room.id)
    const isAC = (catalog?.features ?? []).includes('AC')
    const image = catalog?.images?.[0] ?? '/images/CherekhLogoFinal.png'

    return {
      ...room,
      bedType: catalog?.bedType,
      bedCategory: catalog?.bedCategory,
      isAC,
      image,
      ...occupancy,
    }
  })
    .sort((a, b) => {
      if (a.id === 'conference') return -1
      if (b.id === 'conference') return 1
      return a.id.localeCompare(b.id, undefined, { numeric: true })
    })
}

export const useRoomsData = () => {
  const [rooms, setRooms] = useState<Room[]>([])
  const refresh = useCallback(() => setRooms(getRooms()), [])

  useEffect(() => {
    refresh()
    window.addEventListener(ROOM_RATES_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(ROOM_RATES_CHANGED_EVENT, refresh)
  }, [refresh])

  const adminRooms = useMemo(() => computeRoomStatuses(rooms), [rooms])

  return { rooms: adminRooms, refresh }
}
