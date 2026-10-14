import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CalendarDays, Copy, Plus, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { SearchInput } from '../ui/SearchInput'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import {
  addBookingExtras,
  FOOD_MEAL_LABELS,
  FOOD_MEALS,
  type Booking,
  type BookingRoomLine,
  type FoodMeal,
} from '../../../utils/bookings'
import {
  buildFoodLines,
  copyMealToAllDays,
  copySlotToRooms,
  defaultServiceDate,
  draftSlots,
  foodSlotKey,
  formatServiceDate,
  parseFoodSlotKey,
  stayServiceDates,
  type FoodDraft,
} from '../../../utils/foodBill'
import { formatMenuPrice, type MenuCategory, type MenuItem } from '../../../data/menuCatalog'
import { loadRestaurantMenu, RESTAURANT_MENU_CHANGED_EVENT } from '../../../lib/restaurantMenuDb'
import { formatBDT } from '../../utils/format'
import { cn } from '../../utils/cn'

interface FoodBillComposerProps {
  booking: Booking
  rooms: BookingRoomLine[]
  onAdded: () => void
}

const StepLabel = ({ step, children }: { step: number; children: ReactNode }) => (
  <p className="text-[10px] uppercase tracking-wide text-stone-500">
    <span className="text-forest-700 font-semibold">{step}.</span> {children}
  </p>
)

