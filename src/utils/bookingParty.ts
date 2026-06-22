import { MAX_SINGLE_ROOM_CAPACITY } from '../data/roomCatalog'
import { createRoomLine, getLineTotalGuests, type RoomBookingLine, type RoomOption } from './bookingHelpers'

export const BOOKING_PARTY_SPLIT_KEY = 'cherekh_booking_party_split'

export interface BookingPartySplitHint {
  adults: number
  children: number
  preferredRoomType?: string
  expires: number
}

/** Split a party across multiple room lines (unique room types, max capacity each). */
export const buildRoomLinesForParty = (
  adults: number,
  children: number,
  options: RoomOption[],
  preferredRoomType?: string
): RoomBookingLine[] => {
  const totalGuests = adults + children
  if (totalGuests <= 0) {
    return [createRoomLine(preferredRoomType || '', 1, 0)]
  }

  if (totalGuests <= MAX_SINGLE_ROOM_CAPACITY && options.length > 0) {
    const preferred = preferredRoomType
      ? options.find((o) => o.value === preferredRoomType)
      : undefined
    const target = preferred ?? options.find((o) => o.capacity >= totalGuests) ?? options[0]
    if (target && target.capacity >= totalGuests) {
      const roomChildren = Math.min(children, target.capacity - Math.min(adults, target.capacity))
      const roomAdults = Math.min(adults, target.capacity - roomChildren)
      return [createRoomLine(target.value, Math.max(1, roomAdults), roomChildren)]
    }
  }

  const sorted = [...options].sort((a, b) => b.capacity - a.capacity)
  if (preferredRoomType) {
    const idx = sorted.findIndex((o) => o.value === preferredRoomType)
    if (idx > 0) {
      const [pref] = sorted.splice(idx, 1)
      sorted.unshift(pref)
    }
  }

  let remAdults = adults
  let remChildren = children
  const lines: RoomBookingLine[] = []
  const used = new Set<string>()

  while ((remAdults > 0 || remChildren > 0) && used.size < sorted.length) {
    const option = sorted.find((o) => !used.has(o.value))
    if (!option) break

    const space = option.capacity
    const adultsInRoom = Math.min(remAdults, Math.max(1, Math.min(space, remAdults)))
    const childrenInRoom = Math.min(remChildren, space - adultsInRoom)

    if (adultsInRoom < 1) break

    lines.push(createRoomLine(option.value, adultsInRoom, childrenInRoom))
    remAdults -= adultsInRoom
    remChildren -= childrenInRoom
    used.add(option.value)
  }

  if (lines.length === 0) {
    return [createRoomLine(preferredRoomType || '', Math.max(1, adults), children)]
  }

  if (remAdults > 0 || remChildren > 0) {
    const last = lines[lines.length - 1]
    const option = sorted.find((o) => o.value === last.roomType)
    if (option) {
      const canAdd = option.capacity - getLineTotalGuests(last)
      if (canAdd > 0) {
        const addChildren = Math.min(remChildren, canAdd)
        const addAdults = Math.min(remAdults, canAdd - addChildren)
        last.adults += addAdults
        last.children += addChildren
        remAdults -= addAdults
        remChildren -= addChildren
      }
    }
  }

  while ((remAdults > 0 || remChildren > 0) && used.size < sorted.length) {
    const option = sorted.find((o) => !used.has(o.value))
    if (!option) break
    const adultsInRoom = Math.min(remAdults, Math.max(1, Math.min(option.capacity, remAdults)))
    const childrenInRoom = Math.min(remChildren, option.capacity - adultsInRoom)
    if (adultsInRoom < 1) break
    lines.push(createRoomLine(option.value, adultsInRoom, childrenInRoom))
    remAdults -= adultsInRoom
    remChildren -= childrenInRoom
    used.add(option.value)
  }

  return lines
}

type AvailableRoomForParty = {
  id: string
  capacity: number
}

/** Pick the fewest available rooms needed to fit a party (largest capacity first). */
export const pickRoomIdsForParty = (
  adults: number,
  children: number,
  availableRooms: AvailableRoomForParty[],
  preferredRoomType?: string
): string[] => {
  const totalGuests = adults + children
  if (totalGuests <= 0 || availableRooms.length === 0) return []

  const options: RoomOption[] = availableRooms.map((room) => ({
    value: room.id,
    label: room.id,
    typeSummary: '',
    capacity: room.capacity,
    includedGuests: 0,
    maxExtraGuests: 0,
    extraGuestPrice: 0,
    price: 0,
    listPrice: 0,
    isConference: false,
  }))

  const lines = buildRoomLinesForParty(adults, children, options, preferredRoomType)
  const roomIds = lines.map((line) => line.roomType).filter(Boolean)
  const assignedGuests = lines.reduce((sum, line) => sum + getLineTotalGuests(line), 0)

  return assignedGuests >= totalGuests ? roomIds : []
}
