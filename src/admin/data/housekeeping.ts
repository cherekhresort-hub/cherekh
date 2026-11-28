import { roomCatalog } from '../../data/roomCatalog'
import { getBookingRooms, type Booking } from '../../utils/bookings'
import { BUSINESS_TIMEZONE, toBusinessDay } from '../../lib/finance/dates'
import type { CleaningPriority, CleaningStatus, HousekeepingLogEntry, HousekeepingTask, StaffMember } from '../types'

/** One kanban card per guest room in the catalog. */
export const buildDefaultHousekeepingTasks = (): HousekeepingTask[] =>
  roomCatalog.map((room) => ({
    id: `hk-${room.id}`,
    roomId: room.id,
    roomNumber: room.roomNumber,
    status: 'ready',
    priority: 'medium',
    estimatedMinutes: room.bedCategory === 'double' ? 35 : 25,
  }))

export const CLEANING_STATUS_LABELS: Record<CleaningStatus, string> = {
  dirty: 'Dirty',
  cleaning: 'Cleaning',
  ready: 'Ready',
}

const PRIORITY_RANK: Record<CleaningPriority, number> = { high: 0, medium: 1, low: 2 }

/** High priority first, then room number. */
export const compareHousekeepingTasks = (a: HousekeepingTask, b: HousekeepingTask): number =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
  a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })

/**
 * Move a task to a new column. Every cleaning cycle gets fresh timestamps:
 * dirty clears both, cleaning starts the clock, ready stops it (the start time
 * is only kept when the room actually went through "cleaning").
 */
export const applyStatusChange = (
  task: HousekeepingTask,
  status: CleaningStatus,
  now: string = new Date().toISOString()
): HousekeepingTask => {
  if (status === task.status) return task
  if (status === 'dirty') return { ...task, status, startedAt: undefined, completedAt: undefined }
  if (status === 'cleaning') return { ...task, status, startedAt: now, completedAt: undefined }
  return {
    ...task,
    status,
    startedAt: task.status === 'cleaning' ? task.startedAt : undefined,
    completedAt: now,
  }
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})
const dateFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_TIMEZONE, day: 'numeric', month: 'short' })

/** Time only for `today` (Asia/Dhaka); other days include the date. */
export const formatHousekeepingTime = (iso: string, today: string): string => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const time = timeFormatter.format(date)
  return toBusinessDay(date) === today ? time : `${dateFormatter.format(date)}, ${time}`
}

export const minutesBetween = (fromIso?: string, toIso?: string): number | null => {
  if (!fromIso || !toIso) return null
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return null
  return Math.round(ms / 60000)
}

export interface ResolvedAssignee {
  staffId?: string
  name?: string
  /** Fired, deleted, or otherwise no longer on the team. */
  former: boolean
}

/** Current name for the assigned staff record, falling back to the saved name. */
export const resolveAssignee = (
  task: Pick<HousekeepingTask, 'assignedStaffId' | 'assignedTo'>,
  staff: StaffMember[]
): ResolvedAssignee => {
  if (task.assignedStaffId) {
    const member = staff.find((s) => s.id === task.assignedStaffId)
    if (member) return { staffId: member.id, name: member.name, former: Boolean(member.terminatedOn) }
    return { staffId: task.assignedStaffId, name: task.assignedTo, former: true }
  }
  if (!task.assignedTo) return { former: false }
  const name = task.assignedTo.trim().toLowerCase()
  const member = staff.find((s) => s.name.trim().toLowerCase() === name)
  if (member) return { staffId: member.id, name: member.name, former: Boolean(member.terminatedOn) }
  return { name: task.assignedTo, former: true }
}

const ACTIVE_BOOKING_STATUSES: Booking['status'][] = ['pending', 'confirmed', 'checked-in']

export interface RoomGuestContext {
  arriving?: Booking
  inHouse?: Booking
  departing?: Booking
}

/** Who is arriving, staying or leaving today, per room id (Asia/Dhaka day). */
export const roomGuestContext = (bookings: Booking[], today: string): Map<string, RoomGuestContext> => {
  const result = new Map<string, RoomGuestContext>()
  for (const booking of bookings) {
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) continue
    if (!booking.checkIn || !booking.checkOut) continue
    if (booking.checkIn > today || booking.checkOut < today) continue
    for (const line of getBookingRooms(booking)) {
      if (!line.roomType) continue
      const entry = result.get(line.roomType) ?? {}
      if (booking.checkIn === today) entry.arriving ??= booking
      else if (booking.checkOut === today) entry.departing ??= booking
      else entry.inHouse ??= booking
      result.set(line.roomType, entry)
    }
  }
  return result
}

/** Rooms of a booking arriving today that housekeeping has not marked Ready. */
export const roomsNotReadyForArrival = (
  booking: Booking,
  tasks: HousekeepingTask[],
  today: string
): HousekeepingTask[] => {
  if (!ACTIVE_BOOKING_STATUSES.includes(booking.status) || booking.checkIn !== today) return []
  const roomIds = new Set(getBookingRooms(booking).map((line) => line.roomType))
  return tasks.filter((task) => roomIds.has(task.roomId) && task.status !== 'ready')
}

export interface CleanerSummary {
  key: string
  name: string
  cleanings: number
  timedCleanings: number
  totalMinutes: number
  avgMinutes: number | null
}

export interface CleaningSummary {
  cleanings: number
  avgMinutes: number | null
  checkoutsFlagged: number
  byStaff: CleanerSummary[]
}

/** Completed cleanings (moves to Ready) grouped by the assigned staff member. */
export const summarizeCleanings = (entries: HousekeepingLogEntry[], staff: StaffMember[]): CleaningSummary => {
  const groups = new Map<string, CleanerSummary>()
  let timedCount = 0
  let timedTotal = 0
  let cleanings = 0
  let checkoutsFlagged = 0

  for (const entry of entries) {
    if (entry.event !== 'status') continue
    if (entry.toStatus === 'dirty' && entry.reason === 'checkout') checkoutsFlagged += 1
    if (entry.toStatus !== 'ready') continue
    cleanings += 1
    const assignee = resolveAssignee(entry, staff)
    const key = assignee.staffId ?? assignee.name?.toLowerCase() ?? 'unassigned'
    const group = groups.get(key) ?? {
      key,
      name: assignee.name ?? 'Unassigned',
      cleanings: 0,
      timedCleanings: 0,
      totalMinutes: 0,
      avgMinutes: null,
    }
    group.cleanings += 1
    if (typeof entry.durationMinutes === 'number') {
      group.timedCleanings += 1
      group.totalMinutes += entry.durationMinutes
      timedCount += 1
      timedTotal += entry.durationMinutes
    }
    groups.set(key, group)
  }

  const byStaff = [...groups.values()]
    .map((g) => ({ ...g, avgMinutes: g.timedCleanings ? Math.round(g.totalMinutes / g.timedCleanings) : null }))
    .sort((a, b) => b.cleanings - a.cleanings || a.name.localeCompare(b.name))

  return {
    cleanings,
    avgMinutes: timedCount ? Math.round(timedTotal / timedCount) : null,
    checkoutsFlagged,
    byStaff,
  }
}
