import type { StaffMember } from '../admin/types'
import { getSupabase, isSupabaseConfigured } from './supabase'

const CACHE_KEY = 'cherekh_staff'
export const STAFF_CHANGED_EVENT = 'staff-changed'

type StaffMemberRow = {
  id: string
  name: string
  role: string
  phone: string
  email: string | null
  shift: StaffMember['shift']
  status: StaffMember['status']
  avatar_color: string
  updated_at: string
}

let memoryCache: StaffMember[] | null = null

const rowToMember = (row: StaffMemberRow): StaffMember => ({
  id: row.id,
  name: row.name,
  role: row.role,
  phone: row.phone,
  email: row.email ?? undefined,
  shift: row.shift,
  status: row.status,
  avatarColor: row.avatar_color,
})

const memberToRow = (member: StaffMember): Omit<StaffMemberRow, 'updated_at'> => ({
  id: member.id,
  name: member.name.trim(),
  role: member.role.trim(),
  phone: member.phone.trim(),
  email: member.email?.trim() || null,
  shift: member.shift,
  status: member.status,
  avatar_color: member.avatarColor,
})

const readLocalCache = (): StaffMember[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as StaffMember[]) : null
  } catch {
    return null
  }
}

const writeLocalCache = (members: StaffMember[]): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(CACHE_KEY, JSON.stringify(members))
}

export const getCachedStaff = (): StaffMember[] => memoryCache ?? readLocalCache() ?? []

export const notifyStaffChanged = (): void => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(STAFF_CHANGED_EVENT))
}

/** Load staff roster from Supabase (migrates legacy localStorage on first run). */
export const loadStaffMembers = async (): Promise<StaffMember[]> => {
  const fallback = (): StaffMember[] => {
    const cached = readLocalCache() ?? []
    memoryCache = cached
    return cached
  }

  if (!isSupabaseConfigured()) return fallback()

  const supabase = getSupabase()
  if (!supabase) return fallback()

  const { data, error } = await supabase
    .from('staff_members')
    .select('*')
    .order('name')

  if (error) {
    console.error('[Supabase] fetch staff_members:', error.message)
    return fallback()
  }

  if (!data || data.length === 0) {
    const legacy = readLocalCache()
    if (legacy?.length) {
      await upsertStaffMembers(legacy)
      memoryCache = legacy
      writeLocalCache(legacy)
      return legacy
    }
    memoryCache = []
    writeLocalCache([])
    return []
  }

  const members = (data as StaffMemberRow[]).map(rowToMember)
  memoryCache = members
  writeLocalCache(members)
  return members
}

export const upsertStaffMember = async (member: StaffMember): Promise<boolean> => {
  const base = memoryCache ?? readLocalCache() ?? []
  const exists = base.some((entry) => entry.id === member.id)
  const next = exists
    ? base.map((entry) => (entry.id === member.id ? member : entry))
    : [...base, member]

  memoryCache = next
  writeLocalCache(next)

  if (!isSupabaseConfigured()) return true

  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase.from('staff_members').upsert(
    {
      ...memberToRow(member),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[Supabase] upsert staff_members:', error.message)
    return false
  }

  return true
}

export const upsertStaffMembers = async (members: StaffMember[]): Promise<boolean> => {
  if (members.length === 0) return true

  memoryCache = members
  writeLocalCache(members)

  if (!isSupabaseConfigured()) return true

  const supabase = getSupabase()
  if (!supabase) return false

  const now = new Date().toISOString()
  const { error } = await supabase.from('staff_members').upsert(
    members.map((member) => ({
      ...memberToRow(member),
      updated_at: now,
    })),
    { onConflict: 'id' }
  )

  if (error) {
    console.error('[Supabase] bulk upsert staff_members:', error.message)
    return false
  }

  return true
}

export const deleteStaffMember = async (id: string): Promise<boolean> => {
  const base = memoryCache ?? readLocalCache() ?? []
  if (!base.some((member) => member.id === id)) return false

  if (!isSupabaseConfigured()) {
    const next = base.filter((member) => member.id !== id)
    memoryCache = next
    writeLocalCache(next)
    return true
  }

  const supabase = getSupabase()
  if (!supabase) return false

  const { error } = await supabase.from('staff_members').delete().eq('id', id)

  if (error) {
    console.error('[Supabase] delete staff_members:', error.message)
    return false
  }

  const next = base.filter((member) => member.id !== id)
  memoryCache = next
  writeLocalCache(next)
  return true
}
