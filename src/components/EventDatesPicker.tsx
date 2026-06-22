import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { formatDisplayDate, getTodayDate, toLocalDateString } from '../utils/dates'
import { normalizeEventDates } from '../utils/bookingHelpers'

const inputClass =
  'w-full rounded-lg border border-stone-200 bg-cream px-3.5 py-2.5 text-sm text-resort-heading focus:border-resort-cta focus:outline-none focus:ring-2 focus:ring-resort-cta/20 transition-shadow'

interface EventDatesPickerProps {
  dates: string[]
  onChange: (dates: string[]) => void
  minDate?: string
  maxDate?: string
  /** When true, past dates can be added (admin backfill). */
  allowPastDates?: boolean
  error?: string
  label?: string
  hint?: string
}

const EventDatesPicker = ({
  dates,
  onChange,
  minDate,
  maxDate,
  allowPastDates = false,
  error,
  label = 'Event date(s) *',
  hint = 'Add one or more dates when you need the conference room.',
}: EventDatesPickerProps) => {
  const [pickerValue, setPickerValue] = useState('')
  const [pickerError, setPickerError] = useState('')

  const effectiveMinDate = allowPastDates ? undefined : (minDate ?? getTodayDate())

  const resolvedMaxDate =
    maxDate ??
    toLocalDateString(
      (() => {
        const d = new Date()
        d.setFullYear(d.getFullYear() + 1)
        return d
      })()
    )

  const sortedDates = normalizeEventDates(dates)

  const addDate = () => {
    if (!pickerValue) {
      setPickerError('Choose a date first')
      return
    }
    if (effectiveMinDate && pickerValue < effectiveMinDate) {
      setPickerError('Event date cannot be in the past')
      return
    }
    if (pickerValue > resolvedMaxDate) {
      setPickerError('Bookings can be made up to 1 year in advance')
      return
    }
    if (sortedDates.includes(pickerValue)) {
      setPickerError('This date is already selected')
      return
    }

    onChange(normalizeEventDates([...sortedDates, pickerValue]))
    setPickerValue('')
    setPickerError('')
  }

  const removeDate = (date: string) => {
    onChange(sortedDates.filter((d) => d !== date))
    setPickerError('')
  }

  return (
    <div className="space-y-3">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="date"
          value={pickerValue}
          onChange={(e) => {
            setPickerValue(e.target.value)
            setPickerError('')
          }}
          min={effectiveMinDate}
          max={resolvedMaxDate}
          className={`flex-1 ${inputClass} ${
            pickerError || error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''
          }`}
        />
        <button
          type="button"
          onClick={addDate}
          className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 px-4 py-2.5 text-sm font-medium text-resort-heading transition-colors hover:border-resort-heading/30 hover:bg-sand-100"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add date
        </button>
      </div>

      {(pickerError || error) && (
        <p className="text-sm text-red-600">{pickerError || error}</p>
      )}

      {sortedDates.length > 0 ? (
        <ul className="space-y-2">
          {sortedDates.map((date) => (
            <li
              key={date}
              className="flex items-center justify-between gap-3 rounded-lg border border-stone-100 bg-sand-100/80 px-3.5 py-2.5"
            >
              <span className="text-sm font-medium text-resort-heading">
                {formatDisplayDate(date)}
              </span>
              <button
                type="button"
                onClick={() => removeDate(date)}
                className="inline-flex items-center gap-1 text-xs text-stone-500 transition-colors hover:text-red-600"
                aria-label={`Remove ${formatDisplayDate(date)}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-stone-500">{hint}</p>
      )}

      {sortedDates.length > 0 && (
        <p className="text-xs text-stone-500">
          {sortedDates.length === 1 ? '1 event day selected' : `${sortedDates.length} event days selected`}
        </p>
      )}
    </div>
  )
}

export default EventDatesPicker
