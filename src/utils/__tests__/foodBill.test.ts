import { describe, expect, it } from 'vitest'
import type { MenuItem } from '../../data/menuCatalog'
import type { ExtraCharge } from '../bookings'
import {
  buildFoodLines,
  copyMealToAllDays,
  copySlotToRooms,
  defaultServiceDate,
  draftSlots,
  foodSlotKey,
  groupFoodExtras,
  parseFoodSlotKey,
  sortExtrasForInvoice,
  stayServiceDates,
  type FoodDraft,
} from '../foodBill'

const menu: MenuItem[] = [
  { id: 'rice', name: 'Rice', price: 60 },
  { id: 'dal', name: 'Dal', price: 80 },
  { id: 'tea', name: 'Milk Tea', price: 60 },
]
const menuById = new Map(menu.map((item) => [item.id, item]))

const extra = (overrides: Partial<ExtraCharge>): ExtraCharge => ({
  id: Math.random().toString(36).slice(2),
  category: 'food',
  name: 'Rice',
  amount: 60,
  quantity: 1,
  recordedAt: '2026-10-14T06:00:00Z',
  ...overrides,
})

describe('stay service dates', () => {
  it('covers check-in through the check-out day', () => {
    expect(stayServiceDates({ checkIn: '2026-10-17', checkOut: '2026-10-19' })).toEqual([
      '2026-10-17',
      '2026-10-18',
      '2026-10-19',
    ])
  })

  it('a one-night stay has two billable days', () => {
    expect(stayServiceDates({ checkIn: '2026-10-17', checkOut: '2026-10-18' })).toEqual(['2026-10-17', '2026-10-18'])
  })

  it('uses conference event dates when present', () => {
    expect(
      stayServiceDates({ checkIn: '2026-10-01', checkOut: '2026-10-09', eventDates: ['2026-10-05', '2026-10-02'] })
    ).toEqual(['2026-10-02', '2026-10-05'])
  })

  it('falls back to check-in when check-out is missing or earlier', () => {
    expect(stayServiceDates({ checkIn: '2026-10-17', checkOut: '' })).toEqual(['2026-10-17'])
    expect(stayServiceDates({ checkIn: '2026-10-17', checkOut: '2026-10-10' })).toEqual(['2026-10-17'])
  })

  it('pre-selects today inside the stay, otherwise the first day', () => {
    const days = ['2026-10-17', '2026-10-18']
    expect(defaultServiceDate(days, '2026-10-18')).toBe('2026-10-18')
    expect(defaultServiceDate(days, '2026-10-01')).toBe('2026-10-17')
    expect(defaultServiceDate([], '2026-10-01')).toBeUndefined()
  })
})

describe('food slot keys', () => {
  it('round-trips, including room names with a pipe', () => {
    expect(parseFoodSlotKey(foodSlotKey('2026-10-17', 'lunch', 'Room 103'))).toEqual({
      date: '2026-10-17',
      meal: 'lunch',
      room: 'Room 103',
    })
    expect(parseFoodSlotKey(foodSlotKey('2026-10-17', 'dinner', 'Hall | East'))?.room).toBe('Hall | East')
    expect(parseFoodSlotKey(foodSlotKey('2026-10-17', 'breakfast', ''))?.room).toBe('')
  })

  it('rejects malformed keys', () => {
    expect(parseFoodSlotKey('Room 103')).toBeNull()
    expect(parseFoodSlotKey('2026-10-17|brunch|Room 103')).toBeNull()
    expect(parseFoodSlotKey('soon|lunch|Room 103')).toBeNull()
  })
})

describe('building food lines', () => {
  const rooms = ['Room 104', 'Room 103']

  it('keeps picks separate per date, meal and room, skipping empty slots', () => {
    const draft: FoodDraft = {
      [foodSlotKey('2026-10-18', 'breakfast', 'Room 103')]: { tea: 2 },
      [foodSlotKey('2026-10-17', 'dinner', 'Room 103')]: { rice: 2, dal: 1 },
      [foodSlotKey('2026-10-17', 'lunch', 'Room 103')]: { rice: 1 },
      [foodSlotKey('2026-10-17', 'lunch', 'Room 104')]: { dal: 1 },
      [foodSlotKey('2026-10-17', 'breakfast', 'Room 104')]: {},
    }
    const lines = buildFoodLines({ draft, menuById, rooms, recordedBy: 'staff@example.com' })

    expect(lines.map((line) => `${line.serviceDate} ${line.meal} ${line.roomName} ${line.menuItemId}`)).toEqual([
      '2026-10-17 lunch Room 104 dal',
      '2026-10-17 lunch Room 103 rice',
      '2026-10-17 dinner Room 103 rice',
      '2026-10-17 dinner Room 103 dal',
      '2026-10-18 breakfast Room 103 tea',
    ])
    expect(lines[2]).toMatchObject({ quantity: 2, unitPrice: 60, amount: 120, recordedBy: 'staff@example.com' })
    expect(lines.reduce((sum, line) => sum + line.amount, 0)).toBe(80 + 60 + 120 + 80 + 120)
  })

  it('ignores items no longer on the menu, zero quantities and malformed keys', () => {
    const lines = buildFoodLines({
      draft: {
        [foodSlotKey('2026-10-17', 'dinner', 'Room 103')]: { rice: 0, removed: 2, dal: 1 },
        'Room 103': { rice: 1 },
      },
      menuById,
    })
    expect(lines.map((line) => line.menuItemId)).toEqual(['dal'])
  })

  it('lists filled slots with counts and totals', () => {
    const slots = draftSlots(
      {
        [foodSlotKey('2026-10-17', 'lunch', 'Room 103')]: { rice: 2, tea: 1 },
        [foodSlotKey('2026-10-17', 'lunch', 'Room 104')]: { removed: 1 },
      },
      menuById,
      rooms
    )
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({ date: '2026-10-17', meal: 'lunch', room: 'Room 103', count: 2, total: 180 })
  })
})

