import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDaysToDateString, formatDisplayDate, toLocalDateString } from '../utils/dates'

type StayField = 'checkIn' | 'checkOut'

export interface StayDates {
  checkIn: string
  checkOut: string
}

interface StayDatesPickerProps extends StayDates {
  onChange: (next: StayDates) => void
  minDate: string
  maxDate: string
  errors?: Partial<Record<StayField, string>>
  /** Number of months shown side by side from the `sm` breakpoint up. */
  months?: 1 | 2
  className?: string
  labelClassName?: string
  fieldClassName?: string
  labels?: Partial<Record<StayField, ReactNode>>
  checkOutHint?: ReactNode
  /** Fields share a phone-width row with other inputs: short dates, wider calendar. */
  narrowOnMobile?: boolean
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const monthKey = (iso: string) => iso.slice(0, 7)

const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number)
  return toLocalDateString(new Date(y, m - 1 + delta, 1)).slice(0, 7)
}

const monthCells = (key: string): (string | null)[] => {
  const [y, m] = key.split('-').map(Number)
  const leading = new Date(y, m - 1, 1).getDay()
  const days = new Date(y, m, 0).getDate()
  const cells: (string | null)[] = Array.from({ length: leading }, () => null)
  for (let d = 1; d <= days; d += 1) cells.push(`${key}-${String(d).padStart(2, '0')}`)
  return cells
}

const monthTitle = (key: string) =>
  formatDisplayDate(`${key}-01`, 'en-GB', { month: 'long', year: 'numeric' })

const fieldDate = (iso: string) =>
  formatDisplayDate(iso, 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const shortFieldDate = (iso: string) =>
  formatDisplayDate(iso, 'en-GB', { day: 'numeric', month: 'short' })

const nightsBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)

