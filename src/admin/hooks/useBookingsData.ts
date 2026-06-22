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

export const useBookingsData = () => {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const syncFromCache = useCallback(() => {
    setBookings(getBookings())
  }, [])

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
      .channel('bookings-changes')
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