const CountBadge = ({ count, active }: { count: number; active?: boolean }) =>
  count > 0 ? (
    <span
      className={cn(
        'ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
        active ? 'bg-forest-700 text-white' : 'bg-forest-100 text-forest-800'
      )}
    >
      {count}
    </span>
  ) : null

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const FoodBillComposer = ({ booking, rooms, onAdded }: FoodBillComposerProps) => {
  const toast = useToast()
  const { user } = useAuth()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [search, setSearch] = useState('')
  const [meal, setMeal] = useState<FoodMeal>('breakfast')
  const [draft, setDraft] = useState<FoodDraft>({})
  const [adding, setAdding] = useState(false)

  const stayDates = stayServiceDates(booking)
  const stayKey = stayDates.join('|')
  const [activeDate, setActiveDate] = useState(() => defaultServiceDate(stayDates) ?? '')

  const roomNames = useMemo(() => {
    const names = rooms.map((room) => room.roomName).filter(Boolean)
    if (names.length > 0) return names
    return [booking.roomName || '']
  }, [rooms, booking.roomName])
  const roomKey = roomNames.join('|')
  const multiRoom = roomNames.length > 1
  const [activeRoom, setActiveRoom] = useState(roomNames[0] ?? '')

  useEffect(() => {
    const refresh = () => {
      void loadRestaurantMenu().then(setCategories)
    }
    refresh()
    window.addEventListener(RESTAURANT_MENU_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(RESTAURANT_MENU_CHANGED_EVENT, refresh)
  }, [])

  useEffect(() => {
    const days = stayKey.split('|').filter(Boolean)
    const names = roomKey.split('|')
    setActiveDate((prev) => (days.includes(prev) ? prev : defaultServiceDate(days) ?? ''))
    setActiveRoom((prev) => (names.includes(prev) ? prev : names[0] ?? ''))
    setDraft((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([key]) => {
          const slot = parseFoodSlotKey(key)
          return slot !== null && days.includes(slot.date) && names.includes(slot.room)
        })
      )
    )
  }, [booking.id, stayKey, roomKey])

  const menuById = useMemo(() => {
    const byId = new Map<string, MenuItem>()
    for (const category of categories) {
      for (const item of category.items) byId.set(item.id, item)
    }
    return byId
  }, [categories])

  const visibleCategories = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return categories
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => item.name.toLowerCase().includes(query)),
      }))
      .filter((category) => category.items.length > 0)
  }, [categories, search])

  const slots = draftSlots(draft, menuById, roomNames)
  const lines = buildFoodLines({ draft, menuById, rooms: roomNames })
  const grandTotal = lines.reduce((sum, line) => sum + line.amount, 0)
  const countWhere = (match: (slot: (typeof slots)[number]) => boolean) =>
    slots.filter(match).reduce((sum, slot) => sum + slot.count, 0)
  const activeSlot = slots.find(
    (slot) => slot.date === activeDate && slot.meal === meal && slot.room === activeRoom
  )
  const activeMealFilled = slots.some((slot) => slot.date === activeDate && slot.meal === meal)

  const currentKey = foodSlotKey(activeDate, meal, activeRoom)
  const currentPicks = draft[currentKey] ?? {}

  const setQty = (itemId: string, quantity: number | null) => {
    if (!activeDate) return
    setDraft((prev) => {
      const picks = { ...(prev[currentKey] ?? {}) }
      if (quantity === null) delete picks[itemId]
      else picks[itemId] = Math.max(1, Math.round(quantity))
      const next = { ...prev }
      if (Object.keys(picks).length > 0) next[currentKey] = picks
      else delete next[currentKey]
      return next
    })
  }

  const clearSlot = (key: string) => {
    setDraft((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const openSlot = (key: string) => {
    const slot = parseFoodSlotKey(key)
    if (!slot) return
    setActiveDate(slot.date)
    setMeal(slot.meal)
    setActiveRoom(slot.room)
  }

  const copyToAllRooms = () => {
    setDraft((prev) => copySlotToRooms(prev, { date: activeDate, meal, room: activeRoom }, roomNames))
    toast.success(
      'Copied to all rooms',
      `${formatServiceDate(activeDate)} ${FOOD_MEAL_LABELS[meal].toLowerCase()} from ${activeRoom}`
    )
  }

  const copyToAllDays = () => {
    setDraft((prev) => copyMealToAllDays(prev, { date: activeDate, meal }, stayDates, roomNames))
    toast.success(
      'Copied to all days',
      `${formatServiceDate(activeDate)} ${FOOD_MEAL_LABELS[meal].toLowerCase()} applied to all ${stayDates.length} days`
    )
  }

  const add = async () => {
    if (lines.length === 0) {
      toast.error('Select at least one menu item')
      return
    }
    setAdding(true)
    const updated = await addBookingExtras(
      booking.id,
      buildFoodLines({ draft, menuById, rooms: roomNames, recordedBy: user?.email ?? undefined })
    )
    setAdding(false)
    if (!updated) {
      toast.error('Could not add food items')
      return
    }
    const days = new Set(slots.map((slot) => slot.date))
    const meals = new Set(slots.map((slot) => slot.meal))
    toast.success(
      'Food billed',
      [
        days.size === 1 ? formatServiceDate([...days][0]) : plural(days.size, 'day'),
        meals.size === 1 ? FOOD_MEAL_LABELS[[...meals][0]] : plural(meals.size, 'meal'),
        plural(lines.length, 'item'),
        formatBDT(grandTotal),
      ].join(' · ')
    )
    setDraft({})
    onAdded()
  }

  if (stayDates.length === 0) {
    return <p className="text-xs text-stone-500">This booking has no stay dates.</p>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <StepLabel step={1}>Date</StepLabel>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Date">
          {stayDates.map((day, index) => {
            const active = day === activeDate
            const isCheckout = !booking.eventDates?.length && index === stayDates.length - 1 && stayDates.length > 1
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveDate(day)}
                className={cn(
                  'inline-flex items-center rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-forest-300 bg-forest-50 text-forest-800'
                    : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                )}
              >
                {formatServiceDate(day)}
                {isCheckout && <span className="ml-1 text-[10px] font-normal text-stone-400">check-out</span>}
                <CountBadge count={countWhere((slot) => slot.date === day)} active={active} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <StepLabel step={2}>Meal</StepLabel>
          {stayDates.length > 1 && activeMealFilled && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-forest-700 hover:underline"
              onClick={copyToAllDays}
            >
              <CalendarDays className="w-3 h-3" /> Copy {FOOD_MEAL_LABELS[meal].toLowerCase()} to all days
            </button>
          )}
        </div>
        <div className="inline-flex bg-stone-100 rounded-xl p-1 gap-1" role="tablist" aria-label="Meal">
          {FOOD_MEALS.map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={meal === value}
              onClick={() => setMeal(value)}
              className={cn(
                'inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                meal === value ? 'bg-white text-forest-700 shadow-soft' : 'text-stone-600 hover:text-stone-800'
              )}
            >
              {FOOD_MEAL_LABELS[value]}
              <CountBadge
                count={countWhere((slot) => slot.date === activeDate && slot.meal === value)}
                active={meal === value}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <StepLabel step={3}>
            {multiRoom ? 'Room and items' : 'Items'} · {formatServiceDate(activeDate)} {FOOD_MEAL_LABELS[meal].toLowerCase()}
          </StepLabel>
          {multiRoom && activeSlot && (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-forest-700 hover:underline"
              onClick={copyToAllRooms}
            >
              <Copy className="w-3 h-3" /> Copy to all rooms
            </button>
          )}
        </div>

        {multiRoom && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Room">
            {rooms.map((room) => {
              const active = room.roomName === activeRoom
              const slot = slots.find(
                (entry) => entry.date === activeDate && entry.meal === meal && entry.room === room.roomName
              )
              return (
                <button
                  key={room.roomType || room.roomName}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveRoom(room.roomName)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'border-forest-300 bg-forest-50 text-forest-800'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  )}
                >
                  <span className="block font-medium">{room.roomName}</span>
                  <span className="block text-[11px] text-stone-500">
                    {slot
                      ? `${plural(slot.count, 'item')} · ${formatBDT(slot.total)}`
                      : `${plural(room.totalGuests, 'guest')} · nothing yet`}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={() => setSearch('')}
          placeholder="Search menu"
        />

        <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-stone-100 divide-y divide-stone-100">
          {categories.length === 0 ? (
            <p className="text-sm text-stone-500 px-3 py-4">Menu is empty. Add items in Admin → Menu.</p>
          ) : visibleCategories.length === 0 ? (
            <p className="text-sm text-stone-500 px-3 py-4">No menu items match “{search.trim()}”.</p>
          ) : (
            visibleCategories.map((category) => (
              <div key={category.id} className="px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-stone-400 pt-1 pb-1.5">{category.title}</p>
                <ul className="space-y-0.5">
                  {category.items.map((item) => {
                    const qty = currentPicks[item.id] ?? 0
                    const checked = qty > 0
                    return (
                      <li key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-stone-50">
                        <label className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setQty(item.id, checked ? null : 1)}
                            className="h-4 w-4 rounded border-stone-300 text-forest-700 focus:ring-forest-300"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-stone-800">{item.name}</span>
                            {item.portion ? <span className="text-[11px] text-stone-400">{item.portion}</span> : null}
                          </span>
                        </label>
                        <span className="shrink-0 text-xs tabular-nums text-stone-500">{formatMenuPrice(item.price)}</span>
                        {checked && (
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={qty}
                            onChange={(event) => setQty(item.id, Number(event.target.value || 1))}
                            className="h-8 w-14 px-2"
                            aria-label={`Quantity for ${item.name}`}
                          />
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5 space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-stone-500">Ready to add</p>
        {slots.length === 0 ? (
          <p className="text-sm text-stone-500">
            Nothing selected yet. Tick items, then switch date, meal{multiRoom ? ' or room' : ''} to add more.
          </p>
        ) : (
          <ul className="space-y-1" aria-label="Food ready to add">
            {slots.map((slot) => (
              <li key={slot.key} className="flex items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => openSlot(slot.key)}
                  className={cn(
                    'min-w-0 truncate text-left hover:underline',
                    slot.key === currentKey ? 'text-forest-800 font-medium' : 'text-stone-700'
                  )}
                >
                  {formatServiceDate(slot.date)} · {FOOD_MEAL_LABELS[slot.meal]}
                  {multiRoom ? ` · ${slot.room}` : ''}
                  <span className="text-stone-500 font-normal"> - {plural(slot.count, 'item')}</span>
                </button>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="tabular-nums text-stone-700">{formatBDT(slot.total)}</span>
                  <button
                    type="button"
                    onClick={() => clearSlot(slot.key)}
                    className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    aria-label={`Clear ${formatServiceDate(slot.date)} ${FOOD_MEAL_LABELS[slot.meal]}${multiRoom ? ` ${slot.room}` : ''}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-2">
          <p className="text-sm font-medium text-stone-700 tabular-nums">
            {slots.length > 0 ? `Total ${formatBDT(grandTotal)}` : ''}
          </p>
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => void add()}
            disabled={adding || lines.length === 0}
          >
            {adding ? 'Adding…' : lines.length > 0 ? `Add ${plural(lines.length, 'item')} to bill` : 'Add to bill'}
          </Button>
        </div>
      </div>
    </div>
  )
}
