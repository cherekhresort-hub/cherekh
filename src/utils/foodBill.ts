import { businessToday, eachDay } from '../lib/finance/dates'
import type { MenuItem } from '../data/menuCatalog'
import {
  extraLineTotal,
  FOOD_MEALS,
  type Booking,
  type ExtraCharge,
  type ExtraChargeInput,
  type FoodMeal,
} from './bookings'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const MAX_STAY_DAYS = 62

/** Slot key (see `foodSlotKey`) -> menu item id -> quantity. */
export type FoodDraft = Record<string, Record<string, number>>

export interface FoodSlot {
  date: string
  meal: FoodMeal
  room: string
}

/** Room is last so room names containing `|` still parse. */
export const foodSlotKey = (date: string, meal: FoodMeal, room: string): string => `${date}|${meal}|${room}`

export const parseFoodSlotKey = (key: string): FoodSlot | null => {
  const first = key.indexOf('|')
  const second = key.indexOf('|', first + 1)
  if (first < 0 || second < 0) return null
  const date = key.slice(0, first)
  const meal = key.slice(first + 1, second) as FoodMeal
  if (!ISO_DAY.test(date) || !FOOD_MEALS.includes(meal)) return null
  return { date, meal, room: key.slice(second + 1) }
}

/** Days food can be billed for: conference event dates, or check-in through check-out inclusive. */
export const stayServiceDates = (booking: Pick<Booking, 'checkIn' | 'checkOut' | 'eventDates'>): string[] => {
  const eventDates = (booking.eventDates ?? []).filter((day) => ISO_DAY.test(day))
  if (eventDates.length > 0) return [...new Set(eventDates)].sort()
  const { checkIn, checkOut } = booking
  if (!ISO_DAY.test(checkIn ?? '')) return []
  if (!ISO_DAY.test(checkOut ?? '') || checkOut < checkIn) return [checkIn]
  return eachDay(checkIn, checkOut).slice(0, MAX_STAY_DAYS)
}

/** e.g. "Sat, 17 Oct" */
export const formatServiceDate = (day: string, withYear = false): string =>
  ISO_DAY.test(day)
    ? new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
        timeZone: 'UTC',
      })
    : day

/** Today when it falls inside the stay, otherwise the first stay day. */
export const defaultServiceDate = (stayDates: string[], today: string = businessToday()): string | undefined =>
  stayDates.includes(today) ? today : stayDates[0]

const slotItems = (
  picks: Record<string, number> | undefined,
  menuById: Map<string, MenuItem>
): (MenuItem & { quantity: number })[] =>
  Object.entries(picks ?? {})
    .map(([id, qty]) => {
      const item = menuById.get(id)
      const quantity = Math.max(0, Math.round(Number(qty) || 0))
      return item && quantity > 0 ? { ...item, quantity } : null
    })
    .filter((item): item is MenuItem & { quantity: number } => item !== null)

export interface FilledFoodSlot extends FoodSlot {
  key: string
  items: (MenuItem & { quantity: number })[]
  count: number
  total: number
}

/** Slots with at least one valid item, ordered by date, meal, then `rooms` order (unknown rooms last). */
export const draftSlots = (
  draft: FoodDraft,
  menuById: Map<string, MenuItem>,
  rooms: string[] = []
): FilledFoodSlot[] => {
  const roomRank = (room: string) => {
    const index = rooms.indexOf(room)
    return index < 0 ? rooms.length : index
  }
  return Object.entries(draft)
    .map(([key, picks]) => {
      const slot = parseFoodSlotKey(key)
      if (!slot) return null
      const items = slotItems(picks, menuById)
      if (items.length === 0) return null
      return {
        ...slot,
        key,
        items,
        count: items.length,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      }
    })
    .filter((slot): slot is FilledFoodSlot => slot !== null)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        FOOD_MEALS.indexOf(a.meal) - FOOD_MEALS.indexOf(b.meal) ||
        roomRank(a.room) - roomRank(b.room) ||
        a.room.localeCompare(b.room)
    )
}

/** One food line per filled slot item; each line keeps its slot's date, meal and room. */
export const buildFoodLines = ({
  draft,
  menuById,
  rooms,
  recordedBy,
}: {
  draft: FoodDraft
  menuById: Map<string, MenuItem>
  rooms?: string[]
  recordedBy?: string
}): ExtraChargeInput[] =>
  draftSlots(draft, menuById, rooms).flatMap((slot) =>
    slot.items.map((item) => ({
      category: 'food' as const,
      name: item.name,
      unitPrice: item.price,
      quantity: item.quantity,
      amount: item.price * item.quantity,
      roomName: slot.room || undefined,
      menuItemId: item.id,
      meal: slot.meal,
      serviceDate: slot.date,
      recordedBy,
    }))
  )

