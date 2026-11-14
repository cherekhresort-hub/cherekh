export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance'
export type CleaningStatus = 'dirty' | 'cleaning' | 'ready'
export type CleaningPriority = 'low' | 'medium' | 'high'
export type StaffShift = 'morning' | 'afternoon' | 'night' | 'full-time' | 'off'
export type StaffStatus = 'on-duty' | 'on-break' | 'off-duty'
export type GuestTag = 'vip' | 'returning' | 'frequent' | 'new'

export interface Guest {
  id: string
  name: string
  email: string
  phone: string
  totalStays: number
  lastStay?: string
  totalSpent: number
  /** Final visible tag set (derived tags with admin overrides applied). */
  tags: GuestTag[]
  /** Tags as computed purely from booking history, before any override. */
  derivedTags: GuestTag[]
  /** True when the admin has manually pinned or hidden any tag. */
  hasTagOverride: boolean
  notes?: string
  idImage?: string
}

export interface StaffMember {
  id: string
  name: string
  role: string
  phone: string
  email?: string
  shift: StaffShift
  status: StaffStatus
  avatarColor: string
  /** Set when the staff member was fired; the record is kept for history. */
  terminatedOn?: string
  terminationReason?: string
  terminatedBy?: string
}

export interface HousekeepingTask {
  id: string
  roomId: string
  roomNumber: string
  /** Staff record id; `assignedTo` keeps the name as saved at assignment time. */
  assignedStaffId?: string
  assignedTo?: string
  status: CleaningStatus
  priority: CleaningPriority
  estimatedMinutes: number
  startedAt?: string
  completedAt?: string
  notes?: string
  updatedAt?: string
}

export interface HousekeepingLogEntry {
  id: number
  taskId: string
  roomId: string
  roomNumber: string
  event: 'status' | 'assigned'
  fromStatus?: CleaningStatus
  toStatus?: CleaningStatus
  assignedStaffId?: string
  assignedTo?: string
  startedAt?: string
  completedAt?: string
  durationMinutes?: number
  reason?: string
  bookingId?: string
  actorEmail?: string
  createdAt: string
}

export interface ResortSettings {
  resortName: string
  tagline: string
  address: string
  phone: string
  email: string
  website: string
  checkInTime: string
  checkOutTime: string
}
