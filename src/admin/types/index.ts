export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance'
export type CleaningStatus = 'dirty' | 'cleaning' | 'ready'
export type CleaningPriority = 'low' | 'medium' | 'high'
export type StaffShift = 'morning' | 'afternoon' | 'night' | 'off'
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
}

export interface HousekeepingTask {
  id: string
  roomId: string
  roomNumber: string
  assignedTo?: string
  status: CleaningStatus
  priority: CleaningPriority
  estimatedMinutes: number
  startedAt?: string
  completedAt?: string
  notes?: string
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
