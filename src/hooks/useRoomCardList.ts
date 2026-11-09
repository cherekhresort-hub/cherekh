import { useCallback, useEffect, useState } from 'react'
import { publicRoomCatalog } from '../data/roomCatalog'
import { getInitialRoomRates, loadRoomRatesAfterPageLoad, ROOM_RATES_CHANGED_EVENT } from '../lib/roomRatesDb'
import { getPrerenderedRooms, getRooms, type Room } from '../utils/rooms'

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

export const buildRoomCardList = (storedRooms: Room[] = getRooms()): RoomCardData[] => {
  return publicRoomCatalog.map((room) => {
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

  // The first render must match the prerendered HTML, so locally cached rates are applied after mount.
  const [rooms, setRooms] = useState<RoomCardData[]>(() => pickRooms(buildRoomCardList(getPrerenderedRooms())))

  const refresh = useCallback(() => {
    setRooms(pickRooms(buildRoomCardList()))
  }, [pickRooms])

  useEffect(() => {
    // Build-time rates are newer than a cache left by an earlier visit, so only fall back to it without them.
    if (!getInitialRoomRates()) refresh()
    const cancelLoad = loadRoomRatesAfterPageLoad(refresh)
    window.addEventListener(ROOM_RATES_CHANGED_EVENT, refresh)
    return () => {
      cancelLoad()
      window.removeEventListener(ROOM_RATES_CHANGED_EVENT, refresh)
    }
  }, [refresh])

  return rooms
}
