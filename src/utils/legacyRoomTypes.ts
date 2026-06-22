import { roomCatalog } from '../data/roomCatalog'

type BookingLineSource = {
  rooms?: { roomType: string }[]
  roomType?: string
}

/** Pre-catalog room type IDs still present in old bookings. */
export const LEGACY_ROOM_TYPE_IDS = ['garden-view', 'hill-view', 'deluxe'] as const

/** Legacy category → physical room IDs that share that category's inventory pool. */
export const LEGACY_ROOM_AVAILABILITY: Record<string, string[]> = {
  'garden-view': ['103', '104', '105', '201', '202', '203'],
  'hill-view': ['204', '205', '206'],
  deluxe: ['103', '104', '105'],
}

const catalogIds = new Set(roomCatalog.map((r) => r.id))

/** Legacy pools that include a physical room id (a room may appear in multiple pools). */
export const getLegacyPoolsForRoom = (roomId: string): string[][] =>
  Object.values(LEGACY_ROOM_AVAILABILITY).filter((pool) => pool.includes(roomId))

export const isLegacyRoomType = (roomType: string): boolean =>
  roomType in LEGACY_ROOM_AVAILABILITY

export const isKnownRoomType = (roomType: string): boolean =>
  catalogIds.has(roomType) || isLegacyRoomType(roomType)

/** Direct bookings on this exact room id (not legacy pool). */
export const countDirectBookingsOnRoom = <T extends BookingLineSource>(
  roomId: string,
  overlapping: T[],
  getLines: (b: T) => { roomType: string }[]
): number => {
  let count = 0
  overlapping.forEach((booking) => {
    getLines(booking).forEach((line) => {
      if (line.roomType === roomId) count += 1
    })
  })
  return count
}

/**
 * Units consumed in a legacy pool (each booking line counts at most once per pool).
 */
export const getLegacyPoolUsage = <T extends BookingLineSource>(
  poolRoomIds: string[],
  overlapping: T[],
  getLines: (b: T) => { roomType: string }[]
): number => {
  let usage = 0
  overlapping.forEach((booking) => {
    let lineCounted = false
    getLines(booking).forEach((line) => {
      if (lineCounted) return
      const type = line.roomType || ''
      if (poolRoomIds.includes(type)) {
        usage += 1
        lineCounted = true
        return
      }
      const legacyPool = LEGACY_ROOM_AVAILABILITY[type]
      if (legacyPool && legacyPool.some((id) => poolRoomIds.includes(id))) {
        usage += 1
        lineCounted = true
      }
    })
  })
  return usage
}

/** Whether a physical room still has a free unit on these dates. */
export const isRoomUnitAvailable = <T extends BookingLineSource>(
  roomId: string,
  totalRooms: number,
  overlapping: T[],
  getLines: (b: T) => { roomType: string }[]
): boolean => {
  const direct = countDirectBookingsOnRoom(roomId, overlapping, getLines)
  if (direct >= totalRooms) return false

  for (const pool of getLegacyPoolsForRoom(roomId)) {
    const poolUsage = getLegacyPoolUsage(pool, overlapping, getLines)
    if (poolUsage >= pool.length) return false
  }

  return true
}