const setSlot = (draft: FoodDraft, key: string, picks: Record<string, number> | undefined): FoodDraft => {
  const next = { ...draft }
  if (picks && Object.keys(picks).length > 0) next[key] = { ...picks }
  else delete next[key]
  return next
}

/** Make every room's picks for this date + meal match `fromRoom`'s. */
export const copySlotToRooms = (
  draft: FoodDraft,
  { date, meal, room: fromRoom }: FoodSlot,
  rooms: string[]
): FoodDraft => {
  const source = draft[foodSlotKey(date, meal, fromRoom)]
  return rooms.reduce((next, room) => setSlot(next, foodSlotKey(date, meal, room), source), draft)
}

/** Make this meal on every day match `fromDate`, room by room (rooms empty on `fromDate` are cleared). */
export const copyMealToAllDays = (
  draft: FoodDraft,
  { date: fromDate, meal }: Pick<FoodSlot, 'date' | 'meal'>,
  dates: string[],
  rooms: string[]
): FoodDraft =>
  dates
    .filter((date) => date !== fromDate)
    .reduce(
      (next, date) =>
        rooms.reduce(
          (acc, room) => setSlot(acc, foodSlotKey(date, meal, room), draft[foodSlotKey(fromDate, meal, room)]),
          next
        ),
      draft
    )

export interface FoodRoomGroup {
  roomName: string
  extras: ExtraCharge[]
  total: number
}

export interface FoodMealGroup {
  /** `null` = food recorded without a meal. */
  meal: FoodMeal | null
  rooms: FoodRoomGroup[]
  total: number
}

export interface FoodDayGroup {
  /** `null` = recorded before per-day billing. */
  date: string | null
  meals: FoodMealGroup[]
  total: number
}

const WHOLE_STAY = 'Whole stay'

const sumLines = (extras: ExtraCharge[]): number =>
  extras.reduce((sum, extra) => sum + extraLineTotal(extra), 0)

/** Date (ascending, undated last) > meal (breakfast, lunch, dinner, other) > room (first-seen order). */
export const groupFoodExtras = (extras: ExtraCharge[]): FoodDayGroup[] => {
  const food = extras.filter((extra) => extra.category === 'food')
  const dates = [...new Set(food.map((extra) => extra.serviceDate ?? null))].sort((a, b) => {
    if (a === b) return 0
    if (a === null) return 1
    if (b === null) return -1
    return a.localeCompare(b)
  })
  const mealOrder: (FoodMeal | null)[] = [...FOOD_MEALS, null]

  return dates.map((date) => {
    const dayLines = food.filter((extra) => (extra.serviceDate ?? null) === date)
    const meals = mealOrder
      .map((meal) => {
        const mealLines = dayLines.filter((extra) => (extra.meal ?? null) === meal)
        const roomOrder: string[] = []
        const byRoom = new Map<string, ExtraCharge[]>()
        for (const extra of mealLines) {
          const roomName = extra.roomName?.trim() || WHOLE_STAY
          if (!byRoom.has(roomName)) {
            byRoom.set(roomName, [])
            roomOrder.push(roomName)
          }
          byRoom.get(roomName)?.push(extra)
        }
        const rooms = roomOrder.map((roomName) => {
          const roomLines = byRoom.get(roomName) ?? []
          return { roomName, extras: roomLines, total: sumLines(roomLines) }
        })
        return { meal, rooms, total: sumLines(mealLines) }
      })
      .filter((group) => group.rooms.length > 0)
    return { date, meals, total: sumLines(dayLines) }
  })
}

/** Food by date then meal order, everything else after in recorded order. */
export const sortExtrasForInvoice = (extras: ExtraCharge[]): ExtraCharge[] => {
  const mealRank = (extra: ExtraCharge) => (extra.meal ? FOOD_MEALS.indexOf(extra.meal) : FOOD_MEALS.length)
  const food = extras.filter((extra) => extra.category === 'food')
  const other = extras.filter((extra) => extra.category !== 'food')
  const sortedFood = food
    .map((extra, index) => ({ extra, index }))
    .sort((a, b) => {
      const ad = a.extra.serviceDate ?? '9999-99-99'
      const bd = b.extra.serviceDate ?? '9999-99-99'
      if (ad !== bd) return ad.localeCompare(bd)
      const meal = mealRank(a.extra) - mealRank(b.extra)
      if (meal !== 0) return meal
      const room = (a.extra.roomName ?? '').localeCompare(b.extra.roomName ?? '')
      return room !== 0 ? room : a.index - b.index
    })
    .map(({ extra }) => extra)
  return [...sortedFood, ...other]
}
