import { roomCatalog } from '../data/roomCatalog'
import { getSupabase, isSupabaseConfigured } from './supabase'

const CACHE_KEY = 'cherekh_room_rates_cache'
export const ROOM_RATES_CHANGED_EVENT = 'room-rates-changed'

export type RoomRateConfig = {
  price: number
  listPrice: number
  totalRooms: number
}

let memoryCache: Record<string, RoomRateConfig> | null = null

const catalogDefaults = (): Record<string, RoomRateConfig> =>
  Object.fromEntries(
    [
      ...roomCatalog.map((room) => [
        room.id,
        {
          price: room.price,
          listPrice: 0,
          totalRooms: room.totalRooms,
        },
      ] as const),
      ['conference', { price: 0, listPrice: 0, totalRooms: 1 }] as const,
    ]
  )

const defaultConfigForRoom = (roomId: string): RoomRateConfig => {
  const defaults = catalogDefaults()
  return defaults[roomId] ?? { price: 0, listPrice: 0, totalRooms: 1 }
}

const parseCache = (raw: unknown): Record<string, RoomRateConfig> | null => {
  if (!raw || typeof raw !== 'object') return null

  const parsed: Record<string, RoomRateConfig> = {}
  for (const [roomId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number') {
      parsed[roomId] = {
        price: value,
        listPrice: 0,
        totalRooms: defaultConfigForRoom(roomId).totalRooms,
      }
      continue
    }
    if (value && typeof value === 'object') {
      const row = value as { price?: unknown; listPrice?: unknown; totalRooms?: unknown }
      if (typeof row.price === 'number') {
        const defaults = defaultConfigForRoom(roomId)
        parsed[roomId] = {
          price: row.price,
          listPrice:
            typeof row.listPrice === 'number'
              ? row.listPrice
              : 0,
          totalRooms:
            typeof row.totalRooms === 'number' ? row.totalRooms : defaults.totalRooms,
        }
      }
    }
  }
  return Object.keys(parsed).length > 0 ? parsed : null
}

const readLocalCache = (): Record<string, RoomRateConfig> | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? parseCache(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

const writeLocalCache = (config: Record<string, RoomRateConfig>): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CACHE_KEY, JSON.stringify(config))
}

const mergeConfig = (
  base: Record<string, RoomRateConfig>,
  patch: Record<string, Partial<RoomRateConfig>>
): Record<string, RoomRateConfig> => {
  const next = { ...base }
  for (const [roomId, updates] of Object.entries(patch)) {
    const current = next[roomId] ?? defaultConfigForRoom(roomId)
    next[roomId] = {
      price: updates.price ?? current.price,
      listPrice: updates.listPrice ?? current.listPrice,
      totalRooms: updates.totalRooms ?? current.totalRooms,
    }
  }
  return next
}

export const getCachedRoomRates = (): Record<string, number> | null => {
  if (!memoryCache) return null
  return Object.fromEntries(Object.entries(memoryCache).map(([id, row]) => [id, row.price]))
}

export const getCachedRoomInventory = (): Record<string, number> | null => {
  if (!memoryCache) return null
  return Object.fromEntries(Object.entries(memoryCache).map(([id, row]) => [id, row.totalRooms]))
}

export const getCachedRoomListPrices = (): Record<string, number> | null => {
  if (!memoryCache) return null
  return Object.fromEntries(Object.entries(memoryCache).map(([id, row]) => [id, row.listPrice]))
}

export const notifyRoomRatesChanged = (): void => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ROOM_RATES_CHANGED_EVENT))
}

/** Load published room rates and inventory from Supabase (or local cache when offline). */
export const loadRoomRates = async (): Promise<Record<string, number>> => {
  if (!isSupabaseConfigured()) {
    memoryCache = readLocalCache()
    return getCachedRoomRates() ?? {}
  }

  const supabase = getSupabase()
  if (!supabase) {
    memoryCache = readLocalCache()
    return getCachedRoomRates() ?? {}
  }

  const { data, error } = await supabase.from('room_rates').select('room_id, price, list_price, total_rooms')

  if (error) {
    console.error('[Supabase] fetch room_rates:', error.message)
    memoryCache = readLocalCache()
    return getCachedRoomRates() ?? {}
  }

  const config = Object.fromEntries(
    (data ?? []).map((row) => [
      row.room_id,
      {
        price: row.price,
        listPrice: row.list_price ?? 0,
        totalRooms: row.total_rooms ?? defaultConfigForRoom(row.room_id).totalRooms,
      },
    ])
  ) as Record<string, RoomRateConfig>

  memoryCache = config
  writeLocalCache(config)
  return getCachedRoomRates() ?? {}
}

const persistRoomConfig = async (
  roomId: string,
  config: RoomRateConfig
): Promise<boolean> => {
  memoryCache = mergeConfig(memoryCache ?? readLocalCache() ?? {}, {
    [roomId]: config,
  })
  writeLocalCache(memoryCache)

  if (!isSupabaseConfigured()) return true

  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase.from('room_rates').upsert(
    {
      room_id: roomId,
      price: config.price,
      list_price: config.listPrice,
      total_rooms: config.totalRooms,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'room_id' }
  )

  if (error) {
    console.error('[Supabase] upsert room_rates:', error.message)
    return false
  }

  return true
}

/** Persist a room rate for all website visitors (admin only; RLS enforced). */
export const upsertRoomRate = async (roomId: string, price: number): Promise<boolean> => {
  const normalizedPrice = Math.max(0, Math.round(price))
  const existing = memoryCache?.[roomId] ?? readLocalCache()?.[roomId] ?? defaultConfigForRoom(roomId)

  return persistRoomConfig(roomId, {
    price: normalizedPrice,
    listPrice: existing.listPrice,
    totalRooms: existing.totalRooms,
  })
}

/** Persist discounted and original nightly rates (admin only; RLS enforced). */
export const upsertRoomPricing = async (
  roomId: string,
  price: number,
  listPrice: number
): Promise<boolean> => {
  const normalizedPrice = Math.max(0, Math.round(price))
  const normalizedList = Math.max(0, Math.round(listPrice))
  const existing = memoryCache?.[roomId] ?? readLocalCache()?.[roomId] ?? defaultConfigForRoom(roomId)

  return persistRoomConfig(roomId, {
    price: normalizedPrice,
    listPrice: normalizedList >= normalizedPrice ? normalizedList : normalizedPrice,
    totalRooms: existing.totalRooms,
  })
}

/** Persist bookable units for a room type (admin only; RLS enforced). */
export const upsertRoomInventory = async (roomId: string, totalRooms: number): Promise<boolean> => {
  const normalizedCount = Math.max(0, Math.round(totalRooms))
  const existing = memoryCache?.[roomId] ?? readLocalCache()?.[roomId] ?? defaultConfigForRoom(roomId)

  return persistRoomConfig(roomId, {
    price: existing.price,
    listPrice: existing.listPrice,
    totalRooms: normalizedCount,
  })
}
