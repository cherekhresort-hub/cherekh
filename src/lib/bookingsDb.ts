import type { Booking, BookingRoomLine } from '../utils/bookings'
import { bookingFromListRow, type BookingListRow } from './bookingList'
import { getSupabase, isSupabaseConfigured } from './supabase'

const STORAGE_KEY = 'cherekh_bookings'

export type BookingRow = {
  id: string
  payload: Booking
  status: string
  check_in: string
  check_out: string
  guest_email: string | null
  guest_phone: string | null
  created_at: string
  updated_at: string
}

export type AvailabilityRow = {
  id: string
  status: string
  check_in: string
  check_out: string
  rooms: BookingRoomLine[] | unknown
}

const rowFromBooking = (booking: Booking): Omit<BookingRow, 'created_at' | 'updated_at'> => ({
  id: booking.id,
  payload: booking,
  status: booking.status,
  check_in: booking.checkIn,
  check_out: booking.checkOut,
  guest_email: booking.email || null,
  guest_phone: booking.phone || null,
})

export const loadBookingsFromLocal = (): Booking[] => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as Booking[]) : []
  } catch {
    return []
  }
}

export const saveBookingsToLocal = (bookings: Booking[]): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
}

export const fetchAllBookings = async (): Promise<Booking[]> => {
  const supabase = getSupabase()
  if (!supabase) return loadBookingsFromLocal()

  const { data, error } = await supabase
    .from('bookings')
    .select('payload')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[Supabase] fetch bookings:', error.message)
    return loadBookingsFromLocal()
  }

  return (data ?? []).map((row) => row.payload as Booking)
}

export type BookingsListFetch = {
  bookings: Booking[]
  /** True when the client received full `payload` rows (fallback path). */
  fullPayload: boolean
}

/** Admin list hydration — uses `bookings_list` view (small rows, no full JSON payload). */
export const fetchBookingsList = async (): Promise<BookingsListFetch> => {
  const supabase = getSupabase()
  if (!supabase) {
    const local = loadBookingsFromLocal()
    return { bookings: local, fullPayload: local.length > 0 }
  }

  const { data, error } = await supabase
    .from('bookings_list')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    console.warn('[Supabase] bookings_list unavailable, falling back to full payload:', error.message)
    const bookings = await fetchAllBookings()
    return { bookings, fullPayload: true }
  }

  return {
    bookings: (data ?? []).map((row) => bookingFromListRow(row as BookingListRow)),
    fullPayload: false,
  }
}

/** Guest thank-you: load booking when id + email match (anon-safe RPC). */
export const fetchBookingConfirmation = async (
  id: string,
  email: string
): Promise<Booking | null> => {
  const supabase = getSupabase()
  if (!supabase || !id || !email.trim()) return null

  const { data, error } = await supabase.rpc('get_booking_confirmation', {
    p_id: id,
    p_email: email.trim(),
  })

  if (error) {
    console.error('[Supabase] booking confirmation:', error.message)
    return null
  }

  return data ? (data as Booking) : null
}

