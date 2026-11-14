import { describe, expect, it } from 'vitest'
import {
  applyStatusChange,
  compareHousekeepingTasks,
  formatHousekeepingTime,
  resolveAssignee,
  roomGuestContext,
  roomsNotReadyForArrival,
  summarizeCleanings,
} from '../housekeeping'
import type { Booking } from '../../../utils/bookings'
import type { HousekeepingLogEntry, HousekeepingTask, StaffMember } from '../../types'

const task = (overrides: Partial<HousekeepingTask> = {}): HousekeepingTask => ({
  id: 'hk-205',
  roomId: '205',
  roomNumber: '205',
  status: 'ready',
  priority: 'medium',
  estimatedMinutes: 35,
  ...overrides,
})

const member = (overrides: Partial<StaffMember>): StaffMember =>
  ({
    id: 's1',
    name: 'Rina',
    role: 'Housekeeping',
    shift: 'morning',
    status: 'on-duty',
    phone: '',
    ...overrides,
  }) as StaffMember

const booking = (overrides: Partial<Booking>): Booking => ({
  id: 'B1',
  checkIn: '2026-11-14',
  checkOut: '2026-11-16',
  adults: 2,
  children: 0,
  totalGuests: 2,
  roomType: '205',
  roomName: 'Room 205',
  name: 'Guest',
  email: '',
  phone: '',
  specialRequests: '',
  status: 'confirmed',
  notes: [],
  payment: { amount: 0, status: 'pending' },
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...overrides,
})

const logEntry = (overrides: Partial<HousekeepingLogEntry>): HousekeepingLogEntry => ({
  id: 1,
  taskId: 'hk-205',
  roomId: '205',
  roomNumber: '205',
  event: 'status',
  createdAt: '2026-11-14T05:00:00Z',
  ...overrides,
})

describe('applyStatusChange', () => {
  const now = '2026-11-14T06:00:00.000Z'

  it('starts a fresh cycle each time', () => {
    const old = task({ status: 'dirty', startedAt: '2026-11-01T01:00:00Z', completedAt: '2026-11-01T02:00:00Z' })
    const cleaning = applyStatusChange(old, 'cleaning', now)
    expect(cleaning).toMatchObject({ status: 'cleaning', startedAt: now, completedAt: undefined })

    const ready = applyStatusChange(cleaning, 'ready', '2026-11-14T06:30:00.000Z')
    expect(ready).toMatchObject({ status: 'ready', startedAt: now, completedAt: '2026-11-14T06:30:00.000Z' })

    expect(applyStatusChange(ready, 'dirty', now)).toMatchObject({ status: 'dirty', startedAt: undefined, completedAt: undefined })
  })

  it('does not keep a stale start time when skipping straight to ready', () => {
    const dirty = task({ status: 'dirty', startedAt: '2026-11-01T01:00:00Z' })
    expect(applyStatusChange(dirty, 'ready', now)).toMatchObject({ startedAt: undefined, completedAt: now })
  })
})

describe('compareHousekeepingTasks', () => {
  it('puts high priority first, then room number', () => {
    const list = [
      task({ id: 'a', roomNumber: '206', priority: 'medium' }),
      task({ id: 'b', roomNumber: '105', priority: 'high' }),
      task({ id: 'c', roomNumber: '102', priority: 'medium' }),
      task({ id: 'd', roomNumber: '101', priority: 'low' }),
    ]
    expect(list.sort(compareHousekeepingTasks).map((t) => t.id)).toEqual(['b', 'c', 'a', 'd'])
  })
})

describe('resolveAssignee', () => {
  it('shows the current name of the linked staff record', () => {
    const staff = [member({ id: 's1', name: 'Rina Chakma' })]
    expect(resolveAssignee({ assignedStaffId: 's1', assignedTo: 'Rina' }, staff)).toEqual({
      staffId: 's1',
      name: 'Rina Chakma',
      former: false,
    })
  })

  it('flags fired or deleted staff', () => {
    const staff = [member({ id: 's1', terminatedOn: '2026-11-01' })]
    expect(resolveAssignee({ assignedStaffId: 's1' }, staff).former).toBe(true)
    expect(resolveAssignee({ assignedStaffId: 'gone', assignedTo: 'Old name' }, staff)).toEqual({
      staffId: 'gone',
      name: 'Old name',
      former: true,
    })
  })

  it('links legacy name-only assignments by name', () => {
    const staff = [member({ id: 's9', name: 'Mong' })]
    expect(resolveAssignee({ assignedTo: ' mong ' }, staff)).toEqual({ staffId: 's9', name: 'Mong', former: false })
  })
})

