import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, UtensilsCrossed, Receipt } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input, Select } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import {
  addBookingExtra,
  addBookingExtras,
  extraLineTotal,
  FOOD_MEAL_LABELS,
  FOOD_MEALS,
  getBookingRooms,
  removeBookingExtra,
  type Booking,
  type ExtraCharge,
  type FoodMeal,
} from '../../../utils/bookings'
import { formatMenuPrice, type MenuCategory, type MenuItem } from '../../../data/menuCatalog'
import { loadRestaurantMenu, RESTAURANT_MENU_CHANGED_EVENT } from '../../../lib/restaurantMenuDb'
import { formatBDT } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'

interface ExtraChargesSectionProps {
  booking: Booking
  onChanged: () => void
}

export const ExtraChargesSection = ({ booking, onChanged }: ExtraChargesSectionProps) => {
  const toast = useToast()
  const { user } = useAuth()
  const rooms = getBookingRooms(booking)
  const multiRoom = rooms.length > 1
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [meal, setMeal] = useState<FoodMeal>('breakfast')
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [foodRooms, setFoodRooms] = useState<string[]>(() =>
    rooms[0]?.roomName ? [rooms[0].roomName] : booking.roomName ? [booking.roomName] : []
  )
  const [otherRoom, setOtherRoom] = useState(rooms[0]?.roomName ?? booking.roomName ?? '')
  const [addingFood, setAddingFood] = useState(false)
  const [otherName, setOtherName] = useState('')
  const [otherAmount, setOtherAmount] = useState(0)

  useEffect(() => {
    const refresh = () => {
      void loadRestaurantMenu().then(setCategories)
    }
    refresh()
    window.addEventListener(RESTAURANT_MENU_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(RESTAURANT_MENU_CHANGED_EVENT, refresh)
  }, [])

  const roomNamesKey = rooms.map((room) => room.roomName).join('|')

  useEffect(() => {
    const names = roomNamesKey.split('|').filter(Boolean)
    setFoodRooms((prev) => {
      const kept = prev.filter((name) => names.includes(name))
      if (kept.length > 0) return kept
      return names[0] ? [names[0]] : []
    })
    setOtherRoom((prev) => (names.includes(prev) ? prev : names[0] ?? ''))
  }, [booking.id, roomNamesKey])

  const food = (booking.extras ?? []).filter((extra) => extra.category === 'food')
  const other = (booking.extras ?? []).filter((extra) => extra.category === 'other')
  const foodTotal = food.reduce((sum, extra) => sum + extraLineTotal(extra), 0)
  const otherTotal = other.reduce((sum, extra) => sum + extraLineTotal(extra), 0)

  const checkedItems = useMemo(() => {
    const byId = new Map<string, MenuItem>()
    for (const category of categories) {
      for (const item of category.items) byId.set(item.id, item)
    }
    return Object.entries(selected)
      .filter(([, qty]) => qty > 0)
      .map(([id, quantity]) => {
        const item = byId.get(id)
        if (!item) return null
        return { ...item, quantity }
      })
      .filter((item): item is MenuItem & { quantity: number } => item !== null)
  }, [categories, selected])

  const selectedTotal = checkedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const toggleItem = (itemId: string) => {
    setSelected((prev) => {
      if (prev[itemId]) {
        const next = { ...prev }
        delete next[itemId]
        return next
      }
      return { ...prev, [itemId]: 1 }
    })
  }

  const setQty = (itemId: string, quantity: number) => {
    const nextQty = Math.max(1, quantity)
    setSelected((prev) => (prev[itemId] ? { ...prev, [itemId]: nextQty } : prev))
  }

  const targetRooms = multiRoom
    ? foodRooms
    : [rooms[0]?.roomName || booking.roomName].filter(Boolean)

  const toggleFoodRoom = (roomName: string) => {
    setFoodRooms((prev) =>
      prev.includes(roomName) ? prev.filter((name) => name !== roomName) : [...prev, roomName]
    )
  }

  const addFood = async () => {
    if (checkedItems.length === 0) {
      toast.error('Select at least one menu item')
      return
    }
    if (multiRoom && targetRooms.length === 0) {
      toast.error('Choose at least one room')
      return
    }
    setAddingFood(true)
    const lines = targetRooms.flatMap((roomName) =>
      checkedItems.map((item) => ({
        category: 'food' as const,
        name: item.name,
        unitPrice: item.price,
        quantity: item.quantity,
        amount: item.price * item.quantity,
        roomName: roomName || undefined,
        menuItemId: item.id,
        meal,
        recordedBy: user?.email ?? undefined,
      }))
    )
    const updated = await addBookingExtras(booking.id, lines)
    setAddingFood(false)
    if (!updated) {
      toast.error('Could not add food items')
      return
    }
    const roomLabel = targetRooms.length === 1 ? targetRooms[0] : `${targetRooms.length} rooms`
    toast.success(
      `${FOOD_MEAL_LABELS[meal]} billed`,
      `${checkedItems.length} item${checkedItems.length === 1 ? '' : 's'} · ${roomLabel} · ${formatBDT(selectedTotal * Math.max(1, targetRooms.length))}`
    )
    setSelected({})
    onChanged()
  }

  const addOther = async () => {
    if (!otherName.trim() || otherAmount <= 0) {
      toast.error('Enter a description and amount')
      return
    }
    const updated = await addBookingExtra(booking.id, {
      category: 'other',
      name: otherName.trim(),
      amount: otherAmount,
      quantity: 1,
      unitPrice: otherAmount,
      roomName: otherRoom || undefined,
      recordedBy: user?.email ?? undefined,
    })
    if (!updated) {
      toast.error('Could not add charge')
      return
    }
    toast.success('Charge added', `${otherName.trim()} · ${formatBDT(otherAmount)}`)
    setOtherName('')
    setOtherAmount(0)
    onChanged()
  }

  const remove = async (extra: ExtraCharge) => {
    const ok = await confirmDelete({
      title: 'Remove charge?',
      text: `Remove ${extra.name} (${formatBDT(extraLineTotal(extra))}) from this bill?`,
    })
    if (!ok) return
    const updated = await removeBookingExtra(booking.id, extra.id)
    if (!updated) {
      toast.error('Could not remove charge')
      return
    }
    toast.success('Charge removed')
    onChanged()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">
        Food and other charges are added to this booking's total due. Discount still applies to room
        rent only.
        {multiRoom
          ? ' This stay has several rooms: choose which room each meal is for. Tick more than one room if both should receive the same items.'
          : ''}
      </p>

      <Card padded={false} className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Food bill
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Choose breakfast, lunch, or dinner
              {multiRoom ? ', pick the room, then tick items' : ', then tick items to add'}.
            </p>
          </div>
          {foodTotal > 0 && (
            <p className="font-serif text-lg text-forest-700 tabular-nums">{formatBDT(foodTotal)}</p>
          )}
        </div>

        <div className="inline-flex bg-stone-100 rounded-xl p-1 gap-1">
          {FOOD_MEALS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMeal(value)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                meal === value ? 'bg-white text-forest-700 shadow-soft' : 'text-stone-600 hover:text-stone-800'
              )}
            >
              {FOOD_MEAL_LABELS[value]}
            </button>
          ))}
        </div>

        {multiRoom && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wide text-stone-500">Charge to room</p>
              <button
                type="button"
                className="text-xs text-forest-700 hover:underline"
                onClick={() =>
                  setFoodRooms(
                    foodRooms.length === rooms.length
                      ? rooms[0]?.roomName
                        ? [rooms[0].roomName]
                        : []
                      : rooms.map((room) => room.roomName)
                  )
                }
              >
                {foodRooms.length === rooms.length ? 'Use one room' : 'Select all rooms'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {rooms.map((room) => {
                const checked = foodRooms.includes(room.roomName)
                return (
                  <label
                    key={room.roomType || room.roomName}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer',
                      checked
                        ? 'border-forest-200 bg-forest-50 text-forest-800'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFoodRoom(room.roomName)}
                      className="h-4 w-4 rounded border-stone-300 text-forest-700 focus:ring-forest-300"
                    />
                    {room.roomName}
                    <span className="text-[11px] text-stone-400">
                      {room.totalGuests} guest{room.totalGuests === 1 ? '' : 's'}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="max-h-[22rem] overflow-y-auto rounded-xl border border-stone-100 divide-y divide-stone-100">
          {categories.length === 0 ? (
            <p className="text-sm text-stone-500 px-3 py-4">Menu is empty. Add items in Admin → Menu.</p>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-stone-400 pt-1 pb-1.5">
                  {category.title}
                </p>
                <ul className="space-y-0.5">
                  {category.items.map((item) => {
                    const qty = selected[item.id] ?? 0
                    const checked = qty > 0
                    return (
                      <li key={item.id} className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-stone-50">
                        <label className="flex min-w-0 flex-1 items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            className="h-4 w-4 rounded border-stone-300 text-forest-700 focus:ring-forest-300"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-stone-800">{item.name}</span>
                            {item.portion ? (
                              <span className="text-[11px] text-stone-400">{item.portion}</span>
                            ) : null}
                          </span>
                        </label>
                        <span className="shrink-0 text-xs tabular-nums text-stone-500">
                          {formatMenuPrice(item.price)}
                        </span>
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-stone-600">
            {checkedItems.length === 0
              ? `No items selected for ${FOOD_MEAL_LABELS[meal].toLowerCase()}.`
              : `${checkedItems.length} item${checkedItems.length === 1 ? '' : 's'}${
                  multiRoom && targetRooms.length > 0
                    ? ` × ${targetRooms.length} room${targetRooms.length === 1 ? '' : 's'}`
                    : ''
                } · ${formatBDT(selectedTotal * Math.max(1, targetRooms.length || 1))}`}
          </p>
          <Button
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => void addFood()}
            disabled={addingFood || checkedItems.length === 0 || (multiRoom && targetRooms.length === 0)}
          >
            {addingFood ? 'Adding…' : `Add to ${FOOD_MEAL_LABELS[meal].toLowerCase()}`}
          </Button>
        </div>

        {groupExtrasByRoom(food).map((group) => (
          <div key={group.roomName} className="space-y-2">
            {multiRoom && (
              <p className="text-xs font-medium text-stone-700">{group.roomName}</p>
            )}
            {FOOD_MEALS.map((value) => {
              const items = group.extras.filter((extra) => extra.meal === value)
              if (items.length === 0) return null
              return (
                <ChargeList
                  key={`${group.roomName}-${value}`}
                  title={FOOD_MEAL_LABELS[value]}
                  extras={items}
                  hideRoom={multiRoom}
                  onRemove={remove}
                />
              )
            })}
            {group.extras.some((extra) => !extra.meal) && (
              <ChargeList
                title="Food"
                extras={group.extras.filter((extra) => !extra.meal)}
                hideRoom={multiRoom}
                onRemove={remove}
              />
            )}
          </div>
        ))}
        {food.length === 0 && <p className="text-xs text-stone-500">No food billed to this stay yet.</p>}
      </Card>

      <Card padded={false} className="p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Other bills
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">Laundry, extra guest, or any other charge.</p>
          </div>
          {otherTotal > 0 && (
            <p className="font-serif text-lg text-forest-700 tabular-nums">{formatBDT(otherTotal)}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_auto] gap-2">
          {multiRoom && (
            <Select
              value={otherRoom}
              onChange={(event) => setOtherRoom(event.target.value)}
              className="h-9 sm:col-span-3 max-w-xs"
            >
              {rooms.map((room) => (
                <option key={room.roomType || room.roomName} value={room.roomName}>
                  Charge to {room.roomName}
                </option>
              ))}
            </Select>
          )}
          <Input
            value={otherName}
            onChange={(event) => setOtherName(event.target.value)}
            placeholder="e.g. Laundry, extra guest"
            className="h-9"
          />
          <Input
            type="number"
            min={0}
            step={50}
            value={otherAmount || ''}
            onChange={(event) => setOtherAmount(Math.max(0, Number(event.target.value || 0)))}
            placeholder="৳"
            className="h-9"
          />
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => void addOther()}>
            Add
          </Button>
        </div>
        {other.length === 0 ? (
          <p className="text-xs text-stone-500">No other charges yet.</p>
        ) : (
          <ChargeList extras={other} onRemove={remove} />
        )}
      </Card>
    </div>
  )
}

const groupExtrasByRoom = (
  extras: ExtraCharge[]
): { roomName: string; extras: ExtraCharge[] }[] => {
  const order: string[] = []
  const byRoom = new Map<string, ExtraCharge[]>()
  for (const extra of extras) {
    const roomName = extra.roomName?.trim() || 'Whole stay'
    if (!byRoom.has(roomName)) {
      byRoom.set(roomName, [])
      order.push(roomName)
    }
    byRoom.get(roomName)?.push(extra)
  }
  return order.map((roomName) => ({ roomName, extras: byRoom.get(roomName) ?? [] }))
}

const ChargeList = ({
  title,
  extras,
  hideRoom,
  onRemove,
}: {
  title?: string
  extras: ExtraCharge[]
  hideRoom?: boolean
  onRemove: (extra: ExtraCharge) => void
}) => (
  <div className="space-y-1.5">
    {title && (
      <p className="text-[10px] uppercase tracking-wide text-stone-400">{title}</p>
    )}
    <ul className="space-y-1.5">
      {extras.map((extra) => (
        <li
          key={extra.id}
          className="flex items-center justify-between gap-2 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <p className="text-stone-800 truncate">
              {extra.name}
              {extra.quantity > 1 ? ` × ${extra.quantity}` : ''}
            </p>
            {!hideRoom && extra.roomName && (
              <p className="text-[11px] text-stone-500">{extra.roomName}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-medium tabular-nums text-forest-700">
              {formatBDT(extraLineTotal(extra))}
            </span>
            <button
              type="button"
              onClick={() => onRemove(extra)}
              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              aria-label={`Remove ${extra.name}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  </div>
)
