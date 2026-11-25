import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BedDouble, Wind, Snowflake, Users, Save } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Input'
import { RoomStatusBadge } from '../ui/StatusBadge'
import { Badge } from '../ui/Badge'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { updateRoomAvailability, updateRoomPricing } from '../../../utils/rooms'
import { getDiscountPercentFromPrices } from '../../../utils/pricing'
import { formatBDT } from '../../utils/format'
import type { AdminRoom } from '../../hooks/useRoomsData'

interface RoomDetailsModalProps {
  room: AdminRoom | null
  onClose: () => void
  onChanged: () => void
}

export const RoomDetailsModal = ({ room, onClose, onChanged }: RoomDetailsModalProps) => {
  const toast = useToast()
  const { canEditPricing, isAdmin, role } = useAuth()
  const canToggleRoomAvailability = isAdmin || role === 'manager'
  const [listPriceInput, setListPriceInput] = useState('')
  const [discountedPriceInput, setDiscountedPriceInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingAvailability, setTogglingAvailability] = useState(false)

  useEffect(() => {
    setListPriceInput(String(room?.listPrice ?? room?.price ?? ''))
    setDiscountedPriceInput(String(room?.price ?? ''))
  }, [room?.id, room?.price, room?.listPrice])

  const parsePriceInput = (raw: string): number | null => {
    const trimmed = raw.trim()
    if (trimmed === '') return null
    const value = Number(trimmed)
    if (Number.isNaN(value) || value < 0) return null
    return Math.round(value)
  }

  const discountPercent = useMemo(() => {
    const list = parsePriceInput(listPriceInput)
    const sale = parsePriceInput(discountedPriceInput)
    if (list == null || sale == null) return 0
    return getDiscountPercentFromPrices(list, sale)
  }, [listPriceInput, discountedPriceInput])

  if (!room) return <Modal open={false} onClose={onClose}>{null}</Modal>

  const isConference = room.isConference === true
  const priceUnit = isConference ? 'event day' : 'night'

  const saveChanges = async () => {
    if (!canEditPricing) {
      toast.error('Permission denied', 'Only admins can change room rates.')
      return
    }

    const parsedListPrice = parsePriceInput(listPriceInput)
    const parsedDiscountedPrice = parsePriceInput(discountedPriceInput)

    if (parsedListPrice == null || parsedDiscountedPrice == null) {
      toast.error('Invalid prices', 'Enter a valid amount in both price fields.')
      return
    }

    if (parsedDiscountedPrice > parsedListPrice) {
      toast.error('Invalid prices', 'Discounted price cannot be higher than the original price.')
      return
    }

    setSaving(true)
    const result = await updateRoomPricing(room.id, parsedDiscountedPrice, parsedListPrice)
    setSaving(false)

    if (!result.room) {
      toast.error('Could not update room')
      return
    }

    if (result.synced) {
      const discountNote =
        discountPercent > 0 ? ` · ${discountPercent}% off` : ''
      toast.success(
        'Room updated',
        `${room.name} · ${formatBDT(parsedDiscountedPrice)} / ${priceUnit}${discountNote}`
      )
    } else {
      toast.error(
        'Saved locally only',
        'Could not sync to the website. Run migration 016 in Supabase and try again.',
      )
    }

    onChanged()
    onClose()
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!saving) void saveChanges()
  }

  const roomOnline = room.available !== false

  const toggleAvailability = async () => {
    if (!canToggleRoomAvailability) {
      toast.error('Permission denied', 'Only admins and managers can take rooms offline.')
      return
    }
    setTogglingAvailability(true)
    const nextAvailable = !roomOnline
    const result = await updateRoomAvailability(room.id, nextAvailable)
    setTogglingAvailability(false)
    if (!result.room) {
      toast.error('Could not update room availability')
      return
    }
    if (result.synced) {
      toast.success(
        nextAvailable ? 'Room back online' : 'Room taken offline',
        nextAvailable
          ? `${room.name} can be booked again.`
          : `${room.name} is offline for renovation and cannot be booked.`
      )
    } else {
      toast.error(
        'Saved locally only',
        'Could not sync. Run migration 065_availability_flags.sql in Supabase, then try again.'
      )
    }
    onChanged()
  }

  return (
    <Modal
      open={!!room}
      onClose={onClose}
      title={room.name}
      description={
        isConference
          ? `${room.bedType ?? 'Event space'} · ${room.capacityLabel ?? '80-100 people'}`
          : `${room.bedType ?? 'Room'} · Floor ${room.id?.startsWith?.('2') ? 2 : 1}`
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
            Close
          </Button>
          {canEditPricing && (
            <Button
              type="submit"
              form="room-pricing-form"
              leftIcon={<Save className="w-4 h-4" />}
              className="w-full sm:w-auto"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          )}
        </div>
      }
    >
      <form
        id="room-pricing-form"
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-5 min-w-0 overflow-x-hidden"
      >
        <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-stone-100">
          <img src={room.image} alt={room.name} className="w-full h-full object-cover" />
        </div>

        <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-2 w-max sm:w-auto">
            <RoomStatusBadge status={room.status} />
            {isConference ? (
              <>
                <Badge tone="forest" icon={<Users />}>{room.capacityLabel ?? '80-100 people'}</Badge>
                <Badge tone="neutral" icon={<BedDouble />}>Event space</Badge>
              </>
            ) : (
              <>
                <Badge tone={room.isAC ? 'sky' : 'sand'} icon={room.isAC ? <Snowflake /> : <Wind />}>
                  {room.isAC ? 'AC' : 'Non AC'}
                </Badge>
                <Badge tone="forest" icon={<Users />}>{room.capacity} guests max</Badge>
                <Badge tone="neutral" icon={<BedDouble />}>{room.bedType ?? 'Room'}</Badge>
              </>
            )}
          </div>
        </div>

        {room.description && (
          <p className="text-sm text-stone-600 leading-relaxed">{room.description}</p>
        )}

        <div className="rounded-2xl border border-stone-200 bg-cream/50 p-3.5 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-forest-800">Booking availability</p>
              <p className="text-xs text-stone-500">
                {roomOnline
                  ? 'This room can be booked on the website and in admin.'
                  : 'Offline for renovation or maintenance — blocked from new bookings.'}
              </p>
            </div>
            {canToggleRoomAvailability ? (
              <Button
                type="button"
                variant={roomOnline ? 'outline' : 'primary'}
                size="sm"
                className="shrink-0"
                disabled={togglingAvailability}
                onClick={() => void toggleAvailability()}
              >
                {togglingAvailability
                  ? 'Saving…'
                  : roomOnline
                    ? 'Take offline'
                    : 'Put back online'}
              </Button>
            ) : (
              <Badge tone={roomOnline ? 'forest' : 'red'}>
                {roomOnline ? 'Online' : 'Offline'}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="bg-cream/70 rounded-xl p-3">
            <p className="text-xs text-stone-500">{isConference ? 'Current event' : 'Current guest'}</p>
            <p className="font-medium text-forest-700 truncate">
              {room.currentGuest ?? (isConference ? 'Available' : '-')}
            </p>
          </div>
          <div className="bg-cream/70 rounded-xl p-3">
            <p className="text-xs text-stone-500">{isConference ? 'Event dates' : 'Stay'}</p>
            <p className="font-medium text-forest-700 text-sm">
              {room.currentCheckIn ? `${room.currentCheckIn} → ${room.currentCheckOut}` : '-'}
            </p>
          </div>
          <div className="bg-cream/70 rounded-xl p-3">
            <p className="text-xs text-stone-500">{isConference ? 'Next booking' : 'Next arrival'}</p>
            <p className="font-medium text-forest-700 truncate">
              {room.nextGuest ?? (isConference ? 'No upcoming booking' : 'No upcoming stay')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Original price (BDT)"
            hint={
              canEditPricing
                ? 'Shown crossed out on the website when higher than the discounted price.'
                : 'Only admins can edit catalog rates'
            }
          >
            <Input
              type="number"
              min={0}
              value={listPriceInput}
              readOnly={!canEditPricing}
              className={!canEditPricing ? 'bg-stone-50 text-stone-600' : undefined}
              onChange={(e) => setListPriceInput(e.target.value)}
            />
          </Field>

          <Field
            label="Discounted price (BDT)"
            hint={
              canEditPricing
                ? discountPercent > 0
                  ? `${discountPercent}% off · used for ${isConference ? 'event day' : 'booking'} totals`
                  : parsePriceInput(discountedPriceInput) != null &&
                      parsePriceInput(listPriceInput) != null
                    ? 'Same as original - no promo badge shown'
                    : isConference
                      ? 'Used for conference booking totals (per event day)'
                      : 'Used for booking totals'
                : 'Only admins can edit catalog rates'
            }
          >
            <Input
              type="number"
              min={0}
              value={discountedPriceInput}
              readOnly={!canEditPricing}
              className={!canEditPricing ? 'bg-stone-50 text-stone-600' : undefined}
              onChange={(e) => setDiscountedPriceInput(e.target.value)}
            />
          </Field>
        </div>

        {(room.features ?? []).length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-2">
              Features
            </p>
            <div className="flex flex-wrap gap-2">
              {(room.features ?? []).map((f) => (
                <Badge key={f} tone="forest">{f}</Badge>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