describe('roomGuestContext and roomsNotReadyForArrival', () => {
  const today = '2026-11-14'

  it('classifies arrivals, stays and departures per room', () => {
    const map = roomGuestContext(
      [
        booking({ id: 'A', roomType: '205' }),
        booking({ id: 'S', roomType: '206', checkIn: '2026-11-12', checkOut: '2026-11-15' }),
        booking({ id: 'D', roomType: '102', checkIn: '2026-11-12', checkOut: today }),
        booking({ id: 'X', roomType: '103', status: 'cancelled' }),
        booking({ id: 'F', roomType: '104', checkIn: '2026-11-20', checkOut: '2026-11-22' }),
      ],
      today
    )
    expect(map.get('205')?.arriving?.id).toBe('A')
    expect(map.get('206')?.inHouse?.id).toBe('S')
    expect(map.get('102')?.departing?.id).toBe('D')
    expect(map.has('103')).toBe(false)
    expect(map.has('104')).toBe(false)
  })

  it('warns only for arrival-day bookings whose rooms are not ready', () => {
    const tasks = [task({ roomId: '205', status: 'dirty' }), task({ id: 'hk-206', roomId: '206', roomNumber: '206' })]
    const multi = booking({
      rooms: [
        { roomType: '205', roomName: 'Room 205', adults: 2, children: 0, totalGuests: 2 },
        { roomType: '206', roomName: 'Room 206', adults: 2, children: 0, totalGuests: 2 },
      ],
    })
    expect(roomsNotReadyForArrival(multi, tasks, today).map((t) => t.roomId)).toEqual(['205'])
    expect(roomsNotReadyForArrival(booking({ checkIn: '2026-11-13' }), tasks, today)).toEqual([])
    expect(roomsNotReadyForArrival(booking({ status: 'checked-out' }), tasks, today)).toEqual([])
  })
})

describe('summarizeCleanings', () => {
  it('counts moves to ready per staff member with average time', () => {
    const staff = [member({ id: 's1', name: 'Rina' }), member({ id: 's2', name: 'Mong' })]
    const summary = summarizeCleanings(
      [
        logEntry({ id: 1, toStatus: 'ready', fromStatus: 'cleaning', assignedStaffId: 's1', durationMinutes: 20 }),
        logEntry({ id: 2, toStatus: 'ready', fromStatus: 'cleaning', assignedStaffId: 's1', durationMinutes: 30 }),
        logEntry({ id: 3, toStatus: 'ready', fromStatus: 'dirty', assignedStaffId: 's2' }),
        logEntry({ id: 4, toStatus: 'dirty', fromStatus: 'ready', reason: 'checkout' }),
        logEntry({ id: 5, event: 'assigned', assignedStaffId: 's2', toStatus: 'ready' }),
      ],
      staff
    )
    expect(summary.cleanings).toBe(3)
    expect(summary.avgMinutes).toBe(25)
    expect(summary.checkoutsFlagged).toBe(1)
    expect(summary.byStaff).toEqual([
      expect.objectContaining({ name: 'Rina', cleanings: 2, avgMinutes: 25, totalMinutes: 50 }),
      expect.objectContaining({ name: 'Mong', cleanings: 1, avgMinutes: null }),
    ])
  })
})

describe('formatHousekeepingTime', () => {
  it('uses Asia/Dhaka and adds the date for other days', () => {
    expect(formatHousekeepingTime('2026-11-14T04:30:00Z', '2026-11-14')).toBe('10:30 am')
    expect(formatHousekeepingTime('2026-11-13T04:30:00Z', '2026-11-14')).toBe('13 Nov, 10:30 am')
  })
})
