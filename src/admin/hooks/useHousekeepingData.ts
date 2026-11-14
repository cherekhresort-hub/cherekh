import { useCallback, useEffect, useState } from 'react'
import {
  HOUSEKEEPING_CHANGED_EVENT,
  loadHousekeepingTasks,
  upsertHousekeepingTask,
} from '../../lib/housekeepingDb'
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase'
import type { HousekeepingTask } from '../types'

let channelSeq = 0

/** Housekeeping board tasks. Pass `enabled: false` for roles that cannot read housekeeping. */
export const useHousekeepingData = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([])
  const [loading, setLoading] = useState(enabled)

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true)
    const loaded = await loadHousekeepingTasks()
    setTasks(loaded)
    setLoading(false)
  }, [])

  const refresh = useCallback(() => load(false), [load])

  useEffect(() => {
    if (!enabled) return
    void load(false)
    const onChange = () => {
      void load(true)
    }
    window.addEventListener(HOUSEKEEPING_CHANGED_EVENT, onChange)

    const supabase = isSupabaseConfigured() ? getSupabase() : null
    const channel = supabase
      ?.channel(`housekeeping-changes-${++channelSeq}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'housekeeping_tasks' }, onChange)
      .subscribe()

    return () => {
      window.removeEventListener(HOUSEKEEPING_CHANGED_EVENT, onChange)
      if (supabase && channel) void supabase.removeChannel(channel)
    }
  }, [enabled, load])

  const saveTask = useCallback(async (task: HousekeepingTask): Promise<boolean> => {
    setTasks((prev) => prev.map((entry) => (entry.id === task.id ? task : entry)))
    const synced = await upsertHousekeepingTask(task)
    if (!synced) await load(true)
    return synced
  }, [load])

  return { tasks, loading, saveTask, refresh }
}
