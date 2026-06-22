import type { Booking } from '../utils/bookings'
import { invalidateAvailabilityCache } from './availabilityCache'
import {
  deleteBookingRemote,
  fetchBookingById,
  fetchBookingsList,
  insertBookingIfAvailable,
  loadBookingsFromLocal,
  migrateLocalBookingsToRemote,
  saveBookingsToLocal,
  upsertBookingIfAvailable,
} from './bookingsDb'
import { getSupabase } from './supabase'
import { isSupabaseConfigured } from './supabase'

let bookingsCache: Booking[] = loadBookingsFromLocal()
let hydratedFromRemote = false
let hydratePromise: Promise<void> | null = null
const detailLoadedIds = new Set<string>()

export const isBookingDetailLoaded = (id: string): boolean => detailLoadedIds.has(id)

const markBookingDetailLoaded = (id: string): void => {
  detailLoadedIds.add(id)
}

const clearDetailLoadedFlags = (): void => {
  detailLoadedIds.clear()
}

export const getBookingsCache = (): Booking[] => bookingsCache

export const setBookingsCache = (bookings: Booking[]): void => {
  bookingsCache = bookings
  saveBookingsToLocal(bookings)
}

/** Merge one booking from Realtime without a full-table refetch. */
export const applyBookingToCache = (booking: Booking): void => {
  const index = bookingsCache.findIndex((b) => b.id === booking.id)
  if (index === -1) bookingsCache = [...bookingsCache, booking]
  else {
    const next = [...bookingsCache]
    next[index] = booking
    bookingsCache = next
  }
  saveBookingsToLocal(bookingsCache)
  markBookingDetailLoaded(booking.id)
}

export const removeBookingFromCache = (id: string): void => {
  bookingsCache = bookingsCache.filter((b) => b.id !== id)
  saveBookingsToLocal(bookingsCache)
  detailLoadedIds.delete(id)
}

/** Fetch full `payload` for one booking (drawer, export, edits). */
export const ensureBookingDetail = async (id: string): Promise<Booking | null> => {
  if (detailLoadedIds.has(id)) {
    return bookingsCache.find((b) => b.id === id) ?? null
  }

  const full = await fetchBookingById(id)
  if (full) {
    applyBookingToCache(full)
    return full
  }

  return bookingsCache.find((b) => b.id === id) ?? null
}

/** Force a fresh fetch (e.g. after a failed drawer load). Keeps the prior loaded flag until the fetch completes so the drawer does not flash an error state. */
export const reloadBookingDetail = async (id: string): Promise<Booking | null> => {
  const full = await fetchBookingById(id)
  if (full) {
    applyBookingToCache(full)
    return full
  }

  detailLoadedIds.delete(id)
  return bookingsCache.find((b) => b.id === id) ?? null
}

export const ensureBookingDetails = async (bookings: Booking[]): Promise<Booking[]> =>
  Promise.all(
    bookings.map(async (stub) => {
      if (detailLoadedIds.has(stub.id)) return stub
      return (await ensureBookingDetail(stub.id)) ?? stub
    })
  )

export const ensureBookingsHydrated = async (): Promise<Booking[]> => {
  if (!isSupabaseConfigured()) return bookingsCache
  if (hydratedFromRemote) return bookingsCache

  if (!hydratePromise) {
    hydratePromise = (async () => {
      clearDetailLoadedFlags()
      const { bookings: remote, fullPayload } = await fetchBookingsList()
      if (remote.length > 0) {
        bookingsCache = remote
        saveBookingsToLocal(bookingsCache)
        if (fullPayload) remote.forEach((b) => markBookingDetailLoaded(b.id))
      } else if (bookingsCache.length > 0 && import.meta.env.DEV) {
        await migrateLocalBookingsToRemote(bookingsCache)
        invalidateAvailabilityCache()
      }
      hydratedFromRemote = true
    })()
  }

  await hydratePromise
  return bookingsCache
}

const mergeListStubOntoDetail = (existing: Booking, stub: Booking): Booking => ({
  ...existing,
  status: stub.status,
  checkIn: stub.checkIn,
  checkOut: stub.checkOut,
  name: stub.name,
  email: stub.email,
  phone: stub.phone,
  roomType: stub.roomType,
  roomName: stub.roomName,
  rooms: stub.rooms ?? existing.rooms,
  adults: stub.adults,
  children: stub.children,
  totalGuests: stub.totalGuests,
  specialRequests: stub.specialRequests,
  payment: {
    ...(existing.payment ?? {}),
    amount: stub.payment.amount,
    status: stub.payment.status,
    discount: stub.payment.discount ?? existing.payment?.discount,
    transactions: existing.payment?.transactions,
    method: existing.payment?.method,
    transactionId: existing.payment?.transactionId,
    paidAt: existing.payment?.paidAt,
    notes: existing.payment?.notes,
  },
  createdAt: stub.createdAt,
  updatedAt: stub.updatedAt,
})

