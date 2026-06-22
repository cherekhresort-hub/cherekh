import { getActiveStaffRole } from './permissions'
import type { StaffRole } from './roles'
import { getSupabase, isSupabaseConfigured } from './supabase'

export type StaffActivityCategory =
  | 'booking'
  | 'housekeeping'
  | 'guest'
  | 'staff'
  | 'inquiry'
  | 'settings'
  | 'team'
  | 'system'

export type LogStaffActivityInput = {
  category: StaffActivityCategory
  action: string
  title: string
  message: string
  entityId?: string
  metadata?: Record<string, unknown>
}

export type StaffActivityEntry = {
  id: string
  actorEmail: string
  actorRole: StaffRole
  category: StaffActivityCategory
  action: string
  title: string
  message: string
  entityId?: string
  metadata: Record<string, unknown>
  createdAt: string
  read: boolean
}

type ActivityRow = {
  id: string
  actor_email: string
  actor_role: StaffRole
  category: StaffActivityCategory
  action: string
  title: string
  message: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

const LOCAL_KEY = 'cherekh_staff_activity_log'
const LOCAL_READ_KEY = 'cherekh_staff_activity_reads'
export const STAFF_ACTIVITY_EVENT = 'cherekh-staff-activity'

const dispatchActivityChange = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STAFF_ACTIVITY_EVENT))
  }
}

const readLocalReadIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LOCAL_READ_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

const writeLocalReadIds = (ids: Set<string>): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_READ_KEY, JSON.stringify([...ids]))
}

const rowToEntry = (row: ActivityRow, readIds: Set<string>): StaffActivityEntry => ({
  id: row.id,
  actorEmail: row.actor_email,
  actorRole: row.actor_role,
  category: row.category,
  action: row.action,
  title: row.title,
  message: row.message,
  entityId: row.entity_id ?? undefined,
  metadata: row.metadata ?? {},
  createdAt: row.created_at,
  read: readIds.has(row.id),
})

const readLocal = (): StaffActivityEntry[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const readIds = readLocalReadIds()
    const entries = raw ? (JSON.parse(raw) as Omit<StaffActivityEntry, 'read'>[]) : []
    return entries.map((entry) => ({ ...entry, read: readIds.has(entry.id) }))
  } catch {
    return []
  }
}

const writeLocal = (entry: Omit<StaffActivityEntry, 'read'>): void => {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    const existing = raw ? (JSON.parse(raw) as Omit<StaffActivityEntry, 'read'>[]) : []
    const next = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, 300)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

const deleteLocal = (activityId: string): void => {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return
    const existing = JSON.parse(raw) as Omit<StaffActivityEntry, 'read'>[]
    const next = existing.filter((item) => item.id !== activityId)
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }

  const readIds = readLocalReadIds()
  if (readIds.delete(activityId)) {
    writeLocalReadIds(readIds)
  }
}

const getActorEmail = async (): Promise<string> => {
  if (!isSupabaseConfigured()) return 'staff@local'
  const supabase = getSupabase()
  if (!supabase) return 'staff@unknown'
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? 'staff@unknown'
}

/** Record an admin-panel action for the signed-in staff member (all roles). */
export const logStaffActivity = async (input: LogStaffActivityInput): Promise<void> => {
  const role = getActiveStaffRole()
  if (!role) return

  const actorEmail = await getActorEmail()
  const createdAt = new Date().toISOString()

  const entry: Omit<StaffActivityEntry, 'read'> = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actorEmail,
    actorRole: role,
    category: input.category,
    action: input.action,
    title: input.title,
    message: input.message,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
    createdAt,
  }

  if (!isSupabaseConfigured()) {
    writeLocal(entry)
    dispatchActivityChange()
    return
  }

  const supabase = getSupabase()
  if (!supabase) {
    writeLocal(entry)
    dispatchActivityChange()
    return
  }

  const { error } = await supabase.from('staff_activity_log').insert({
    actor_email: actorEmail,
    actor_role: role,
    category: input.category,
    action: input.action,
    title: input.title,
    message: input.message,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  })

  if (error) {
    console.warn('[Activity] insert failed, using local fallback:', error.message)
    writeLocal(entry)
  }

  dispatchActivityChange()
}

export type ActivityCounts = {
  total: number
  today: number
  week: number
  unread: number
  byCategory: Record<StaffActivityCategory, number>
  byRole: Record<StaffRole, number>
}

const emptyCategoryCounts = (): Record<StaffActivityCategory, number> => ({
  booking: 0,
  housekeeping: 0,
  guest: 0,
  staff: 0,
  inquiry: 0,
  settings: 0,
  team: 0,
  system: 0,
})

const emptyRoleCounts = (): Record<StaffRole, number> => ({
  admin: 0,
  manager: 0,
  booking_officer: 0,
})

const startOfLocalDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const computeActivityCounts = (entries: StaffActivityEntry[]): ActivityCounts => {
  const now = new Date()
  const todayStart = startOfLocalDay(now).getTime()
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000

  const byCategory = emptyCategoryCounts()
  const byRole = emptyRoleCounts()
  let today = 0
  let week = 0
  let unread = 0

  for (const entry of entries) {
    const at = new Date(entry.createdAt).getTime()
    if (at >= todayStart) today += 1
    if (at >= weekStart) week += 1
    if (!entry.read) unread += 1
    byCategory[entry.category] += 1
    byRole[entry.actorRole] += 1
  }

  return { total: entries.length, today, week, unread, byCategory, byRole }
}

export type FetchActivityOptions = {
  limit?: number
  actorEmail?: string
  category?: StaffActivityCategory | 'all'
}

export const fetchStaffActivityLog = async (
  options: FetchActivityOptions = {}
): Promise<StaffActivityEntry[]> => {
  const limit = options.limit ?? 200
  const readIds = await fetchActivityReadIds()

  if (!isSupabaseConfigured()) {
    return filterLocal(readLocal(), options).slice(0, limit)
  }

  const supabase = getSupabase()
  if (!supabase) return filterLocal(readLocal(), options).slice(0, limit)

  let query = supabase
    .from('staff_activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (options.actorEmail?.trim()) {
    query = query.ilike('actor_email', options.actorEmail.trim())
  }
  if (options.category && options.category !== 'all') {
    query = query.eq('category', options.category)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[Activity] fetch failed:', error.message)
    return filterLocal(readLocal(), options).slice(0, limit)
  }

  const remote = (data ?? []).map((row) => rowToEntry(row as ActivityRow, readIds))
  const localOnly = filterLocal(readLocal(), options).filter((e) => e.id.startsWith('local-'))
  return [...localOnly, ...remote]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit)
}

const fetchActivityReadIds = async (): Promise<Set<string>> => {
  const localIds = readLocalReadIds()

  if (!isSupabaseConfigured()) return localIds

  const supabase = getSupabase()
  if (!supabase) return localIds

  const email = (await supabase.auth.getUser()).data.user?.email
  if (!email) return localIds

  const { data, error } = await supabase
    .from('staff_activity_reads')
    .select('activity_id')
    .ilike('admin_email', email)

  if (error) {
    console.warn('[Activity] read fetch failed:', error.message)
    return localIds
  }

  const remoteIds = new Set((data ?? []).map((row) => row.activity_id as string))
  return new Set([...localIds, ...remoteIds])
}

export const markActivityAsRead = async (activityId: string): Promise<void> => {
  const localIds = readLocalReadIds()
  if (localIds.has(activityId)) return

  if (activityId.startsWith('local-')) {
    localIds.add(activityId)
    writeLocalReadIds(localIds)
    dispatchActivityChange()
    return
  }

  if (!isSupabaseConfigured()) {
    localIds.add(activityId)
    writeLocalReadIds(localIds)
    dispatchActivityChange()
    return
  }

  const supabase = getSupabase()
  if (!supabase) return

  const email = (await supabase.auth.getUser()).data.user?.email
  if (!email) return

  const { error } = await supabase.from('staff_activity_reads').upsert(
    { activity_id: activityId, admin_email: email },
    { onConflict: 'activity_id,admin_email' }
  )

  if (error) {
    console.warn('[Activity] mark read failed:', error.message)
    localIds.add(activityId)
    writeLocalReadIds(localIds)
  }

  dispatchActivityChange()
}

export const markAllActivityAsRead = async (activityIds: string[]): Promise<void> => {
  const unread = activityIds.filter((id) => id)
  if (unread.length === 0) return

  await Promise.all(unread.map((id) => markActivityAsRead(id)))
}

/** Delete an activity entry (admin only; local fallback entries removed from browser storage). */
export const deleteActivityEntry = async (activityId: string): Promise<boolean> => {
  if (activityId.startsWith('local-')) {
    deleteLocal(activityId)
    dispatchActivityChange()
    return true
  }

  if (!isSupabaseConfigured()) {
    deleteLocal(activityId)
    dispatchActivityChange()
    return true
  }

  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase.from('staff_activity_log').delete().eq('id', activityId)

  if (error) {
    console.warn('[Activity] delete failed:', error.message)
    return false
  }

  dispatchActivityChange()
  return true
}

const filterLocal = (
  items: StaffActivityEntry[],
  options: FetchActivityOptions
): StaffActivityEntry[] => {
  let list = items
  if (options.actorEmail?.trim()) {
    const q = options.actorEmail.trim().toLowerCase()
    list = list.filter((e) => e.actorEmail.toLowerCase().includes(q))
  }
  if (options.category && options.category !== 'all') {
    list = list.filter((e) => e.category === options.category)
  }
  return list
}

export const categoryLabel = (category: StaffActivityCategory): string => {
  if (category === 'booking') return 'Bookings'
  if (category === 'housekeeping') return 'Housekeeping'
  if (category === 'guest') return 'Guests'
  if (category === 'staff') return 'Staff roster'
  if (category === 'inquiry') return 'Inquiries'
  if (category === 'settings') return 'Settings'
  if (category === 'team') return 'Team access'
  return 'System'
}

export const roleLabelForActivity = (role: StaffRole): string => {
  if (role === 'admin') return 'Admin'
  if (role === 'manager') return 'Manager'
  return 'Booking officer'
}
