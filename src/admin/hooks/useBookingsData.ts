import { useCallback, useEffect, useState } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import {
  applyBookingToCache,
  ensureBookingsHydrated,
  refreshBookingsList,
  removeBookingFromCache,
} from '../../lib/bookingsStore'
import { fetchBookingById, type BookingRow } from '../../lib/bookingsDb'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import { autoUpdateCheckedOutBookings, getBookings, type Booking } from '../../utils/bookings'

const bookingFromRow = (row: BookingRow): Booking | null => {
  if (row.payload && typeof row.payload === 'object') {
    return row.payload as Booking
  }
  return null
}

const applyRealtimeChange = async (
  payload: RealtimePostgresChangesPayload<BookingRow>
): Promise<void> => {
  if (payload.eventType === 'DELETE') {
    const id = payload.old?.id
    if (id) removeBookingFromCache(id)
    return
  }

  const row = payload.new
  if (!row?.id) return

  const fromPayload = row ? bookingFromRow(row) : null
  if (fromPayload) {
    applyBookingToCache(fromPayload)
    return
  }

  const booking = await fetchBookingById(row.id)
  if (booking) applyBookingToCache(booking)
}

/** Fallback when Realtime is not delivering: re-read list rows while the tab is visible. */
const BACKGROUND_REFRESH_MS = 15_000
const FOCUS_REFRESH_MIN_GAP_MS = 3_000

let channelSeq = 0

export const useBookingsData = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const syncFromCache = useCallback(() => {
    setBookings(getBookings())
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let inFlight = false
    let lastRun = Date.now()

    const quietRefresh = async () => {
      if (inFlight || document.visibilityState !== 'visible') return
      inFlight = true
      lastRun = Date.now()
      try {
        await refreshBookingsList()
        syncFromCache()
      } catch {
        // Offline or transient error; the next tick retries.
      } finally {
        inFlight = false
      }
    }

    const onFocus = () => {
      if (Date.now() - lastRun < FOCUS_REFRESH_MIN_GAP_MS) return
      void quietRefresh()
    }

    const timer = window.setInterval(() => void quietRefresh(), BACKGROUND_REFRESH_MS)
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    window.addEventListener('online', onFocus)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('online', onFocus)
    }
  }, [syncFromCache])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await ensureBookingsHydrated()
      await autoUpdateCheckedOutBookings()
      await refreshBookingsList()
      syncFromCache()
    } finally {
      setLoading(false)
    }
  }, [syncFromCache])

  useEffect(() => {
    void refresh()

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cherekh_bookings') syncFromCache()
    }
    window.addEventListener('storage', onStorage)

    if (!isSupabaseConfigured()) {
      return () => window.removeEventListener('storage', onStorage)
    }

    const supabase = getSupabase()
    if (!supabase) {
      return () => window.removeEventListener('storage', onStorage)
    }

    const channel = supabase
      .channel(`bookings-changes-${++channelSeq}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          void applyRealtimeChange(payload as RealtimePostgresChangesPayload<BookingRow>).then(
            syncFromCache
          )
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('storage', onStorage)
      void supabase.removeChannel(channel)
    }
  }, [refresh, syncFromCache])

  return { bookings, loading, refresh }
}
