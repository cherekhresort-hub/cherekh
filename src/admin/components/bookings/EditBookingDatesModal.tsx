import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import {
  computeBookingFinancials,
  getBookingRooms,
  updateBookingDates,
  type Booking,
} from '../../../utils/bookings'
import { BookingPersistError } from '../../../lib/bookingsStore'
import { describeAvailabilityIssues } from '../../utils/roomAvailabilityMessage'
import {
  bookingIsConferenceOnly,
  calculateStayNights,
  deriveConferenceBounds,
  formatBookingDurationLabel,
  formatEventDatesDisplay,
  getBookingEventDates,
  normalizeEventDates,
  suggestDateChangeAmount,
} from '../../../utils/bookingHelpers'
import { extrasOutsideStay } from '../../../utils/foodBill'
import { toLocalDateString } from '../../../utils/dates'
import StayDatesPicker, { type StayDates } from '../../../components/StayDatesPicker'
import EventDatesPicker from '../../../components/EventDatesPicker'
import { formatBDT } from '../../utils/format'
import { cn } from '../../utils/cn'
import { formatShortDate } from '../../utils/date'

interface EditBookingDatesModalProps {
  open: boolean
  booking: Booking
  onClose: () => void
  onSaved: (booking: Booking) => void
}

const maxBookingDate = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return toLocalDateString(d)
}

