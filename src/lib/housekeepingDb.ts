import type { HousekeepingTask } from '../admin/types'
import { buildDefaultHousekeepingTasks } from '../admin/data/housekeeping'
import { getSupabase, isSupabaseConfigured } from './supabase'

const CACHE_KEY = 'cherekh_housekeeping_cache'
export const HOUSEKEEPING_CHANGED_EVENT = 'housekeeping-changed'

type HousekeepingTaskRow = {
  id: string
  room_id: string
  room_number: string
  assigned_to: string | null
  status: HousekeepingTask['status']
  priority: HousekeepingTask['priority']
  estimated_minutes: number
  started_at: string | null
  completed_at: string | null
  notes: string | null
  updated_at: string
}

let memoryCache: HousekeepingTask[] | null = null

const rowToTask = (row: HousekeepingTaskRow): HousekeepingTask => ({
  id: row.id,
  roomId: row.room_id,
  roomNumber: row.room_number,
  assignedTo: row.assigned_to ?? undefined,
  status: row.status,
  priority: row.priority,
  estimatedMinutes: row.estimated_minutes,
  startedAt: row.started_at ?? undefined,
  completedAt: row.completed_at ?? undefined,
  notes: row.notes ?? undefined,
})

const taskToRow = (task: HousekeepingTask): Omit<HousekeepingTaskRow, 'updated_at'> => ({
  id: task.id,
  room_id: task.roomId,
  room_number: task.roomNumber,
  assigned_to: task.assignedTo?.trim() || null,
  status: task.status,
  priority: task.priority,
  estimated_minutes: Math.max(0, Math.round(task.estimatedMinutes)),
  started_at: task.startedAt ?? null,
  completed_at: task.completedAt ?? null,
  notes: task.notes?.trim() || null,
})

const readLocalCache = (): HousekeepingTask[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as HousekeepingTask[]) : null
  } catch {
    return null
  }
}

const writeLocalCache = (tasks: HousekeepingTask[]): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CACHE_KEY, JSON.stringify(tasks))
}

const mergeTasksWithCatalog = (tasks: HousekeepingTask[]): HousekeepingTask[] => {
  const byRoomId = new Map(tasks.map((task) => [task.roomId, task]))
  return buildDefaultHousekeepingTasks().map(
    (defaultTask) => byRoomId.get(defaultTask.roomId) ?? defaultTask
  )
}

export const notifyHousekeepingChanged = (): void => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HOUSEKEEPING_CHANGED_EVENT))
}

/** Load housekeeping board from Supabase (seed per-room tasks on first run). */
export const loadHousekeepingTasks = async (): Promise<HousekeepingTask[]> => {
  const fallback = (): HousekeepingTask[] => {
    const cached = readLocalCache()
    if (cached?.length) return mergeTasksWithCatalog(cached)
    const defaults = buildDefaultHousekeepingTasks()
    memoryCache = defaults
    writeLocalCache(defaults)
    return defaults
  }

  if (!isSupabaseConfigured()) return fallback()

  const supabase = getSupabase()
  if (!supabase) return fallback()

  const { data, error } = await supabase
    .from('housekeeping_tasks')
    .select('*')
    .order('room_number')

  if (error) {
    console.error('[Supabase] fetch housekeeping_tasks:', error.message)
    return fallback()
  }

  if (!data || data.length === 0) {
    const defaults = buildDefaultHousekeepingTasks()
    await upsertHousekeepingTasks(defaults)
    memoryCache = defaults
    writeLocalCache(defaults)
    return defaults
  }

  const tasks = mergeTasksWithCatalog((data as HousekeepingTaskRow[]).map(rowToTask))
  const existingRoomIds = new Set((data as HousekeepingTaskRow[]).map((row) => row.room_id))
  const missing = tasks.filter((task) => !existingRoomIds.has(task.roomId))
  if (missing.length > 0) {
    await upsertHousekeepingTasks(missing)
  }

  memoryCache = tasks
  writeLocalCache(tasks)
  return tasks
}

export const upsertHousekeepingTask = async (task: HousekeepingTask): Promise<boolean> => {
  const base = memoryCache ?? readLocalCache() ?? buildDefaultHousekeepingTasks()
  const next = base.map((entry) => (entry.id === task.id ? task : entry))
  memoryCache = next
  writeLocalCache(next)

  if (!isSupabaseConfigured()) return true

  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase.from('housekeeping_tasks').upsert(
    {
      ...taskToRow(task),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[Supabase] upsert housekeeping_tasks:', error.message)
    return false
  }

  return true
}

export const upsertHousekeepingTasks = async (tasks: HousekeepingTask[]): Promise<boolean> => {
  if (tasks.length === 0) return true

  memoryCache = mergeTasksWithCatalog(tasks)
  writeLocalCache(memoryCache)

  if (!isSupabaseConfigured()) return true

  const supabase = getSupabase()
  if (!supabase) return false

  const now = new Date().toISOString()
  const { error } = await supabase.from('housekeeping_tasks').upsert(
    tasks.map((task) => ({
      ...taskToRow(task),
      updated_at: now,
    })),
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[Supabase] bulk upsert housekeeping_tasks:', error.message)
    return false
  }

  return true
}
