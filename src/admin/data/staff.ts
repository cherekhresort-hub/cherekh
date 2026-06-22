import { notifyAdminOfManagerAction } from '../../lib/adminNotifications'
import {
  deleteStaffMember,
  getCachedStaff,
  notifyStaffChanged,
  upsertStaffMember,
} from '../../lib/staffDb'
import { canDeleteRecords } from '../../lib/permissions'
import type { StaffMember, StaffShift, StaffStatus } from '../types'

export const STAFF_COLORS = [
  '#1E4D2B',
  '#21504F',
  '#367E7E',
  '#917541',
  '#B59455',
  '#C8AE72',
  '#705A33',
  '#857F70',
  '#27241F',
  '#5A916A',
] as const

const pickAvatarColor = (seed: string): string => {
  if (!seed) return STAFF_COLORS[0]
  let sum = 0
  for (let i = 0; i < seed.length; i++) sum = (sum + seed.charCodeAt(i)) >>> 0
  return STAFF_COLORS[sum % STAFF_COLORS.length]
}

export interface StaffInput {
  name: string
  role: string
  phone: string
  email?: string
  shift: StaffShift
  status: StaffStatus
  avatarColor?: string
}

export type StaffMutationResult = {
  member: StaffMember | null
  synced: boolean
}

export const getStaff = (): StaffMember[] => getCachedStaff()

export const getStaffById = (id: string): StaffMember | null =>
  getCachedStaff().find((s) => s.id === id) ?? null

export const addStaff = async (input: StaffInput): Promise<StaffMutationResult> => {
  const member: StaffMember = {
    id: `staff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: input.name.trim(),
    role: input.role.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim() || undefined,
    shift: input.shift,
    status: input.status,
    avatarColor: input.avatarColor || pickAvatarColor(input.name),
  }

  const synced = await upsertStaffMember(member)
  if (synced) notifyStaffChanged()

  void notifyAdminOfManagerAction({
    category: 'staff',
    action: 'staff.created',
    title: 'Staff member added',
    message: `${member.name} · ${member.role} · ${member.status}`,
    entityId: member.id,
  })

  return { member, synced }
}

export const updateStaff = async (
  id: string,
  patch: Partial<StaffInput>
): Promise<StaffMutationResult> => {
  const members = getCachedStaff()
  const index = members.findIndex((s) => s.id === id)
  if (index === -1) return { member: null, synced: false }

  const prev = members[index]

  const next: StaffMember = {
    ...members[index],
    ...(patch.name !== undefined && { name: patch.name.trim() }),
    ...(patch.role !== undefined && { role: patch.role.trim() }),
    ...(patch.phone !== undefined && { phone: patch.phone.trim() }),
    ...(patch.email !== undefined && { email: patch.email.trim() || undefined }),
    ...(patch.shift !== undefined && { shift: patch.shift }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.avatarColor !== undefined && { avatarColor: patch.avatarColor }),
  }

  const synced = await upsertStaffMember(next)
  if (synced) notifyStaffChanged()

  const statusChanged = patch.status !== undefined && patch.status !== prev.status
  void notifyAdminOfManagerAction({
    category: 'staff',
    action: statusChanged ? 'staff.status' : 'staff.updated',
    title: statusChanged ? 'Staff status changed' : 'Staff profile updated',
    message: statusChanged
      ? `${next.name}: ${prev.status} → ${next.status}`
      : `${next.name} (${next.role}) was updated`,
    entityId: next.id,
  })

  return { member: next, synced }
}

export const deleteStaff = async (id: string): Promise<{ ok: boolean; synced: boolean }> => {
  if (!canDeleteRecords()) return { ok: false, synced: false }

  const synced = await deleteStaffMember(id)
  if (synced) notifyStaffChanged()

  return { ok: synced, synced }
}

/** Convenience role-based selector for the housekeeping assignee dropdown. */
export const getHousekeepingStaff = (): StaffMember[] =>
  getCachedStaff().filter((s) => s.role.toLowerCase().includes('housekeep'))