const StayDatesPicker = ({
  checkIn,
  checkOut,
  onChange,
  minDate,
  maxDate,
  errors,
  months = 2,
  className = 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  labelClassName = 'block text-sm font-medium text-resort-heading mb-2',
  fieldClassName = 'p-3',
  labels,
  checkOutHint,
  narrowOnMobile = false,
}: StayDatesPickerProps) => {
  const baseId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef<Record<StayField, HTMLButtonElement | null>>({ checkIn: null, checkOut: null })
  const gridRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [activeField, setActive] = useState<StayField>('checkIn')
  // The parent may clear the dates while the calendar is open (form reset).
  const active: StayField = activeField === 'checkOut' && !checkIn ? 'checkIn' : activeField
  const [viewMonth, setViewMonth] = useState(() => monthKey(checkIn || minDate))
  const [hoverDate, setHoverDate] = useState('')
  const [focusDate, setFocusDate] = useState('')

  const close = useCallback((returnFocusTo?: StayField) => {
    setOpen(false)
    setHoverDate('')
    if (returnFocusTo) triggerRefs.current[returnFocusTo]?.focus()
  }, [])

  const openFor = (field: StayField) => {
    const target: StayField = field === 'checkOut' && !checkIn ? 'checkIn' : field
    const anchor = (target === 'checkOut' ? checkOut || checkIn : checkIn) || minDate
    setActive(target)
    setViewMonth(monthKey(anchor))
    setFocusDate(anchor)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  useEffect(() => {
    if (!open || !focusDate) return
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-date="${focusDate}"]`)
      ?.focus({ preventScroll: true })
  }, [open, focusDate, viewMonth])

  useEffect(() => {
    if (!open) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    dialogRef.current?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [open])

  const isDisabled = (iso: string) => iso < minDate || iso > maxDate

  const select = (iso: string) => {
    if (isDisabled(iso)) return
    if (active === 'checkIn' || !checkIn || iso <= checkIn) {
      onChange({ checkIn: iso, checkOut: checkOut && checkOut > iso ? checkOut : '' })
      setActive('checkOut')
      setFocusDate(iso)
      return
    }
    onChange({ checkIn, checkOut: iso })
    close('checkOut')
  }

  const moveFocus = (iso: string, days: number) => {
    const next = addDaysToDateString(iso, days)
    if (isDisabled(next)) return
    const lastVisible = shiftMonth(viewMonth, months - 1)
    if (monthKey(next) < viewMonth) setViewMonth(monthKey(next))
    else if (monthKey(next) > lastVisible) setViewMonth(shiftMonth(monthKey(next), -(months - 1)))
    setFocusDate(next)
  }

  const onDayKeyDown = (event: React.KeyboardEvent, iso: string) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (event.key in step) {
      event.preventDefault()
      moveFocus(iso, step[event.key])
    }
  }

  const rangeEnd = checkOut || (active === 'checkOut' && hoverDate > checkIn ? hoverDate : '')
  const visibleMonths = useMemo(
    () => Array.from({ length: months }, (_, i) => shiftMonth(viewMonth, i)),
    [viewMonth, months]
  )
  const canGoBack = viewMonth > monthKey(minDate)
  const canGoForward = shiftMonth(viewMonth, months - 1) < monthKey(maxDate)
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0

  const renderTrigger = (field: StayField, label: ReactNode) => {
    const value = field === 'checkIn' ? checkIn : checkOut
    const error = errors?.[field]
    const isActive = open && active === field
    const fullLabel = value
      ? fieldDate(value)
      : field === 'checkOut' && !checkIn
        ? 'Select check-in first'
        : 'Select date'
    return (
      <div>
        <label htmlFor={`${baseId}-${field}`} className={labelClassName}>
          {label}
        </label>
        <button
          id={`${baseId}-${field}`}
          ref={(el) => {
            triggerRefs.current[field] = el
          }}
          type="button"
          onClick={() => (isActive ? close() : openFor(field))}
          aria-haspopup="dialog"
          aria-expanded={isActive}
          aria-invalid={Boolean(error) || undefined}
          className={`w-full rounded-lg border bg-white text-left transition-shadow focus:outline-none focus:ring-2 focus:ring-resort-cta focus:border-resort-cta ${fieldClassName} ${
            error ? 'border-red-500' : isActive ? 'border-resort-cta ring-2 ring-resort-cta/30' : 'border-gray-300'
          } ${value ? 'text-resort-heading' : 'text-stone-400'} ${narrowOnMobile ? 'truncate' : ''}`}
        >
          {narrowOnMobile ? (
            <>
              <span className="sm:hidden">{value ? shortFieldDate(value) : 'Select'}</span>
              <span className="hidden sm:inline">{fullLabel}</span>
            </>
          ) : (
            fullLabel
          )}
        </button>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {field === 'checkOut' && !error && checkOutHint}
      </div>
    )
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {renderTrigger('checkIn', labels?.checkIn ?? 'Check-in')}
      {renderTrigger('checkOut', labels?.checkOut ?? 'Check-out')}

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-label={active === 'checkIn' ? 'Choose check-in date' : 'Choose check-out date'}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation()
              close(active)
            }
          }}
          className={`absolute left-0 top-full z-50 mt-2 scroll-mt-24 scroll-mb-4 ${
            narrowOnMobile ? 'w-[max(100%,calc(100vw-4rem))]' : 'w-full'
          } sm:w-max max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-4 shadow-xl`}
        >
          <p className="mb-3 text-sm font-medium text-resort-heading" aria-live="polite">
            {active === 'checkIn' ? 'Select your check-in date' : 'Now select your check-out date'}
          </p>

          <div className="relative" ref={gridRef} onPointerLeave={() => setHoverDate('')}>
            <button
              type="button"
              onClick={() => setViewMonth((key) => shiftMonth(key, -1))}
              disabled={!canGoBack}
              aria-label="Previous month"
              className="absolute left-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-resort-heading hover:bg-sand-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setViewMonth((key) => shiftMonth(key, 1))}
              disabled={!canGoForward}
              aria-label="Next month"
              className="absolute right-0 top-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-resort-heading hover:bg-sand-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>

            <div className={`grid gap-6 ${months === 2 ? 'sm:grid-cols-2' : ''}`}>
              {visibleMonths.map((key, monthIndex) => (
                <div key={key} className={`sm:min-w-[16rem] ${monthIndex > 0 ? 'hidden sm:block' : ''}`}>
                  <p className="mb-2 flex h-8 items-center justify-center text-sm font-semibold text-resort-heading">
                    {monthTitle(key)}
                  </p>
                  <div className="grid grid-cols-7 text-center text-[11px] font-medium uppercase text-stone-400">
                    {WEEKDAYS.map((day) => (
                      <span key={day} className="py-1">
                        {day}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthCells(key).map((iso, index) => {
                      if (!iso) return <span key={`blank-${index}`} />
                      const disabled = isDisabled(iso)
                      const isStart = iso === checkIn
                      const isEnd = iso === rangeEnd
                      const inRange = Boolean(checkIn && rangeEnd && iso > checkIn && iso < rangeEnd)
                      const endpoint = isStart || isEnd
                      return (
                        <div
                          key={iso}
                          className={`flex justify-center py-0.5 ${
                            inRange ? 'bg-resort-cta/10' : ''
                          } ${isStart && rangeEnd ? 'bg-gradient-to-r from-transparent from-50% to-resort-cta/10 to-50%' : ''} ${
                            isEnd && checkIn ? 'bg-gradient-to-l from-transparent from-50% to-resort-cta/10 to-50%' : ''
                          }`}
                        >
                          <button
                            type="button"
                            data-date={iso}
                            disabled={disabled}
                            tabIndex={iso === focusDate ? 0 : -1}
                            onClick={() => select(iso)}
                            onPointerEnter={() => setHoverDate(iso)}
                            onFocus={() => setHoverDate(iso)}
                            onKeyDown={(event) => onDayKeyDown(event, iso)}
                            aria-label={formatDisplayDate(iso, 'en-GB', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                            aria-pressed={endpoint}
                            className={`h-9 w-9 shrink-0 rounded-full text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-resort-cta ${
                              endpoint
                                ? 'bg-resort-cta font-semibold text-white'
                                : disabled
                                  ? 'cursor-not-allowed text-stone-300'
                                  : 'text-resort-heading hover:bg-resort-cta/15'
                            }`}
                          >
                            {Number(iso.slice(8))}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-100 pt-3 text-sm">
            <span className="text-stone-500">
              {nights > 0 ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : 'Minimum stay: 1 night'}
            </span>
            <div className="flex items-center gap-2">
              {(checkIn || checkOut) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange({ checkIn: '', checkOut: '' })
                    setActive('checkIn')
                  }}
                  className="rounded-full px-3 py-1.5 text-stone-500 hover:bg-sand-100 hover:text-stone-800"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => close(active)}
                className="rounded-full bg-resort-heading px-4 py-1.5 font-medium text-white hover:bg-resort-heading/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StayDatesPicker