/** Re-fetch list rows and merge into cache without dropping full payloads already loaded. */
export const refreshBookingsList = async (): Promise<Booking[]> => {
  if (!isSupabaseConfigured()) return bookingsCache

  const { bookings: remote, fullPayload } = await fetchBookingsList()
  if (remote.length === 0) return bookingsCache

  if (fullPayload) {
    bookingsCache = remote
    saveBookingsToLocal(bookingsCache)
    remote.forEach((b) => markBookingDetailLoaded(b.id))
    return bookingsCache
  }

  const existingById = new Map(bookingsCache.map((b) => [b.id, b]))
  bookingsCache = remote.map((stub) => {
    const existing = existingById.get(stub.id)
    if (existing && detailLoadedIds.has(stub.id)) {
      return mergeListStubOntoDetail(existing, stub)
    }
    return stub
  })
  saveBookingsToLocal(bookingsCache)
  return bookingsCache
}

export class BookingPersistError extends Error {
  constructor(message = 'Could not save your booking to our server. Please try again or contact us.') {
    super(message)
    this.name = 'BookingPersistError'
  }
}

export class BookingInventoryConflictError extends BookingPersistError {
  constructor(
    message = 'One or more rooms are no longer available for these dates. Please choose different rooms or dates.'
  ) {
    super(message)
    this.name = 'BookingInventoryConflictError'
  }
}

export class BookingDuplicateIdError extends BookingPersistError {
  constructor(message = 'Booking ID already exists.') {
    super(message)
    this.name = 'BookingDuplicateIdError'
  }
}

export class BookingRateLimitError extends BookingPersistError {
  constructor(
    message = 'Rate limit exceeded. Please try again in about an hour or contact us by phone or WhatsApp.'
  ) {
    super(message)
    this.name = 'BookingRateLimitError'
  }
}

const persistBookingRemote = async (booking: Booking): Promise<void> => {
  const supabase = getSupabase()
  const session = supabase ? (await supabase.auth.getSession()).data.session : null
  const result = session?.user
    ? await upsertBookingIfAvailable(booking)
    : await insertBookingIfAvailable(booking)

  if (result.ok) return
  if (result.error === 'inventory_unavailable') {
    throw new BookingInventoryConflictError()
  }
  if (result.error === 'duplicate_id') {
    throw new BookingDuplicateIdError()
  }
  if (result.error === 'rate_limit_exceeded') {
    throw new BookingRateLimitError()
  }
  throw new BookingPersistError()
}

export const persistBooking = async (booking: Booking): Promise<void> => {
  const index = bookingsCache.findIndex((b) => b.id === booking.id)
  const cacheBefore = [...bookingsCache]
  const previousAtIndex = index === -1 ? null : bookingsCache[index]

  if (index === -1) bookingsCache = [...bookingsCache, booking]
  else {
    const next = [...bookingsCache]
    next[index] = booking
    bookingsCache = next
  }
  saveBookingsToLocal(bookingsCache)
  markBookingDetailLoaded(booking.id)
  if (isSupabaseConfigured()) {
    try {
      await persistBookingRemote(booking)
    } catch (e) {
      if (previousAtIndex) {
        const next = [...bookingsCache]
        const idx = next.findIndex((b) => b.id === booking.id)
        if (idx !== -1) {
          next[idx] = previousAtIndex
          bookingsCache = next
        } else {
          bookingsCache = cacheBefore
        }
      } else {
        bookingsCache = bookingsCache.filter((b) => b.id !== booking.id)
      }
      saveBookingsToLocal(bookingsCache)
      detailLoadedIds.delete(booking.id)
      throw e
    }
    invalidateAvailabilityCache()
  }
}

export const persistAllBookings = async (bookings: Booking[]): Promise<void> => {
  const cacheBefore = [...bookingsCache]
  bookingsCache = bookings
  saveBookingsToLocal(bookings)
  bookings.forEach((b) => markBookingDetailLoaded(b.id))
  if (!isSupabaseConfigured()) return

  for (const booking of bookings) {
    try {
      await persistBookingRemote(booking)
    } catch (e) {
      bookingsCache = cacheBefore
      saveBookingsToLocal(cacheBefore)
      throw e instanceof BookingPersistError
        ? e
        : new BookingPersistError('Could not sync all bookings to the server.')
    }
  }
  invalidateAvailabilityCache()
}

export const removeBooking = async (id: string): Promise<void> => {
  bookingsCache = bookingsCache.filter((b) => b.id !== id)
  saveBookingsToLocal(bookingsCache)
  if (isSupabaseConfigured()) {
    await deleteBookingRemote(id)
    invalidateAvailabilityCache()
  }
}

export const resetBookingsHydration = (): void => {
  hydratedFromRemote = false
  hydratePromise = null
  clearDetailLoadedFlags()
}
