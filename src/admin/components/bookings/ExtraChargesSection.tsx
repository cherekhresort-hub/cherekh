import { useEffect, useState } from 'react'
import { Plus, UtensilsCrossed, Receipt } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input, Select } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { BOOKING_HIGHLIGHT } from '../../../lib/activityNavigation'
import {
  addBookingExtra,
  extraLineTotal,
  getBookingRooms,
  labelForOtherChargeKind,
  removeBookingExtra,
  type Booking,
  type ExtraCharge,
  type OtherChargeKind,
} from '../../../utils/bookings'
import {
  addCustomOtherChargeKind,
  listOtherChargeKinds,
} from '../../data/otherChargeKinds'
import { isFoodOnlyBooking } from '../../../utils/bookingHelpers'
import { formatBDT } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { FoodBillComposer } from './FoodBillComposer'
import { ChargeList, FoodBillList } from './FoodBillList'

const ADD_CATEGORY_VALUE = '__add_category__'

interface ExtraChargesSectionProps {
  booking: Booking
  onChanged: () => void
  readOnly?: boolean
}

export const ExtraChargesSection = ({ booking, onChanged, readOnly = false }: ExtraChargesSectionProps) => {
  const toast = useToast()
  const { user } = useAuth()
  const foodOnly = isFoodOnlyBooking(booking)
  const rooms = getBookingRooms(booking)
  const multiRoom = rooms.length > 1
  const [otherRoom, setOtherRoom] = useState(rooms[0]?.roomName ?? booking.roomName ?? '')
  const [kindOptions, setKindOptions] = useState(() => listOtherChargeKinds())
  const [otherKind, setOtherKind] = useState<OtherChargeKind>('laundry')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [otherName, setOtherName] = useState('')
  const [otherAmount, setOtherAmount] = useState(0)

  const roomNamesKey = rooms.map((room) => room.roomName).join('|')

  useEffect(() => {
    const names = roomNamesKey.split('|').filter(Boolean)
    setOtherRoom((prev) => (names.includes(prev) ? prev : names[0] ?? ''))
  }, [booking.id, roomNamesKey])

  useEffect(() => {
    if (kindOptions.some((option) => option.id === otherKind)) return
    setOtherKind(kindOptions[0]?.id ?? 'laundry')
  }, [kindOptions, otherKind])

  const food = (booking.extras ?? []).filter((extra) => extra.category === 'food')
  const other = (booking.extras ?? []).filter((extra) => extra.category === 'other')
  const foodTotal = food.reduce((sum, extra) => sum + extraLineTotal(extra), 0)
  const otherTotal = other.reduce((sum, extra) => sum + extraLineTotal(extra), 0)

  const saveNewCategory = () => {
    const name = newCategoryName.trim()
    const id = addCustomOtherChargeKind(name)
    if (!id) {
      toast.error('Enter a category name')
      return
    }
    setKindOptions(listOtherChargeKinds())
    setOtherKind(id)
    setAddingCategory(false)
    setNewCategoryName('')
    toast.success('Category added', labelForOtherChargeKind(id, name))
  }

  const addOther = async () => {
    if (otherAmount <= 0) {
      toast.error('Enter an amount')
      return
    }
    if (addingCategory) {
      toast.error('Save or cancel the new category first')
      return
    }
    const label = labelForOtherChargeKind(
      otherKind,
      kindOptions.find((option) => option.id === otherKind)?.label
    )
    const detail = otherName.trim()
    const updated = await addBookingExtra(booking.id, {
      category: 'other',
      otherKind,
      otherKindLabel: label,
      name: detail || label,
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
    toast.success('Charge added', `${detail || label} · ${formatBDT(otherAmount)}`)
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
        {readOnly
          ? 'Food and other charges on this booking. Only admins and managers can add or remove bills.'
          : foodOnly
            ? 'Add food for this walk-in guest. The total due is the food bill (no room rent).'
            : "Food and other charges are added to this booking's total due. Discount still applies to room rent only."}
      </p>

      <Card padded={false} className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Food bill
            </h3>
            {!readOnly && (
              <p className="text-xs text-stone-500 mt-0.5">
                {foodOnly
                  ? 'Pick a meal, then tick items. Add them when the order is ready.'
                  : `Pick a date, a meal${multiRoom ? ' and a room' : ''}, then tick items. Repeat for other days or meals, then add them together.`}
              </p>
            )}
          </div>
          {foodTotal > 0 && (
            <p className="font-serif text-lg text-forest-700 tabular-nums">{formatBDT(foodTotal)}</p>
          )}
        </div>

        {!readOnly && <FoodBillComposer booking={booking} rooms={rooms} onAdded={onChanged} />}

        <div data-highlight-id={BOOKING_HIGHLIGHT.bills} className="rounded-xl">
          <FoodBillList extras={food} multiRoom={multiRoom} onRemove={readOnly ? undefined : remove} />
        </div>
      </Card>

      <Card padded={false} className="p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> Other bills
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Pick a category for reports, or add your own. Optionally add a short note.
            </p>
          </div>
          {otherTotal > 0 && (
            <p className="font-serif text-lg text-forest-700 tabular-nums">{formatBDT(otherTotal)}</p>
          )}
        </div>
        {!readOnly && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-[11rem_1fr_7rem_auto] gap-2">
              {multiRoom && (
                <Select
                  value={otherRoom}
                  onChange={(event) => setOtherRoom(event.target.value)}
                  className="h-9 sm:col-span-4 max-w-xs"
                >
                  {rooms.map((room) => (
                    <option key={room.roomType || room.roomName} value={room.roomName}>
                      Charge to {room.roomName}
                    </option>
                  ))}
                </Select>
              )}
              <Select
                value={addingCategory ? ADD_CATEGORY_VALUE : otherKind}
                onChange={(event) => {
                  const value = event.target.value
                  if (value === ADD_CATEGORY_VALUE) {
                    setAddingCategory(true)
                    setNewCategoryName('')
                    return
                  }
                  setAddingCategory(false)
                  setOtherKind(value as OtherChargeKind)
                }}
                className="h-9"
                aria-label="Other bill category"
              >
                {kindOptions.map((kind) => (
                  <option key={kind.id} value={kind.id}>
                    {kind.label}
                  </option>
                ))}
                <option value={ADD_CATEGORY_VALUE}>+ Add category…</option>
              </Select>
              <Input
                value={otherName}
                onChange={(event) => setOtherName(event.target.value)}
                placeholder="Optional note (e.g. 2 shirts)"
                className="h-9"
                disabled={addingCategory}
              />
              <Input
                type="number"
                min={0}
                step={50}
                value={otherAmount || ''}
                onChange={(event) => setOtherAmount(Math.max(0, Number(event.target.value || 0)))}
                placeholder="৳"
                className="h-9"
                disabled={addingCategory}
              />
              <Button
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => void addOther()}
                disabled={addingCategory}
              >
                Add
              </Button>
            </div>
            {addingCategory && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2">
                <Input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      saveNewCategory()
                    }
                    if (event.key === 'Escape') {
                      setAddingCategory(false)
                      setNewCategoryName('')
                    }
                  }}
                  placeholder="New category name (e.g. Spa)"
                  className="h-9 sm:flex-1"
                  autoFocus
                  aria-label="New category name"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveNewCategory}>
                    Save category
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAddingCategory(false)
                      setNewCategoryName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {other.length === 0 ? (
          <p className="text-xs text-stone-500">No other charges yet.</p>
        ) : (
          <ChargeList extras={other} showOtherKind onRemove={readOnly ? undefined : remove} />
        )}
      </Card>
    </div>
  )
}
