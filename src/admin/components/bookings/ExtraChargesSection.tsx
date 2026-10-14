import { useEffect, useState } from 'react'
import { Plus, UtensilsCrossed, Receipt } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Input, Select } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import {
  addBookingExtra,
  extraLineTotal,
  getBookingRooms,
  removeBookingExtra,
  type Booking,
  type ExtraCharge,
} from '../../../utils/bookings'
import { formatBDT } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { FoodBillComposer } from './FoodBillComposer'
import { ChargeList, FoodBillList } from './FoodBillList'

interface ExtraChargesSectionProps {
  booking: Booking
  onChanged: () => void
}

export const ExtraChargesSection = ({ booking, onChanged }: ExtraChargesSectionProps) => {
  const toast = useToast()
  const { user } = useAuth()
  const rooms = getBookingRooms(booking)
  const multiRoom = rooms.length > 1
  const [otherRoom, setOtherRoom] = useState(rooms[0]?.roomName ?? booking.roomName ?? '')
  const [otherName, setOtherName] = useState('')
  const [otherAmount, setOtherAmount] = useState(0)

  const roomNamesKey = rooms.map((room) => room.roomName).join('|')

  useEffect(() => {
    const names = roomNamesKey.split('|').filter(Boolean)
    setOtherRoom((prev) => (names.includes(prev) ? prev : names[0] ?? ''))
  }, [booking.id, roomNamesKey])

  const food = (booking.extras ?? []).filter((extra) => extra.category === 'food')
  const other = (booking.extras ?? []).filter((extra) => extra.category === 'other')
  const foodTotal = food.reduce((sum, extra) => sum + extraLineTotal(extra), 0)
  const otherTotal = other.reduce((sum, extra) => sum + extraLineTotal(extra), 0)

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
      </p>

      <Card padded={false} className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
              <UtensilsCrossed className="w-3.5 h-3.5" /> Food bill
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Pick a date, a meal{multiRoom ? ' and a room' : ''}, then tick items. Repeat for other days or
              meals, then add them together.
            </p>
          </div>
          {foodTotal > 0 && (
            <p className="font-serif text-lg text-forest-700 tabular-nums">{formatBDT(foodTotal)}</p>
          )}
        </div>

        <FoodBillComposer booking={booking} rooms={rooms} onAdded={onChanged} />

        <FoodBillList extras={food} multiRoom={multiRoom} onRemove={remove} />
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