export const fetchBookingById = async (id: string): Promise<Booking | null> => {
  const supabase = getSupabase()
  if (!supabase) {
    return loadBookingsFromLocal().find((b) => b.id === id) ?? null
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('payload')
    .eq('id', id)
    .maybeSingle()

  if (!error && data?.payload) {
    return data.payload as Booking
  }

  if (error) {
    console.warn('[Supabase] fetch booking direct:', error.message)
  }

  const { data: rpcPayload, error: rpcError } = await supabase.rpc('get_staff_booking', {
    p_id: id,
  })

  if (!rpcError && rpcPayload) {
    return rpcPayload as Booking
  }

  if (rpcError) {
    console.error('[Supabase] get_staff_booking:', rpcError.message)
  }

  return loadBookingsFromLocal().find((b) => b.id === id) ?? null
}

export class AvailabilityLoadError extends Error {
  constructor(message = 'Could not load room availability') {
    super(message)
    this.name = 'AvailabilityLoadError'
  }
}

export const fetchAvailabilityRows = async (): Promise<AvailabilityRow[]> => {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase.rpc('list_booking_availability')

  if (error) {
    console.error('[Supabase] list_booking_availability:', error.message)
    throw new AvailabilityLoadError(error.message)
  }

  return (data ?? []) as AvailabilityRow[]
}

export type BookingRemotePersistResult =
  | { ok: true }
  | {
      ok: false
      error: 'inventory_unavailable' | 'forbidden' | 'duplicate_id' | 'rate_limit_exceeded' | 'unknown'
    }

const parseRpcPersistResult = (data: unknown): BookingRemotePersistResult => {
  if (!data || typeof data !== 'object') return { ok: false, error: 'unknown' }
  const row = data as { ok?: boolean; error?: string }
  if (row.ok === true) return { ok: true }
  const err = row.error
  if (
    err === 'inventory_unavailable' ||
    err === 'forbidden' ||
    err === 'duplicate_id' ||
    err === 'rate_limit_exceeded'
  ) {
    return { ok: false, error: err }
  }
  return { ok: false, error: 'unknown' }
}

/** Guest / anonymous insert with row lock + inventory check (migration 009). */
export const insertBookingIfAvailable = async (booking: Booking): Promise<BookingRemotePersistResult> => {
  const supabase = getSupabase()
  if (!supabase) return { ok: true }

  const { data, error } = await supabase.rpc('insert_booking_if_available', {
    p_id: booking.id,
    p_payload: booking,
    p_check_in: booking.checkIn,
    p_check_out: booking.checkOut,
    p_guest_email: booking.email || null,
    p_guest_phone: booking.phone || null,
  })

  if (error) {
    console.error('[Supabase] insert_booking_if_available:', error.message)
    return { ok: false, error: 'unknown' }
  }
  return parseRpcPersistResult(data)
}

/** Staff upsert with inventory check (migration 009). */
export const upsertBookingIfAvailable = async (booking: Booking): Promise<BookingRemotePersistResult> => {
  const supabase = getSupabase()
  if (!supabase) return { ok: true }

  const { data, error } = await supabase.rpc('upsert_booking_if_available', {
    p_id: booking.id,
    p_payload: booking,
    p_status: booking.status,
    p_check_in: booking.checkIn,
    p_check_out: booking.checkOut,
    p_guest_email: booking.email || null,
    p_guest_phone: booking.phone || null,
  })

  if (error) {
    console.error('[Supabase] upsert_booking_if_available:', error.message)
    return { ok: false, error: 'unknown' }
  }
  return parseRpcPersistResult(data)
}

export const updateBookingStatusRemote = async (
  id: string,
  status: Booking['status']
): Promise<
  | { ok: true; payload: Booking }
  | { ok: false; error: 'inventory_unavailable' | 'forbidden' | 'not_found' | 'unknown' }
> => {
  const supabase = getSupabase()
  if (!supabase) return { ok: false, error: 'unknown' }

  const { data, error } = await supabase.rpc('update_booking_status_safe', {
    p_id: id,
    p_status: status,
  })

  if (error) {
    console.error('[Supabase] update_booking_status_safe:', error.message)
    return { ok: false, error: 'unknown' }
  }

  if (!data || typeof data !== 'object') return { ok: false, error: 'unknown' }
  const row = data as { ok?: boolean; error?: string; payload?: Booking }
  if (row.ok === true && row.payload) {
    return { ok: true, payload: row.payload as Booking }
  }
  if (row.error === 'inventory_unavailable' || row.error === 'forbidden' || row.error === 'not_found') {
    return { ok: false, error: row.error }
  }
  return { ok: false, error: 'unknown' }
}

export const checkoutPastConfirmedBookingsRemote = async (): Promise<number> => {
  const supabase = getSupabase()
  if (!supabase) return 0

  const { data, error } = await supabase.rpc('checkout_past_confirmed_bookings')
  if (error) {
    console.error('[Supabase] checkout_past_confirmed_bookings:', error.message)
    return 0
  }
  return typeof data === 'number' ? data : 0
}

/** @deprecated Prefer insertBookingIfAvailable / upsertBookingIfAvailable */
export const upsertBookingRemote = async (booking: Booking): Promise<boolean> => {
  const result = await upsertBookingIfAvailable(booking)
  return result.ok
}

export const deleteBookingRemote = async (id: string): Promise<boolean> => {
  const supabase = getSupabase()
  if (!supabase) return true

  const { error } = await supabase.from('bookings').delete().eq('id', id)
  if (error) {
    console.error('[Supabase] delete booking:', error.message)
    return false
  }
  return true
}

export const migrateLocalBookingsToRemote = async (bookings: Booking[]): Promise<void> => {
  if (!isSupabaseConfigured() || bookings.length === 0) return

  const supabase = getSupabase()
  if (!supabase) return

  const rows = bookings.map((b) => ({
    ...rowFromBooking(b),
    created_at: b.createdAt,
    updated_at: b.updatedAt,
  }))

  const { error } = await supabase.from('bookings').upsert(rows, { onConflict: 'id' })
  if (error) console.error('[Supabase] migrate bookings:', error.message)
}

/** Map availability view rows into minimal booking shapes for room overlap logic. */
export const availabilityRowsToBookings = (rows: AvailabilityRow[]): Booking[] =>
  rows.map((row) => {
    const rooms = Array.isArray(row.rooms) ? (row.rooms as BookingRoomLine[]) : []
    const first = rooms[0]
    return {
      id: row.id,
      checkIn: row.check_in,
      checkOut: row.check_out,
      status: row.status as Booking['status'],
      adults: first?.adults ?? 0,
      children: first?.children ?? 0,
      totalGuests: first?.totalGuests ?? 0,
      roomType: first?.roomType ?? '',
      roomName: first?.roomName ?? '',
      rooms,
      name: '',
      email: '',
      phone: '',
      specialRequests: '',
      notes: [],
      payment: { amount: 0, status: 'pending' },
      createdAt: '',
      updatedAt: '',
    }
  })
