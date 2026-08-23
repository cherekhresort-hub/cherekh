import { ArrowRight, Moon, CalendarDays } from 'lucide-react'
import { daysBetween, formatStayRange, formatStayWeekday } from '../../utils/date'
import { parseRoomLabel } from '../../utils/roomLabel'
import { cn } from '../../utils/cn'
import {
  bookingIsConferenceOnly,
  formatEventDatesDisplay,
  getBookingDurationCount,
  getBookingEventDates,
} from '../../../utils/bookingHelpers'
import { getBookingRooms, type Booking } from '../../../utils/bookings'

const RoomNumberTile = ({
  number,
  extraCount,
}: {
  number: string
  extraCount?: number
}) => (
  <span className="relative shrink-0">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-700 font-serif text-[13px] font-semibold tracking-wide text-white shadow-sm">
      {number}
    </span>
    {extraCount && extraCount > 0 ? (
      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sand-200 px-1 text-[9px] font-semibold text-forest-800">
        +{extraCount}
      </span>
    ) : null}
  </span>
)

const AmenityChip = ({ amenity }: { amenity: string }) => {
  const isAc = amenity.toLowerCase() === 'ac'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
        isAc ? 'bg-teal-50 text-teal-800' : 'bg-stone-100 text-stone-600'
      )}
    >
      {amenity}
    </span>
  )
}

export const BookingStaySummary = ({
  booking,
  className,
}: {
  booking: Booking
  className?: string
}) => {
  const lines = getBookingRooms(booking)
  const primary = lines[0]
  const parsed = parseRoomLabel(primary?.roomName ?? booking.roomName ?? '')
  const extraRooms = Math.max(0, lines.length - 1)
  const tileLabel = parsed.number ?? (parsed.bed.toLowerCase().includes('conference') ? 'CR' : '—')
  const isConferenceOnly = bookingIsConferenceOnly(booking)
  const nights = isConferenceOnly
    ? getBookingDurationCount(booking)
    : daysBetween(booking.checkIn, booking.checkOut)
  const extraNames = lines
    .slice(1)
    .map((line) => parseRoomLabel(line.roomName).number ?? line.roomName)
    .filter(Boolean)

  return (
    <div
      className={cn('flex min-w-[13.5rem] items-start gap-3', className)}
      title={lines.map((line) => line.roomName).filter(Boolean).join(', ')}
    >
      <RoomNumberTile number={tileLabel} extraCount={extraRooms} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-sm font-medium text-forest-800">{parsed.bed}</p>
          {parsed.amenity ? <AmenityChip amenity={parsed.amenity} /> : null}
        </div>
        {extraRooms > 0 ? (
          <p className="mt-0.5 truncate text-[11px] text-stone-500">
            {lines.length} rooms
            {extraNames.length > 0 ? ` · ${extraNames.join(', ')}` : ''}
          </p>
        ) : null}
        {isConferenceOnly ? (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-stone-600">
            <CalendarDays className="h-3 w-3 text-stone-400" />
            <span className="truncate">
              {formatEventDatesDisplay(getBookingEventDates(booking))}
            </span>
            <span className="text-stone-400">·</span>
            <span>
              {nights} event day{nights === 1 ? '' : 's'}
            </span>
          </p>
        ) : (
          <div className="mt-1 space-y-0.5">
            <p className="text-xs font-medium text-forest-700">
              {formatStayRange(booking.checkIn, booking.checkOut)}
            </p>
            <p className="inline-flex items-center gap-1 text-[11px] text-stone-500">
              <span>{formatStayWeekday(booking.checkIn)}</span>
              <ArrowRight className="h-3 w-3 text-stone-300" />
              <span>{formatStayWeekday(booking.checkOut)}</span>
              <span className="text-stone-300">·</span>
              <Moon className="h-3 w-3 text-stone-400" />
              <span>
                {nights} night{nights === 1 ? '' : 's'}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
