import type { HousekeepingLogEntry, HousekeepingTask } from '../admin/types'
import { buildDefaultHousekeepingTasks } from '../admin/data/housekeeping'
import { getSupabase, isSupabaseConfigured } from './supabase'

const CACHE_KEY = 'cherekh_housekeeping_cache'
export const HOUSEKEEPING_CHANGED_EVENT = 'housekeeping-changed'

type HousekeepingTaskRow = {
  id: string
  room_id: string
  room_number: string
  assigned_staff_id?: string | null
  assigned_to: string | null
  status: HousekeepingTask['status']
  priority: HousekeepingTask['priority']
  estimated_minutes: number
  started_at: string | null
  completed_at: string | null
  notes: string | null
  updated_at: string
}

type HousekeepingLogRow = {
  id: number
  task_id: string
  room_id: string
  room_number: string
  event: HousekeepingLogEntry['event']
  from_status: HousekeepingLogEntry['fromStatus'] | null
  to_status: HousekeepingLogEntry['toStatus'] | null
  assigned_staff_id: string | null
  assigned_to: string | null
  started_at: string | null
  completed_at: string | null
  duration_minutes: number | null
  reason: string | null
  booking_id: string | null
  actor_email: string | null
  created_at: string
}

let memoryCache: HousekeepingTask[] | null = null
/** False until migration 064 adds housekeeping_tasks.assigned_staff_id. */
let staffIdColumnAvailable = true

const rowToTask = (row: HousekeepingTaskRow): HousekeepingTask => ({
  id: row.id,
  roomId: row.room_id,
  roomNumber: row.room_number,
  assignedStaffId: row.assigned_staff_id ?? undefined,
  assignedTo: row.assigned_to ?? undefined,
  status: row.status,
  priority: row.priority,
  estimatedMinutes: row.estimated_minutes,
  startedAt: row.started_at ?? undefined,
  completedAt: row.completed_at ?? undefined,
  notes: row.notes ?? undefined,
  updatedAt: row.updated_at ?? undefined,
})

const taskToRow = (task: HousekeepingTask): Omit<HousekeepingTaskRow, 'updated_at'> => {
  const row: Omit<HousekeepingTaskRow, 'updated_at'> = {
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
  }
  if (staffIdColumnAvailable) row.assigned_staff_id = task.assignedStaffId || null
  return row
}

const rowToLogEntry = (row: HousekeepingLogRow): HousekeepingLogEntry => ({
  id: row.id,
  taskId: row.task_id,
  roomId: row.room_id,
  roomNumber: row.room_number,
  event: row.event,
  fromStatus: row.from_status ?? undefined,
  toStatus: row.to_status ?? undefined,
  assignedStaffId: row.assigned_staff_id ?? undefined,
  assignedTo: row.assigned_to ?? undefined,
  startedAt: row.started_at ?? undefined,
  completedAt: row.completed_at ?? undefined,
  durationMinutes: row.duration_minutes ?? undefined,
  reason: row.reason ?? undefined,
  bookingId: row.booking_id ?? undefined,
  actorEmail: row.actor_email ?? undefined,
  createdAt: row.created_at,
})

const isMissingStaffIdColumn = (error: { message?: string; code?: string }): boolean =>
  (error.message ?? '').includes('assigned_staff_id')

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

  const rows = data as HousekeepingTaskRow[]
  staffIdColumnAvailable = 'assigned_staff_id' in rows[0]
  const tasks = mergeTasksWithCatalog(rows.map(rowToTask))
  const existingRoomIds = new Set(rows.map((row) => row.room_id))
  const missing = tasks.filter((task) => !existingRoomIds.has(task.roomId))
  if (missing.length > 0) {
    await upsertHousekeepingTasks(missing)
  }

  memoryCache = tasks
  writeLocalCache(tasks)
  return tasks
}

const upsertRows = async (tasks: HousekeepingTask[]): Promise<string | null> => {
  const supabase = getSupabase()
  if (!supabase) return 'Supabase unavailable'

  const send = () => {
    const now = new Date().toISOString()
    return supabase.from('housekeeping_tasks').upsert(
      tasks.map((task) => ({ ...taskToRow(task), updated_at: now })),
      { onConflict: 'id' }
    )
  }

  let { error } = await send()
  if (error && staffIdColumnAvailable && isMissingStaffIdColumn(error)) {
    staffIdColumnAvailable = false
    ;({ error } = await send())
  }
  return error ? error.message : null
}

export const upsertHousekeepingTask = async (task: HousekeepingTask): Promise<boolean> => {
  const base = memoryCache ?? readLocalCache() ?? buildDefaultHousekeepingTasks()
  const next = base.map((entry) => (entry.id === task.id ? task : entry))
  memoryCache = next
  writeLocalCache(next)

  if (!isSupabaseConfigured()) return true

  const error = await upsertRows([task])
  if (error) {
    console.error('[Supabase] upsert housekeeping_tasks:', error)
    return false
  }
  return true
}

export const upsertHousekeepingTasks = async (tasks: HousekeepingTask[]): Promise<boolean> => {
  if (tasks.length === 0) return true

  memoryCache = mergeTasksWithCatalog(tasks)
  writeLocalCache(memoryCache)

  if (!isSupabaseConfigured()) return true

  const error = await upsertRows(tasks)
  if (error) {
    console.error('[Supabase] bulk upsert housekeeping_tasks:', error)
    return false
  }
  return true
}

export type HousekeepingLogResult =
  | { available: true; entries: HousekeepingLogEntry[] }
  | { available: false; entries: []; message: string }

/** Cleaning history since `sinceIso` (newest first). Needs migration 064. */
export const loadHousekeepingLog = async (sinceIso: string): Promise<HousekeepingLogResult> => {
  const unavailable = (message: string): HousekeepingLogResult => ({ available: false, entries: [], message })
  if (!isSupabaseConfigured()) return unavailable('Cleaning history needs Supabase.')
  const supabase = getSupabase()
  if (!supabase) return unavailable('Cleaning history needs Supabase.')

  const entries: HousekeepingLogEntry[] = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('housekeeping_log')
      .select('*')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)
    if (error) {
      const missing =
        error.code === '42P01' || error.code === 'PGRST205' || (error.message ?? '').includes('housekeeping_log')
      console.error('[Supabase] fetch housekeeping_log:', error.message)
      return unavailable(
        missing
          ? 'Apply migration 064_housekeeping_workflow.sql to start recording cleaning history.'
          : `Could not load cleaning history: ${error.message}`
      )
    }
    const rows = (data ?? []) as HousekeepingLogRow[]
    entries.push(...rows.map(rowToLogEntry))
    if (rows.length < pageSize) break
  }
  return { available: true, entries }
}
