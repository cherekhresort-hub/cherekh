import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  CONTACT_INQUIRIES_CHANGED_EVENT,
  fetchNewInquiryCount,
} from '../../lib/contactInquiries'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

/**
 * New-inquiry count for the Inquiries nav badge (admins and managers).
 * Count stays until staff change status or delete — opening the page does not clear it.
 * `enabled: null` means role is still loading; keep the last known count.
 */
export const useInquiriesNavBadge = (enabled: boolean | null) => {
  const [newCount, setNewCount] = useState(0)
  const channelId = useId()
  const lastGood = useRef(0)

  const refresh = useCallback(async () => {
    if (enabled === false) {
      lastGood.current = 0
      setNewCount(0)
      return
    }
    if (enabled !== true) return

    try {
      const count = await fetchNewInquiryCount()
      lastGood.current = count
      setNewCount(count)
    } catch {
      // Keep the last successful count so a blip does not hide open inquiries.
      setNewCount(lastGood.current)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (enabled !== true) return

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
      .channel(`contact-inquiries-nav-badge${channelId}`)
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

  return newCount
}
