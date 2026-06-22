import { useCallback, useEffect, useState } from 'react'
import { roomCatalog } from '../data/roomCatalog'
import { loadRoomRates, ROOM_RATES_CHANGED_EVENT } from '../lib/roomRatesDb'
import { getRooms } from '../utils/rooms'

export interface RoomCardData {
  id: string
  roomNumber: string
  name: string
  image: string
  bedType: string
  features: string[]
  price: number
  listPrice: number
  guests: number
  maxGuests: number
}

export const buildRoomCardList = (): RoomCardData[] => {
  const storedRooms = getRooms()
  return roomCatalog.map((room) => {
    const stored = storedRooms.find((entry) => entry.id === room.id)
    const price = stored?.price ?? room.price
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      name: room.name,
      image: room.images[0],
      bedType: room.bedType,
      features: room.features,
      price,
      listPrice: stored?.listPrice ?? Math.round(price / 0.7),
      guests: room.includedGuests,
      maxGuests: room.capacity,
    }
  })
}

export const useRoomCardList = (featuredIds?: string[]) => {
  const featuredKey = featuredIds?.join(',') ?? ''

  const pickRooms = useCallback(
    (list: RoomCardData[]) => {
      if (!featuredIds?.length) return list
      return featuredIds
        .map((id) => list.find((room) => room.id === id))
        .filter((room): room is RoomCardData => room != null)
    },
    [featuredKey]
  )

  const [rooms, setRooms] = useState<RoomCardData[]>(() => pickRooms(buildRoomCardList()))

  const refresh = useCallback(() => {
    setRooms(pickRooms(buildRoomCardList()))
  }, [pickRooms])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRoomRates().then(refresh)
    }, 8000)
    window.addEventListener(ROOM_RATES_CHANGED_EVENT, refresh)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(ROOM_RATES_CHANGED_EVENT, refresh)
    }
  }, [refresh])

  return rooms
}
