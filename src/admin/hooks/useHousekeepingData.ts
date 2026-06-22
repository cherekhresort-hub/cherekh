import { useCallback, useEffect, useState } from 'react'
import {
  HOUSEKEEPING_CHANGED_EVENT,
  loadHousekeepingTasks,
  upsertHousekeepingTask,
} from '../../lib/housekeepingDb'
import type { HousekeepingTask } from '../types'

export const useHousekeepingData = () => {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const loaded = await loadHousekeepingTasks()
    setTasks(loaded)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const onChange = () => {
      void refresh()
    }
    window.addEventListener(HOUSEKEEPING_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(HOUSEKEEPING_CHANGED_EVENT, onChange)
  }, [refresh])

  const saveTask = useCallback(async (task: HousekeepingTask): Promise<boolean> => {
    setTasks((prev) => prev.map((entry) => (entry.id === task.id ? task : entry)))
    const synced = await upsertHousekeepingTask(task)
    if (!synced) await refresh()
    return synced
  }, [refresh])

  return { tasks, loading, saveTask, refresh }
}
