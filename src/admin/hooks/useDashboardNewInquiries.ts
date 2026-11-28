import { useCallback, useEffect, useId, useState } from 'react'
import {
  CONTACT_INQUIRIES_CHANGED_EVENT,
  listNewContactInquiries,
  type ContactInquiry,
} from '../../lib/contactInquiries'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

/**
 * Fresh website inquiries (status `new`) for the dashboard panel.
 * Refreshes on local mutations and realtime table changes.
 */
export const useDashboardNewInquiries = (enabled: boolean) => {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([])
  const [loading, setLoading] = useState(enabled)
  const channelId = useId()

  const refresh = useCallback(async () => {
    if (!enabled) {
      setInquiries([])
      setLoading(false)
      return
    }

    try {
      const rows = await listNewContactInquiries(8)
      setInquiries(rows)
    } catch {
      // Keep last good list on transient errors.
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    setLoading(enabled)
    void refresh()
  }, [enabled, refresh])

  useEffect(() => {
    if (!enabled) return

    const onChange = () => {
      void refresh()
    }
    window.addEventListener(CONTACT_INQUIRIES_CHANGED_EVENT, onChange)

    if (!isSupabaseConfigured()) {
      return () => window.removeEventListener(CONTACT_INQUIRIES_CHANGED_EVENT, onChange)
    }

    const supabase = getSupabase()
    if (!supabase) {
      return () => window.removeEventListener(CONTACT_INQUIRIES_CHANGED_EVENT, onChange)
    }

    const channel = supabase
      .channel(`dashboard-new-inquiries${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact_inquiries' },
        () => onChange()
      )
      .subscribe()

    return () => {
      window.removeEventListener(CONTACT_INQUIRIES_CHANGED_EVENT, onChange)
      void supabase.removeChannel(channel)
    }
  }, [channelId, enabled, refresh])

  return { inquiries, loading, count: inquiries.length }
}
