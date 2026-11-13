import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { bookableRoomCatalog, getBookableRoomRef } from '../../../data/roomCatalog'
import {
  computeBookingFinancials,
  getBookingRooms,
  updateBookingRooms,
  type Booking,
  type BookingRoomLine,
} from '../../../utils/bookings'
import { getRoomAvailabilityIssues } from '../../../utils/rooms'
import { describeAvailabilityIssues } from '../../utils/roomAvailabilityMessage'
import { BookingPersistError } from '../../../lib/bookingsStore'
import {
  createRoomLine,
  diffBookingRooms,
  getLineTotalGuests,
  suggestRoomChangeAmount,
  type RoomBookingLine,
} from '../../../utils/bookingHelpers'
import { formatBDT } from '../../utils/format'
import { cn } from '../../utils/cn'

interface EditBookingRoomsModalProps {
  open: boolean
  booking: Booking
  onClose: () => void
  onSaved: (booking: Booking) => void
}

const toBookingRooms = (lines: RoomBookingLine[]): BookingRoomLine[] =>
  lines
    .filter((line) => line.roomType)
    .map((line) => ({
      roomType: line.roomType,
      roomName: getBookableRoomRef(line.roomType)?.name ?? `Room ${line.roomType}`,
      adults: line.adults,
      children: line.children,
      totalGuests: getLineTotalGuests(line),
    }))

const linesFromBooking = (booking: Booking): RoomBookingLine[] =>
  getBookingRooms(booking).map((room) =>
    createRoomLine(room.roomType, room.adults ?? 1, room.children ?? 0)
  )

