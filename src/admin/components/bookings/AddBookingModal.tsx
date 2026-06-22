import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Plus, Tag, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import {
  BOOKABLE_ROOM_COUNT,
  bookableRoomCatalog,
  getBookableRoomRef,
  getGuestPolicyLabel,
} from '../../../data/roomCatalog'
import {
  computeDiscountAmount,
  getBookingById,
  saveBooking,
  setBookingDiscount,
  setBookingTotalAmount,
  updateBookingStatus,
  type Booking,
  type BookingRoomLine,
  type DiscountType,
} from '../../../utils/bookings'
import { areRoomsAvailableForBooking } from '../../../utils/rooms'
import { BookingPersistError } from '../../../lib/bookingsStore'
import { isValidEmail, normalizeEmail } from '../../../utils/validation'
import {
  calculateBookingTotal,
  calculateStayNights,
  createRoomLine,
  formatBookingDurationLabel,
  bookingHasGuestRooms,
  bookingIncludesConference,
  deriveConferenceBounds,
  getLineTotalGuests,
  normalizeEventDates,
  type RoomBookingLine,
} from '../../../utils/bookingHelpers'
import EventDatesPicker from '../../../components/EventDatesPicker'
import { formatBDT } from '../../utils/format'
import { toISODate } from '../../utils/date'
import { addDaysToDateString } from '../../../utils/dates'
import { cn } from '../../utils/cn'

const maxBookingDate = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return toISODate(d)
}

interface AddBookingModalProps {
  open: boolean
  onClose: () => void
  onCreated: (booking: Booking) => void
}

type GuestForm = {
  name: string
  email: string
  phone: string
  checkIn: string
  checkOut: string
  specialRequests: string
  status: Booking['status']
  totalAmount: number
  discountType: DiscountType
  discountValue: number
  discountReason: string
}

const defaultGuestForm = (): GuestForm => {
  const today = toISODate()
  const tomorrow = toISODate(new Date(Date.now() + 24 * 60 * 60 * 1000))
  return {
    name: '',
    email: '',
    phone: '',
    checkIn: today,
    checkOut: tomorrow,
    specialRequests: '',
    status: 'pending',
    totalAmount: 0,
    discountType: 'amount',
    discountValue: 0,
    discountReason: '',
  }
}

const linesToBookingRooms = (lines: RoomBookingLine[]): BookingRoomLine[] =>
  lines
    .filter((line) => line.roomType)
    .map((line) => {
      const ref = getBookableRoomRef(line.roomType)
      const totalGuests = getLineTotalGuests(line)
      return {
        roomType: line.roomType,
        roomName: ref?.name ?? `Room ${line.roomType}`,
        adults: line.adults,
        children: line.children,
        totalGuests,
      }
    })

