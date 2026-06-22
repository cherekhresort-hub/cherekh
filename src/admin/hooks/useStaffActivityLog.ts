import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import {
  computeActivityCounts,
  deleteActivityEntry,
  fetchStaffActivityLog,
  markActivityAsRead,
  markAllActivityAsRead,
  STAFF_ACTIVITY_EVENT,
  type StaffActivityCategory,
  type StaffActivityEntry,
} from '../../lib/staffActivityLog'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'

export type ActivityCategoryFilter = StaffActivityCategory | 'all'
export type ActivityReadFilter = 'all' | 'unread' | 'read'

const FETCH_LIMIT = 500

export const useStaffActivityLog = () => {
  const [entries, setEntries] = useState<StaffActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<ActivityCategoryFilter>('all')
  const [readFilter, setReadFilter] = useState<ActivityReadFilter>('all')
  const [actorEmail, setActorEmail] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchStaffActivityLog({ limit: FETCH_LIMIT })
      setEntries(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity log.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onActivity = () => {
      void refresh()
    }
    window.addEventListener(STAFF_ACTIVITY_EVENT, onActivity)

    if (!isSupabaseConfigured()) {
      return () => window.removeEventListener(STAFF_ACTIVITY_EVENT, onActivity)
    }

    const supabase = getSupabase()
    if (!supabase) {
      return () => window.removeEventListener(STAFF_ACTIVITY_EVENT, onActivity)
    }

    const channel = supabase
      .channel('staff-activity-log')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_activity_log' },
        () => onActivity()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_activity_reads' },
        () => onActivity()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'staff_activity_log' },
        () => onActivity()
      )
      .subscribe()

    return () => {
      window.removeEventListener(STAFF_ACTIVITY_EVENT, onActivity)
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const counts = useMemo(() => computeActivityCounts(entries), [entries])

  const filtered = useMemo(() => {
    let list = entries
    if (category !== 'all') {
      list = list.filter((entry) => entry.category === category)
    }
    if (readFilter === 'unread') {
      list = list.filter((entry) => !entry.read)
    } else if (readFilter === 'read') {
      list = list.filter((entry) => entry.read)
    }
    if (actorEmail.trim()) {
      const q = actorEmail.trim().toLowerCase()
      list = list.filter((entry) => entry.actorEmail.toLowerCase().includes(q))
    }
    return list
  }, [actorEmail, category, entries, readFilter])

  const markRead = useCallback(
    async (activityId: string) => {
      await markActivityAsRead(activityId)
      setEntries((prev) =>
        prev.map((entry) => (entry.id === activityId ? { ...entry, read: true } : entry))
      )
    },
    []
  )

  const markAllRead = useCallback(async () => {
    const unreadIds = entries.filter((entry) => !entry.read).map((entry) => entry.id)
    await markAllActivityAsRead(unreadIds)
    setEntries((prev) => prev.map((entry) => ({ ...entry, read: true })))
  }, [entries])

  const removeEntry = useCallback(async (activityId: string): Promise<boolean> => {
    const ok = await deleteActivityEntry(activityId)
    if (ok) {
      setEntries((prev) => prev.filter((entry) => entry.id !== activityId))
    }
    return ok
  }, [])

  return {
    entries: filtered,
    allEntries: entries,
    counts,
    loading,
    error,
    category,
    setCategory,
    readFilter,
    setReadFilter,
    actorEmail,
    setActorEmail,
    refresh,
    markRead,
    markAllRead,
    removeEntry,
  }
}

/** Unread count for the Activity nav badge (admin only). */
export const useActivityNavBadge = (enabled: boolean) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const channelId = useId()

  const refresh = useCallback(async () => {
    if (!enabled) {
      setUnreadCount(0)
      return
    }
    try {
      const rows = await fetchStaffActivityLog({ limit: FETCH_LIMIT })
      setUnreadCount(computeActivityCounts(rows).unread)
    } catch {
      setUnreadCount(0)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!enabled) return

    const onActivity = () => {
      void refresh()
    }
    window.addEventListener(STAFF_ACTIVITY_EVENT, onActivity)

    if (!isSupabaseConfigured()) {
      return () => window.removeEventListener(STAFF_ACTIVITY_EVENT, onActivity)
    }

    const supabase = getSupabase()
    if (!supabase) {
      return () => window.removeEventListener(STAFF_ACTIVITY_EVENT, onActivity)
    }

    const channel = supabase
      .channel(`staff-activity-nav-badge${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_activity_log' },
        () => onActivity()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'staff_activity_reads' },
        () => onActivity()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'staff_activity_log' },
        () => onActivity()
      )
      .subscribe()

    return () => {
      window.removeEventListener(STAFF_ACTIVITY_EVENT, onActivity)
      void supabase.removeChannel(channel)
    }
  }, [channelId, enabled, refresh])

  return unreadCount
}