export const EditBookingDatesModal = ({
  open,
  booking,
  onClose,
  onSaved,
}: EditBookingDatesModalProps) => {
  const toast = useToast()
  const { canEditPricing } = useAuth()
  const conferenceOnly = bookingIsConferenceOnly(booking)

  const [checkIn, setCheckIn] = useState(booking.checkIn)
  const [checkOut, setCheckOut] = useState(booking.checkOut)
  const [eventDates, setEventDates] = useState<string[]>(() => getBookingEventDates(booking))
  const [amountOverride, setAmountOverride] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setCheckIn(booking.checkIn)
    setCheckOut(booking.checkOut)
    setEventDates(getBookingEventDates(booking))
    setAmountOverride(null)
    setError(null)
    // Reset only when the modal opens, not on every booking refresh behind it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const nextDates = useMemo(() => {
    if (conferenceOnly) {
      const normalized = normalizeEventDates(eventDates)
      const bounds = deriveConferenceBounds(normalized)
      return { checkIn: bounds.checkIn, checkOut: bounds.checkOut, eventDates: normalized }
    }
    return {
      checkIn,
      checkOut,
      eventDates:
        booking.eventDates && booking.eventDates.length > 0
          ? normalizeEventDates(booking.eventDates)
          : undefined,
    }
  }, [conferenceOnly, eventDates, checkIn, checkOut, booking.eventDates])

  const datesValid = conferenceOnly
    ? nextDates.eventDates!.length > 0
    : Boolean(checkIn && checkOut && checkOut > checkIn)

  const currentAmount = Math.round(Number(booking.payment?.amount) || 0)
  const suggestedAmount = useMemo(
    () => (datesValid ? suggestDateChangeAmount(booking, nextDates) : currentAmount),
    [booking, nextDates, datesValid, currentAmount]
  )
  const newAmount = canEditPricing && amountOverride !== null ? amountOverride : suggestedAmount

  const before = useMemo(() => computeBookingFinancials(booking), [booking])
  const after = useMemo(
    () =>
      computeBookingFinancials({
        ...booking,
        ...nextDates,
        payment: { ...booking.payment, amount: newAmount },
      }),
    [booking, nextDates, newAmount]
  )
  const netPaid = after.paid - after.refunded
  const overpaid = Math.max(0, netPaid - after.total)

  const datesChanged = conferenceOnly
    ? normalizeEventDates(getBookingEventDates(booking)).join(',') !==
      normalizeEventDates(eventDates).join(',')
    : checkIn !== booking.checkIn || checkOut !== booking.checkOut
  const hasChanges = datesChanged || newAmount !== currentAmount

  const outOfRangeExtras = useMemo(
    () => (datesValid ? extrasOutsideStay(booking, nextDates) : []),
    [booking, nextDates, datesValid]
  )

  const nextDuration = conferenceOnly
    ? normalizeEventDates(eventDates).length
    : calculateStayNights(checkIn, checkOut)
  const previousDurationLabel = formatBookingDurationLabel(
    conferenceOnly
      ? getBookingEventDates(booking).length
      : calculateStayNights(booking.checkIn, booking.checkOut),
    conferenceOnly
  )
  const nextDurationLabel = formatBookingDurationLabel(nextDuration, conferenceOnly)
  const roomsLabel = getBookingRooms(booking)
    .map((line) => line.roomName)
    .join(', ')

  const handleStayDatesChange = ({ checkIn: nextIn, checkOut: nextOut }: StayDates) => {
    setError(null)
    setCheckIn(nextIn)
    setCheckOut(nextOut)
  }

  const closeIfIdle = () => {
    if (!saving) onClose()
  }

  const save = async () => {
    if (saving) return
    setError(null)
    if (!datesValid) {
      setError(
        conferenceOnly
          ? 'Add at least one event date.'
          : 'Choose a check-out date after check-in.'
      )
      return
    }

    setSaving(true)
    try {
      const result = await updateBookingDates(
        booking.id,
        conferenceOnly
          ? { eventDates: nextDates.eventDates }
          : { checkIn: nextDates.checkIn, checkOut: nextDates.checkOut },
        { amount: canEditPricing && amountOverride !== null ? amountOverride : undefined }
      )
      if (!result.ok) {
        setError(
          result.reason === 'unavailable' && result.issues
            ? describeAvailabilityIssues(result.issues)
            : result.reason === 'status'
              ? 'Dates can only be changed on pending or confirmed bookings.'
              : result.reason === 'forbidden'
                ? 'Only admins and managers can change booking dates.'
                : result.reason === 'empty'
                  ? conferenceOnly
                    ? 'Add at least one event date.'
                    : 'Choose valid check-in and check-out dates.'
                  : 'Could not change dates. Please try again.'
        )
        return
      }
      toast.success(
        'Dates updated',
        conferenceOnly
          ? `${booking.name} · ${formatEventDatesDisplay(result.booking.eventDates ?? [])}`
          : `${booking.name} · ${formatShortDate(result.booking.checkIn)} → ${formatShortDate(result.booking.checkOut)}`
      )
      onSaved(result.booking)
      onClose()
    } catch (e) {
      if (e instanceof BookingPersistError) {
        setError(e.message)
      } else {
        console.error(e)
        setError('Could not save the date change. Please try again.')
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
      title={conferenceOnly ? 'Change event dates' : 'Change dates'}
      description={
        conferenceOnly
          ? 'Update the conference event days. The room must be free on every selected day.'
          : `Update the stay dates for ${roomsLabel || 'this booking'}. Rooms must be free for the new dates.`
      }
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeIfIdle} disabled={saving}>
            Close
          </Button>
          <Button onClick={() => void save()} loading={saving} disabled={!hasChanges || !datesValid}>
            {saving ? 'Saving…' : 'Save dates'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 max-h-[min(70vh,720px)] overflow-y-auto pr-1">
        {conferenceOnly ? (
          <EventDatesPicker
            dates={eventDates}
            onChange={(next) => {
              setError(null)
              setEventDates(next)
            }}
            allowPastDates
            maxDate={maxBookingDate()}
            label="Event date(s) *"
            hint="Add or remove days when the conference room is needed."
          />
        ) : (
          <StayDatesPicker
            checkIn={checkIn}
            checkOut={checkOut}
            onChange={handleStayDatesChange}
            maxDate={maxBookingDate()}
            narrowOnMobile
            className="grid grid-cols-2 gap-4"
            labelClassName="block text-xs font-medium text-stone-600 mb-1.5"
            fieldClassName="h-10 px-3.5 text-sm"
            labels={{
              checkIn: (
                <>
                  Check-in<span className="text-red-500 ml-0.5">*</span>
                </>
              ),
              checkOut: (
                <>
                  Check-out<span className="text-red-500 ml-0.5">*</span>
                </>
              ),
            }}
          />
        )}

        <div className="rounded-2xl border border-stone-200/80 bg-cream/40 px-4 py-3 text-sm text-stone-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            {conferenceOnly ? 'Previous event dates' : 'Previous stay'}:{' '}
            <span className="font-medium text-forest-700">
              {conferenceOnly
                ? formatEventDatesDisplay(getBookingEventDates(booking)) || '—'
                : `${formatShortDate(booking.checkIn)} → ${formatShortDate(booking.checkOut)}`}
            </span>
          </span>
          <span className="text-xs text-stone-500">
            {previousDurationLabel}
            {datesChanged && nextDuration > 0 ? ` → ${nextDurationLabel}` : ''}
          </span>
        </div>

        <div className="rounded-2xl border border-stone-200/80 bg-cream/40 p-4 space-y-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-stone-500 font-medium">Room charge</p>
          <div className="flex justify-between text-stone-600">
            <span>Current room charge</span>
            <span>{formatBDT(currentAmount)}</span>
          </div>
          <div className="flex justify-between text-stone-600">
            <span>Rate-card change for these dates</span>
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
          {outOfRangeExtras.length > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {outOfRangeExtras.length} bill
              {outOfRangeExtras.length === 1 ? '' : 's'} (
              {outOfRangeExtras
                .map((extra) => extra.serviceDate)
                .filter(Boolean)
                .filter((day, i, all) => all.indexOf(day) === i)
                .join(', ')}
              ) fall outside the new dates. They stay on the booking — move or remove them from the
              Bills tab if needed.
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
