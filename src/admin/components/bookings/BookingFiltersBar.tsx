import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Input'
import { SearchInput } from '../ui/SearchInput'
import {
  defaultBookingFilters,
  hasActiveBookingFilters,
  type BookingFilterState,
  type DatePreset,
  type DateRangeMode,
  type PaymentFilter,
} from '../../utils/bookingFilters'

interface BookingFiltersBarProps {
  filters: BookingFilterState
  onChange: (filters: BookingFilterState) => void
  search: string
  onSearchChange: (value: string) => void
}

export const BookingFiltersBar = ({
  filters,
  onChange,
  search,
  onSearchChange,
}: BookingFiltersBarProps) => {
  const patch = (partial: Partial<BookingFilterState>) =>
    onChange({ ...filters, ...partial })

  const clear = () => {
    onChange(defaultBookingFilters())
    onSearchChange('')
  }

  const active = hasActiveBookingFilters(filters, search)

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Search &amp; filters
        </p>
        {active && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<X className="w-3.5 h-3.5" />}
            onClick={clear}
          >
            Clear all
          </Button>
        )}
      </div>

      <Field label="Search">
        <SearchInput
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          placeholder="Guest name, phone, email, booking ID, room…"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Date view">
          <Select
            value={filters.datePreset}
            onChange={(e) => patch({ datePreset: e.target.value as DatePreset })}
          >
            <option value="all">All dates</option>
            <option value="arrivals-today">Arrivals today</option>
            <option value="departures-today">Departures today</option>
            <option value="in-house">In-house today</option>
            <option value="upcoming">Upcoming stays</option>
            <option value="this-week">This week (Mon–Sun)</option>
            <option value="custom">Custom date range…</option>
          </Select>
        </Field>

        <Field label="Payment">
          <Select
            value={filters.paymentFilter}
            onChange={(e) => patch({ paymentFilter: e.target.value as PaymentFilter })}
          >
            <option value="all">All payments</option>
            <option value="paid">Fully paid</option>
            <option value="partial">Partially paid</option>
            <option value="pending">Unpaid</option>
            <option value="outstanding">Balance due</option>
            <option value="refunded">Refunded</option>
          </Select>
        </Field>
      </div>

      {filters.datePreset === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-stone-100">
          <Field label="From">
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => patch({ dateFrom: e.target.value })}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => patch({ dateTo: e.target.value })}
            />
          </Field>
          <Field label="Dates apply to" className="sm:col-span-2 lg:col-span-2">
            <Select
              value={filters.dateMode}
              onChange={(e) => patch({ dateMode: e.target.value as DateRangeMode })}
            >
              <option value="stay-overlaps">Stay / event dates (overlaps range)</option>
              <option value="check-in">Check-in / first event date</option>
              <option value="booked-on">Booking created date</option>
            </Select>
          </Field>
        </div>
      )}
    </div>
  )
}