export const AddBookingModal = ({ open, onClose, onCreated }: AddBookingModalProps) => {
  const toast = useToast()
  const { canEditPricing } = useAuth()
  const [guest, setGuest] = useState(defaultGuestForm)
  const [eventDates, setEventDates] = useState<string[]>([])
  const [roomLines, setRoomLines] = useState<RoomBookingLine[]>(() => [createRoomLine('', 2, 0)])
  const [error, setError] = useState<string | null>(null)
  const totalManuallyEdited = useRef(false)

  useEffect(() => {
    if (!open) return
    setGuest(defaultGuestForm())
    setEventDates([])
    setRoomLines([createRoomLine('', 2, 0)])
    setError(null)
    totalManuallyEdited.current = false
  }, [open])

  const bookingRooms = useMemo(() => linesToBookingRooms(roomLines), [roomLines])

  const conferenceOnly = useMemo(() => {
    if (bookingRooms.length === 0) return false
    const summary = { roomType: bookingRooms[0]?.roomType ?? '', rooms: bookingRooms }
    return bookingIncludesConference(summary) && !bookingHasGuestRooms(summary)
  }, [bookingRooms])

  const nights = useMemo(
    () =>
      conferenceOnly
        ? normalizeEventDates(eventDates).length
        : calculateStayNights(guest.checkIn, guest.checkOut),
    [conferenceOnly, eventDates, guest.checkIn, guest.checkOut]
  )

  const suggestedTotal = useMemo(() => {
    if (bookingRooms.length === 0 || nights <= 0) return 0
    const normalizedEventDates = normalizeEventDates(eventDates)
    const bounds =
      conferenceOnly && normalizedEventDates.length > 0
        ? deriveConferenceBounds(normalizedEventDates)
        : { checkIn: guest.checkIn, checkOut: guest.checkOut }
    return calculateBookingTotal({
      checkIn: bounds.checkIn,
      checkOut: bounds.checkOut,
      eventDates: conferenceOnly ? normalizedEventDates : undefined,
      rooms: bookingRooms,
      roomType: bookingRooms[0]?.roomType ?? '',
      adults: bookingRooms.reduce((s, r) => s + r.adults, 0),
      children: bookingRooms.reduce((s, r) => s + r.children, 0),
      totalGuests: bookingRooms.reduce((s, r) => s + r.totalGuests, 0),
    })
  }, [bookingRooms, conferenceOnly, eventDates, guest.checkIn, guest.checkOut, nights])

  useEffect(() => {
    if (!open || totalManuallyEdited.current || bookingRooms.length === 0 || nights <= 0) return
    setGuest((prev) => ({ ...prev, totalAmount: suggestedTotal }))
  }, [open, suggestedTotal, bookingRooms.length, nights])

  const discountAmount = useMemo(
    () =>
      computeDiscountAmount(guest.totalAmount, {
        type: guest.discountType,
        value: guest.discountValue,
      }),
    [guest.totalAmount, guest.discountType, guest.discountValue]
  )

  const finalTotal = Math.max(0, guest.totalAmount - discountAmount)

  const updateGuest = <K extends keyof GuestForm>(key: K, value: GuestForm[K]) =>
    setGuest((prev) => ({ ...prev, [key]: value }))

  const handleCheckInChange = (value: string) => {
    setError(null)
    totalManuallyEdited.current = false
    setGuest((prev) => {
      const next = { ...prev, checkIn: value }
      if (value && prev.checkOut && prev.checkOut <= value) {
        next.checkOut = addDaysToDateString(value, 1)
      }
      return next
    })
  }

  const handleCheckOutChange = (value: string) => {
    if (guest.checkIn && value && value <= guest.checkIn) {
      setError('Check-out must be after check-in.')
      return
    }
    setError(null)
    totalManuallyEdited.current = false
    updateGuest('checkOut', value)
  }

  const minCheckOutDate = guest.checkIn ? addDaysToDateString(guest.checkIn, 1) : undefined

  const getOptionsForLine = (lineId: string) => {
    const taken = roomLines
      .filter((line) => line.id !== lineId && line.roomType)
      .map((line) => line.roomType)
    return bookableRoomCatalog().filter((room) => !taken.includes(room.id))
  }

  const canAddRoom =
    nights > 0 &&
    roomLines.length < BOOKABLE_ROOM_COUNT &&
    roomLines.filter((l) => l.roomType).length < BOOKABLE_ROOM_COUNT

  const addRoomLine = () => {
    totalManuallyEdited.current = false
    setRoomLines((prev) => [...prev, createRoomLine('', 2, 0)])
  }

  const removeRoomLine = (lineId: string) => {
    totalManuallyEdited.current = false
    setRoomLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== lineId)))
  }

  const updateLine = (lineId: string, patch: Partial<RoomBookingLine>) => {
    totalManuallyEdited.current = false
    setRoomLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...patch } : line))
    )
  }

  const handleLineGuestChange = (
    lineId: string,
    field: 'adults' | 'children',
    raw: string
  ) => {
    const line = roomLines.find((l) => l.id === lineId)
    if (!line) return
    const catalog = line.roomType ? getBookableRoomRef(line.roomType) : undefined
    const maxGuests = catalog?.capacity ?? 10

    if (raw === '') {
      updateLine(lineId, { ...line, [field]: 0 })
      return
    }

    const value = parseInt(raw, 10)
    if (Number.isNaN(value) || value < 0) return

    const next = { ...line, [field]: value }
    if (getLineTotalGuests(next) > maxGuests) return
    updateLine(lineId, next)
  }

  const applySuggestedTotal = () => {
    totalManuallyEdited.current = false
    setGuest((prev) => ({ ...prev, totalAmount: suggestedTotal }))
  }

  const submit = async () => {
    setError(null)
    const normalizedEventDates = normalizeEventDates(eventDates)
    const submitBounds =
      conferenceOnly && normalizedEventDates.length > 0
        ? deriveConferenceBounds(normalizedEventDates)
        : { checkIn: guest.checkIn, checkOut: guest.checkOut }

    if (!guest.name || !guest.phone) {
      setError('Please fill in guest name and phone.')
      return
    }
    if (conferenceOnly) {
      if (normalizedEventDates.length === 0) {
        setError('Add at least one event date.')
        return
      }
    } else if (!guest.checkIn || !guest.checkOut) {
      setError('Please fill in guest name, phone, and dates.')
      return
    }
    const email = normalizeEmail(guest.email)
    if (!email || !isValidEmail(email)) {
      setError('A valid guest email is required.')
      return
    }
    if (!conferenceOnly) {
      if (guest.checkOut <= guest.checkIn) {
        setError('Check-out must be after check-in.')
        return
      }
    }
    if (bookingRooms.length === 0) {
      setError('Add at least one room.')
      return
    }
    for (const line of roomLines.filter((l) => l.roomType)) {
      const ref = getBookableRoomRef(line.roomType)
      if (!ref) {
        setError('Select a valid room for each line.')
        return
      }
      if (getLineTotalGuests(line) > ref.capacity) {
        setError(`${ref.name} exceeds max ${ref.capacity} guests.`)
        return
      }
    }
    if (guest.discountType === 'percent' && guest.discountValue > 100) {
      setError('Percent discount cannot exceed 100.')
      return
    }

    const roomTypes = bookingRooms.map((r) => r.roomType)
    const inventoryOk = await areRoomsAvailableForBooking(
      submitBounds.checkIn,
      submitBounds.checkOut,
      roomTypes,
      {
        lines: bookingRooms.map((r) => ({
          roomType: r.roomType,
          adults: r.adults,
          children: r.children,
        })),
        conferenceEventDates: conferenceOnly ? normalizedEventDates : undefined,
      }
    )
    if (!inventoryOk) {
      setError('One or more selected rooms are not available for these dates.')
      return
    }

    try {
      let booking = await saveBooking({
        checkIn: submitBounds.checkIn,
        checkOut: submitBounds.checkOut,
        eventDates: conferenceOnly ? normalizedEventDates : undefined,
        name: guest.name,
        email,
        phone: guest.phone,
        specialRequests: guest.specialRequests,
        rooms: bookingRooms,
      })

      if (guest.status !== 'pending') {
        const withStatus = await updateBookingStatus(booking.id, guest.status)
        if (!withStatus) {
          setError(
            `Booking saved as pending. Could not mark as ${guest.status} — rooms are no longer available for these dates.`
          )
          const pending = getBookingById(booking.id) ?? booking
          onCreated(pending)
          onClose()
          return
        }
        booking = withStatus
      }

      if (canEditPricing) {
        const subtotal = guest.totalAmount > 0 ? guest.totalAmount : suggestedTotal
        if (subtotal > 0) {
          booking = (await setBookingTotalAmount(booking.id, subtotal)) ?? booking
        }
      }

      if (guest.discountValue > 0) {
        booking =
          (await setBookingDiscount(booking.id, {
            type: guest.discountType,
            value: guest.discountValue,
            reason: guest.discountReason.trim() || undefined,
          })) ?? booking
      }

      const latest = getBookingById(booking.id) ?? booking
      const roomLabel =
        bookingRooms.length === 1
          ? bookingRooms[0].roomName
          : `${bookingRooms.length} rooms`
      toast.success('Booking created', `${guest.name} · ${roomLabel}`)
      onCreated(latest)
      onClose()
    } catch (e) {
      if (e instanceof BookingPersistError) {
        setError(e.message)
      } else {
        setError('Could not save booking. Please try again.')
        console.error(e)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add new booking"
      description="One reservation can include multiple rooms for the same stay"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>Create booking</Button>
        </div>
      }
    >
      <div className="space-y-5 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Guest name" required>
            <Input
              value={guest.name}
              onChange={(e) => updateGuest('name', e.target.value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Phone" required>
            <Input
              value={guest.phone}
              onChange={(e) => updateGuest('phone', e.target.value)}
              placeholder="+880 …"
            />
          </Field>
          <Field label="Email" required className="sm:col-span-2">
            <Input
              type="email"
              value={guest.email}
              onChange={(e) => updateGuest('email', e.target.value)}
              placeholder="guest@example.com"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {conferenceOnly ? (
            <div className="sm:col-span-2">
              <EventDatesPicker
                dates={eventDates}
                onChange={setEventDates}
                allowPastDates
                maxDate={maxBookingDate()}
                label="Event date(s) *"
                hint="Add one or more dates for the conference booking."
              />
            </div>
          ) : (
            <>
              <Field label="Check-in" required>
                <Input
                  type="date"
                  value={guest.checkIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  max={maxBookingDate()}
                />
              </Field>
              <Field label="Check-out" required>
                <Input
                  type="date"
                  value={guest.checkOut}
                  onChange={(e) => handleCheckOutChange(e.target.value)}
                  min={minCheckOutDate}
                  max={maxBookingDate()}
                  disabled={!guest.checkIn}
                />
              </Field>
            </>
          )}
          <Field label="Booking status" required>
            <Select
              value={guest.status}
              onChange={(e) => updateGuest('status', e.target.value as Booking['status'])}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-out">Checked-out</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs uppercase tracking-wide text-stone-500 font-medium">
              Rooms ({roomLines.length})
            </p>
            {canAddRoom && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={addRoomLine}
              >
                Add another room
              </Button>
            )}
          </div>

          {nights <= 0 ? (
            <p className="text-xs text-amber-700 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
              {conferenceOnly
                ? 'Add at least one event date before selecting rooms.'
                : 'Set valid check-in and check-out dates before selecting rooms.'}
            </p>
          ) : (
            <div className="space-y-3">
              {roomLines.map((line, index) => {
                const options = getOptionsForLine(line.id)
                const roomRef = line.roomType ? getBookableRoomRef(line.roomType) : undefined

                return (
                  <div
                    key={line.id}
                    className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-forest-700">Room {index + 1}</p>
                      {roomLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRoomLine(line.id)}
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
                          onChange={(e) =>
                            updateLine(line.id, { roomType: e.target.value })
                          }
                        >
                          <option value="">Select a room</option>
                          {options.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.selectLabel}
                            </option>
                          ))}
                        </Select>
                        <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </Field>

                    {roomRef && (
                      <>
                        <p className="text-xs text-stone-500">{roomRef.typeSummary}</p>
                        {!roomRef.isConference && (
                          <p className="text-xs text-stone-500">
                            {getGuestPolicyLabel({
                              bedCategory: 'double',
                              includedGuests: roomRef.includedGuests,
                              maxExtraGuests: roomRef.maxExtraGuests,
                              extraGuestPrice: roomRef.extraGuestPrice,
                            })}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <Field label={roomRef.isConference ? 'Attendees' : 'Adults'} required>
                            <Input
                              type="number"
                              max={roomRef.capacity}
                              value={line.adults || ''}
                              onChange={(e) =>
                                handleLineGuestChange(line.id, 'adults', e.target.value)
                              }
                            />
                          </Field>
                          {!roomRef.isConference && (
                            <Field label="Children (under 12, free)">
                              <Input
                                type="number"
                                min={0}
                                max={Math.max(0, roomRef.capacity - line.adults)}
                                value={line.children || ''}
                                onChange={(e) =>
                                  handleLineGuestChange(line.id, 'children', e.target.value)
                                }
                              />
                            </Field>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-cream/40 p-4 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-stone-500 font-medium">Pricing</p>
              {bookingRooms.length > 0 && nights > 0 && suggestedTotal > 0 && (
                <p className="text-xs text-stone-500 mt-1">
                  Rate card: {bookingRooms.length} room{bookingRooms.length === 1 ? '' : 's'} ·{' '}
                  {formatBookingDurationLabel(nights, conferenceOnly)} · {formatBDT(suggestedTotal)}
                </p>
              )}
            </div>
            {canEditPricing && suggestedTotal > 0 && guest.totalAmount !== suggestedTotal && (
              <Button type="button" size="sm" variant="outline" onClick={applySuggestedTotal}>
                Use rate card ({formatBDT(suggestedTotal)})
              </Button>
            )}
          </div>

          {canEditPricing ? (
            <Field label="Subtotal (BDT)" hint="Sum of all rooms; you can override" required>
              <Input
                type="number"
                min={0}
                step={100}
                value={guest.totalAmount || ''}
                onChange={(e) => {
                  totalManuallyEdited.current = true
                  updateGuest('totalAmount', Math.max(0, Number(e.target.value || 0)))
                }}
                placeholder={suggestedTotal > 0 ? String(suggestedTotal) : '0'}
              />
            </Field>
          ) : (
            <Field label="Subtotal (BDT)" hint="From rate card — managers cannot override rent">
              <Input
                type="text"
                readOnly
                value={suggestedTotal > 0 ? formatBDT(suggestedTotal) : '—'}
                className="bg-stone-50 text-stone-600"
              />
            </Field>
          )}

          <div className="border-t border-stone-200/70 pt-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1">
              <Tag className="w-3 h-3" /> Discount
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Select
                  value={guest.discountType}
                  onChange={(e) => updateGuest('discountType', e.target.value as DiscountType)}
                  className="pr-8"
                >
                  <option value="amount">Flat amount (BDT)</option>
                  <option value="percent">Percent (%)</option>
                </Select>
                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={guest.discountType === 'percent' ? 100 : undefined}
                  step={guest.discountType === 'percent' ? 1 : 100}
                  value={guest.discountValue || ''}
                  onChange={(e) =>
                    updateGuest('discountValue', Math.max(0, Number(e.target.value || 0)))
                  }
                  placeholder={guest.discountType === 'percent' ? '10' : '500'}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
                  {guest.discountType === 'percent' ? '%' : '৳'}
                </span>
              </div>
            </div>
            <Input
              value={guest.discountReason}
              onChange={(e) => updateGuest('discountReason', e.target.value)}
              placeholder="Reason (optional) — e.g. returning guest, group rate"
            />
            {guest.discountValue > 0 && guest.totalAmount > 0 && (
              <p className="text-xs text-stone-500">
                Discount {formatBDT(discountAmount)} · Total due{' '}
                <span className={cn('font-medium text-forest-700')}>{formatBDT(finalTotal)}</span>
              </p>
            )}
          </div>
        </div>

        <Field label="Special requests">
          <Textarea
            value={guest.specialRequests}
            onChange={(e) => updateGuest('specialRequests', e.target.value)}
            placeholder="Late check-in, dietary needs, transport, etc."
            rows={3}
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
