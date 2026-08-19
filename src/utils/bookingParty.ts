import { MAX_INCLUDED_GUESTS_PER_ROOM } from '../data/roomCatalog'
import { createRoomLine, getLineTotalGuests, type RoomBookingLine, type RoomOption } from './bookingHelpers'

export const BOOKING_PARTY_SPLIT_KEY = 'cherekh_booking_party_split'

export interface BookingPartySplitHint {
  adults: number
  children: number
  preferredRoomType?: string
  expires: number
}

const assignmentCapacity = (option: RoomOption): number =>
  option.includedGuests > 0 ? option.includedGuests : option.capacity

/** Split a party across rooms using included occupancy (not extra-guest maximum). */
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

  if (totalGuests <= MAX_INCLUDED_GUESTS_PER_ROOM && options.length > 0) {
    const preferred = preferredRoomType
      ? options.find((o) => o.value === preferredRoomType)
      : undefined
    const target =
      preferred ?? options.find((o) => assignmentCapacity(o) >= totalGuests) ?? options[0]
    if (target && assignmentCapacity(target) >= totalGuests) {
      const space = assignmentCapacity(target)
      const roomChildren = Math.min(children, space - Math.min(adults, space))
      const roomAdults = Math.min(adults, space - roomChildren)
      return [createRoomLine(target.value, Math.max(1, roomAdults), roomChildren)]
    }
  }

  const sorted = [...options].sort((a, b) => assignmentCapacity(b) - assignmentCapacity(a))
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

    const space = assignmentCapacity(option)
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
      const canAdd = assignmentCapacity(option) - getLineTotalGuests(last)
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
    const space = assignmentCapacity(option)
    const adultsInRoom = Math.min(remAdults, Math.max(1, Math.min(space, remAdults)))
    const childrenInRoom = Math.min(remChildren, space - adultsInRoom)
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
  includedGuests: number
  capacity?: number
}

const roomsToOptions = (availableRooms: AvailableRoomForParty[]): RoomOption[] =>
  availableRooms.map((room) => ({
    value: room.id,
    label: room.id,
    typeSummary: '',
    capacity: room.capacity ?? room.includedGuests,
    includedGuests: room.includedGuests,
    maxExtraGuests: 0,
    extraGuestPrice: 0,
    price: 0,
    listPrice: 0,
    isConference: false,
  }))

export interface RoomGuestAllocation {
  id: string
  guests: number
}

/** Split a party across rooms and return how many guests each room holds. */
export const allocateGuestsToRooms = (
  adults: number,
  children: number,
  availableRooms: AvailableRoomForParty[],
  preferredRoomType?: string
): RoomGuestAllocation[] => {
  const totalGuests = adults + children
  if (totalGuests <= 0 || availableRooms.length === 0) return []

  const lines = buildRoomLinesForParty(
    adults,
    children,
    roomsToOptions(availableRooms),
    preferredRoomType
  )
  const assigned = lines
    .map((line) => ({
      id: line.roomType,
      guests: getLineTotalGuests(line),
    }))
    .filter((entry) => entry.id && entry.guests > 0)

  const assignedGuests = assigned.reduce((sum, entry) => sum + entry.guests, 0)
  return assignedGuests >= totalGuests ? assigned : []
}

/** Pick the fewest available rooms needed to fit a party (largest capacity first). */
export const pickRoomIdsForParty = (
  adults: number,
  children: number,
  availableRooms: AvailableRoomForParty[],
  preferredRoomType?: string
): string[] =>
  allocateGuestsToRooms(adults, children, availableRooms, preferredRoomType).map(
    (entry) => entry.id
  )