describe('copy shortcuts', () => {
  const rooms = ['Room 103', 'Room 104']

  it('copies one slot to every room for the same date and meal only', () => {
    const draft = copySlotToRooms(
      {
        [foodSlotKey('2026-10-17', 'lunch', 'Room 103')]: { rice: 2 },
        [foodSlotKey('2026-10-17', 'lunch', 'Room 104')]: { tea: 1 },
        [foodSlotKey('2026-10-17', 'dinner', 'Room 104')]: { dal: 1 },
      },
      { date: '2026-10-17', meal: 'lunch', room: 'Room 103' },
      rooms
    )
    expect(draft[foodSlotKey('2026-10-17', 'lunch', 'Room 104')]).toEqual({ rice: 2 })
    expect(draft[foodSlotKey('2026-10-17', 'dinner', 'Room 104')]).toEqual({ dal: 1 })
  })

  it('copies a meal to every other day room by room, clearing rooms empty on the source day', () => {
    const draft = copyMealToAllDays(
      {
        [foodSlotKey('2026-10-17', 'lunch', 'Room 103')]: { rice: 2 },
        [foodSlotKey('2026-10-18', 'lunch', 'Room 104')]: { tea: 1 },
        [foodSlotKey('2026-10-18', 'dinner', 'Room 104')]: { dal: 1 },
      },
      { date: '2026-10-17', meal: 'lunch' },
      ['2026-10-17', '2026-10-18', '2026-10-19'],
      rooms
    )
    expect(draft[foodSlotKey('2026-10-18', 'lunch', 'Room 103')]).toEqual({ rice: 2 })
    expect(draft[foodSlotKey('2026-10-19', 'lunch', 'Room 103')]).toEqual({ rice: 2 })
    expect(draft[foodSlotKey('2026-10-18', 'lunch', 'Room 104')]).toBeUndefined()
    expect(draft[foodSlotKey('2026-10-18', 'dinner', 'Room 104')]).toEqual({ dal: 1 })
  })
})

describe('grouping food on the bill', () => {
  it('groups by date, then meal order, then room, with undated lines last', () => {
    const groups = groupFoodExtras([
      extra({ serviceDate: '2026-10-18', meal: 'dinner', roomName: 'Room 104', amount: 80 }),
      extra({ meal: 'lunch', roomName: 'Room 103', amount: 50 }),
      extra({ serviceDate: '2026-10-17', meal: 'dinner', roomName: 'Room 103', amount: 60 }),
      extra({ serviceDate: '2026-10-17', meal: 'breakfast', roomName: 'Room 104', amount: 40 }),
      extra({ serviceDate: '2026-10-17', meal: 'breakfast', roomName: 'Room 103', amount: 30 }),
      extra({ category: 'other', name: 'Laundry', amount: 500 }),
    ])

    expect(groups.map((group) => group.date)).toEqual(['2026-10-17', '2026-10-18', null])
    expect(groups[0].total).toBe(130)
    expect(groups[0].meals.map((meal) => meal.meal)).toEqual(['breakfast', 'dinner'])
    expect(groups[0].meals[0].rooms.map((room) => [room.roomName, room.total])).toEqual([
      ['Room 104', 40],
      ['Room 103', 30],
    ])
    expect(groups[2].meals[0]).toMatchObject({ meal: 'lunch', total: 50 })
  })

  it('food without a meal or room still appears', () => {
    const [day] = groupFoodExtras([extra({ serviceDate: '2026-10-17', amount: 90 })])
    expect(day.meals).toHaveLength(1)
    expect(day.meals[0].meal).toBeNull()
    expect(day.meals[0].rooms[0].roomName).toBe('Whole stay')
  })

  it('orders invoice lines by date and meal, other charges last', () => {
    const sorted = sortExtrasForInvoice([
      extra({ id: 'o', category: 'other', name: 'Laundry' }),
      extra({ id: 'u', meal: 'breakfast' }),
      extra({ id: 'd2', serviceDate: '2026-10-18', meal: 'breakfast' }),
      extra({ id: 'd1l', serviceDate: '2026-10-17', meal: 'lunch' }),
      extra({ id: 'd1b', serviceDate: '2026-10-17', meal: 'breakfast' }),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['d1b', 'd1l', 'd2', 'u', 'o'])
  })
})
