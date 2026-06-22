import { useEffect } from 'react'
import { ensureBookingsHydrated } from '../lib/bookingsStore'
import { isSupabaseConfigured } from '../lib/supabase'

/** Admin only: loads full bookings from Supabase once (or migrates local data). */
export const BookingsBootstrap = () => {
  useEffect(() => {
    if (isSupabaseConfigured()) {
      void ensureBookingsHydrated()
    }
  }, [])

  return null
}