export const EditBookingRoomsModal = ({
  open,
  booking,
  onClose,
  onSaved,
}: EditBookingRoomsModalProps) => {
  const toast = useToast()
  const { canEditPricing } = useAuth()
  const [lines, setLines] = useState<RoomBookingLine[]>(() => linesFromBooking(booking))
  const [bookedRoomIds, setBookedRoomIds] = useState<Set<string>>(() => new Set())
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [amountOverride, setAmountOverride] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLines(linesFromBooking(booking))
    setError(null)
    setAmountOverride(null)
    // Reset only when the modal opens, not on every booking refresh behind it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setCheckingAvailability(true)
    void Promise.all(
      bookableRoomCatalog()
        .filter((room) => !room.isConference)
        .map(async (room) => {
          const issues = await getRoomAvailabilityIssues(
            booking.checkIn,
            booking.checkOut,
            [room.id],
            { excludeBookingId: booking.id }
          )
          return issues.some((issue) => issue.reason === 'booked') ? room.id : null
        })
    )
      .then((ids) => {
        if (!cancelled) setBookedRoomIds(new Set(ids.filter((id): id is string => id !== null)))
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, booking.id, booking.checkIn, booking.checkOut])

  const originalRooms = useMemo(() => getBookingRooms(booking), [booking])
  const nextRooms = useMemo(() => toBookingRooms(lines), [lines])
  const currentAmount = Math.round(Number(booking.payment?.amount) || 0)
  const suggestedAmount = useMemo(
    () => suggestRoomChangeAmount(booking, originalRooms, nextRooms),
    [booking, originalRooms, nextRooms]
  )

  const newAmount = canEditPricing && amountOverride !== null ? amountOverride : suggestedAmount
  const before = useMemo(() => computeBookingFinancials(booking), [booking])
  const after = useMemo(
    () =>
      computeBookingFinancials({ ...booking, payment: { ...booking.payment, amount: newAmount } }),
    [booking, newAmount]
  )
  const netPaid = after.paid - after.refunded
  const overpaid = Math.max(0, netPaid - after.total)

  const { added, removed } = diffBookingRooms(originalRooms, nextRooms)
  const guestsChanged = nextRooms.some((line) => {
    const prev = originalRooms.find((room) => room.roomType === line.roomType)
    return prev && (prev.adults !== line.adults || prev.children !== line.children)
  })
  const hasChanges =
    added.length > 0 || removed.length > 0 || guestsChanged || newAmount !== currentAmount

  const originalRoomIds = new Set(originalRooms.map((room) => room.roomType))
  const optionsForLine = (lineId: string) => {
    const taken = lines.filter((l) => l.id !== lineId && l.roomType).map((l) => l.roomType)
    const current = lines.find((l) => l.id === lineId)?.roomType
    return bookableRoomCatalog().filter(
      (room) =>
        !taken.includes(room.id) &&
        (room.id === current ||
          (!room.isConference && (originalRoomIds.has(room.id) || !bookedRoomIds.has(room.id))))
    )
  }

  const freeRoomCount = bookableRoomCatalog().filter(
    (room) =>
      !room.isConference && (originalRoomIds.has(room.id) || !bookedRoomIds.has(room.id))
  ).length
  const canAddRoom = !checkingAvailability && lines.length < freeRoomCount

  const updateLine = (lineId: string, patch: Partial<RoomBookingLine>) => {
    setError(null)
    setLines((prev) => prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line)))
  }

  const handleGuestChange = (lineId: string, field: 'adults' | 'children', raw: string) => {
    const line = lines.find((l) => l.id === lineId)
    if (!line) return
    if (raw === '') {
      updateLine(lineId, { [field]: 0 })
      return
    }
    const value = parseInt(raw, 10)
    if (Number.isNaN(value) || value < 0) return
    const next = { ...line, [field]: value }
    const capacity = getBookableRoomRef(line.roomType)?.capacity ?? 10
    if (getLineTotalGuests(next) > capacity) return
    updateLine(lineId, { [field]: value })
  }

  const closeIfIdle = () => {
    if (!saving) onClose()
  }

  const save = async () => {
    if (saving) return
    setError(null)
    if (lines.some((line) => !line.roomType)) {
      setError('Choose a room for each line, or remove the empty line.')
      return
    }
    if (nextRooms.length === 0) {
      setError('A booking needs at least one room.')
      return
    }
    if (nextRooms.some((line) => line.adults < 1)) {
      setError('Each room needs at least one adult.')
      return
    }

    setSaving(true)
    try {
      const result = await updateBookingRooms(booking.id, nextRooms, {
        amount: canEditPricing && amountOverride !== null ? amountOverride : undefined,
      })
      if (!result.ok) {
        setError(
          result.reason === 'unavailable' && result.issues
            ? describeAvailabilityIssues(result.issues)
            : result.reason === 'status'
              ? 'Rooms can only be changed on pending or confirmed bookings.'
              : result.reason === 'forbidden'
                ? 'Only admins and managers can change booking rooms.'
                : 'Could not change rooms. Please try again.'
        )
        return
      }
      toast.success('Rooms updated', `${booking.name} · ${result.booking.roomName}`)
      onSaved(result.booking)
      onClose()
    } catch (e) {
      if (e instanceof BookingPersistError) {
        setError(e.message)
      } else {
        console.error(e)
        setError('Could not save the room change. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  const rateDelta = suggestedAmount - currentAmount

  return (
    <Modal
      open={open}
      onClose={closeIfIdle}
      title="Change rooms"
      description="Add or remove rooms for this stay. Only rooms free for these dates can be added."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeIfIdle} disabled={saving}>
            Close
          </Button>
          <Button
            onClick={() => void save()}
            loading={saving}
            disabled={!hasChanges || checkingAvailability}
          >
            {saving ? 'Saving…' : 'Save rooms'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
        <div className="space-y-3">
          {lines.map((line, index) => {
            const options = optionsForLine(line.id)
            const roomRef = line.roomType ? getBookableRoomRef(line.roomType) : undefined
            const isNew = line.roomType && !originalRoomIds.has(line.roomType)
            return (
              <div
                key={line.id}
                className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-forest-700">
                    Room {index + 1}
                    {isNew && (
                      <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        New
                      </span>
                    )}
                  </p>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setLines((prev) => prev.filter((l) => l.id !== line.id))
                      }}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  )}
                </div>

                <Field label="Room" required>
                  <div className="relative">
                    <Select
                      value={line.roomType}
                      onChange={(e) => updateLine(line.id, { roomType: e.target.value })}
                    >
                      <option value="">
                        {checkingAvailability
                          ? 'Checking availability…'
                          : options.length === 0
                            ? 'No rooms free for these dates'
                            : 'Select a free room'}
                      </option>
                      {options.map((room) => (
                        <option key={room.id} value={room.id}>
                          {room.selectLabel}
                        </option>
                      ))}
                    </Select>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </Field>

                {roomRef && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={roomRef.isConference ? 'Attendees' : 'Adults'} required>
                      <Input
                        type="number"
                        min={1}
                        max={roomRef.capacity}
                        value={line.adults || ''}
                        onChange={(e) => handleGuestChange(line.id, 'adults', e.target.value)}
                      />
                    </Field>
                    {!roomRef.isConference && (
                      <Field label="Children (under 12, free)">
                        <Input
                          type="number"
                          min={0}
                          max={Math.max(0, roomRef.capacity - line.adults)}
                          value={line.children || ''}
                          onChange={(e) => handleGuestChange(line.id, 'children', e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {canAddRoom && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setLines((prev) => [...prev, createRoomLine('', 2, 0)])}
            >
              Add room
            </Button>
          )}
          {!checkingAvailability && !canAddRoom && (
            <p className="text-xs text-stone-500">No other rooms are free for these dates.</p>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-cream/40 p-4 space-y-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-stone-500 font-medium">Room charge</p>
          <div className="flex justify-between text-stone-600">
            <span>Current room charge</span>
            <span>{formatBDT(currentAmount)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Rate-card change for these rooms</span>
            <span className={cn(rateDelta > 0 && 'text-forest-700', rateDelta < 0 && 'text-red-600')}>
              {rateDelta > 0 ? '+' : rateDelta < 0 ? '−' : ''}
              {formatBDT(Math.abs(rateDelta))}
            </span>
          </div>
          {canEditPricing ? (
            <Field label="New room charge (BDT)" hint="Calculated from current rates; you can edit it">
              <Input
                type="number"
                min={0}
                step={100}
                value={newAmount}
                onChange={(e) => setAmountOverride(Math.max(0, Number(e.target.value || 0)))}
              />
            </Field>
          ) : (
            <div className="flex justify-between font-medium text-forest-700">
              <span>New room charge</span>
              <span>{formatBDT(suggestedAmount)}</span>
            </div>
          )}
          {canEditPricing && amountOverride !== null && amountOverride !== suggestedAmount && (
            <button
              type="button"
              className="text-xs text-forest-700 underline"
              onClick={() => setAmountOverride(null)}
            >
              Use calculated amount ({formatBDT(suggestedAmount)})
            </button>
          )}
          <div className="border-t border-stone-200/70 pt-3 flex justify-between text-stone-600">
            <span>Booking total (after discount and bills)</span>
            <span>
              {before.total !== after.total && (
                <span className="text-stone-400 line-through mr-2">{formatBDT(before.total)}</span>
              )}
              <span className="font-medium text-forest-700">{formatBDT(after.total)}</span>
            </span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Balance due</span>
            <span className="font-medium">{formatBDT(after.outstanding)}</span>
          </div>
          {overpaid > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              The guest has paid {formatBDT(netPaid)}, which is {formatBDT(overpaid)} more than the
              new total. After saving, record a refund from the Payment tab if you return the money.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
