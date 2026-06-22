import {
  CalendarArrowDown,
  CalendarArrowUp,
  CheckCircle2,
  ChevronRight,
  Snowflake,
  User,
  Wind,
} from 'lucide-react'
import { formatBDT } from '../../utils/format'
import { formatShortDate } from '../../utils/date'
import { cn } from '../../utils/cn'
import type { AdminRoom } from '../../hooks/useRoomsData'
import type { RoomStatus } from '../../types'

const STATUS_THEME: Record<
  RoomStatus,
  { bar: string; bg: string; label: string; tone: string; ring: string; dot: string }
> = {
  available: {
    bar: 'bg-forest-500',
    bg: 'bg-white',
    label: 'Available',
    tone: 'text-forest-700',
    ring: 'border-stone-100',
    dot: 'bg-forest-500',
  },
  occupied: {
    bar: 'bg-sky-500',
    bg: 'bg-sky-50/30',
    label: 'Occupied',
    tone: 'text-sky-700',
    ring: 'border-sky-100',
    dot: 'bg-sky-500',
  },
  cleaning: {
    bar: 'bg-amber-500',
    bg: 'bg-amber-50/30',
    label: 'Cleaning',
    tone: 'text-amber-700',
    ring: 'border-amber-100',
    dot: 'bg-amber-500',
  },
  maintenance: {
    bar: 'bg-red-500',
    bg: 'bg-red-50/30',
    label: 'Maintenance',
    tone: 'text-red-700',
    ring: 'border-red-100',
    dot: 'bg-red-500',
  },
}

const roomNumber = (room: AdminRoom): string => {
  const match = room.id.match(/(\d{2,4})/)
  return match ? match[1] : ''
}

const OccupancyLine = ({ room }: { room: AdminRoom }) => {
  if (room.currentGuest) {
    return (
      <p className="text-xs text-stone-600 truncate">
        <User className="w-3 h-3 inline -mt-0.5 mr-1 text-stone-400" />
        <span className="font-medium text-forest-700">{room.currentGuest}</span>
        {room.currentCheckOut && (
          <>
            <span className="text-stone-300 mx-1">·</span>
            <CalendarArrowDown className="w-3 h-3 inline -mt-0.5 mr-0.5 text-stone-400" />
            Departs {formatShortDate(room.currentCheckOut)}
          </>
        )}
      </p>
    )
  }

  if (room.nextGuest) {
    return (
      <p className="text-xs text-stone-600 truncate">
        <CalendarArrowUp className="w-3 h-3 inline -mt-0.5 mr-1 text-stone-400" />
        Next: <span className="font-medium text-forest-700">{room.nextGuest}</span>
        {room.nextCheckIn && (
          <>
            <span className="text-stone-300 mx-1">·</span>
            {formatShortDate(room.nextCheckIn)}
          </>
        )}
      </p>
    )
  }

  return (
    <p className="text-xs text-stone-400 inline-flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      No active booking
    </p>
  )
}

interface RoomInventoryCardProps {
  room: AdminRoom
  onClick: () => void
}

export const RoomInventoryCard = ({ room, onClick }: RoomInventoryCardProps) => {
  const theme = STATUS_THEME[room.status]
  const priceUnit = room.isConference ? 'event day' : 'night'
  const hasDiscount = room.listPrice > 0 && room.listPrice > room.price

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left relative rounded-xl border transition-all overflow-hidden',
        'hover:shadow-card hover:border-stone-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300',
        theme.ring,
        theme.bg
      )}
    >
      <span className={cn('absolute left-0 top-0 bottom-0 w-1', theme.bar)} />
      <div className="pl-4 pr-3 py-3.5 flex items-start justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1 space-y-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide',
              theme.tone
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', theme.dot)} />
            {theme.label}
          </span>

          <p className="font-semibold text-forest-700 leading-tight truncate">
            {room.isConference ? room.name : `Room ${roomNumber(room) || room.name}`}
          </p>

          <p className="text-[11px] text-stone-500 truncate">
            {room.isConference ? (
              room.capacityLabel ?? 'Event space'
            ) : (
              <>
                {room.bedType ?? 'Guest room'}
                <span className="text-stone-300 mx-1">·</span>
                <span className={room.isAC ? 'text-sky-700' : 'text-stone-600'}>
                  {room.isAC ? (
                    <Snowflake className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                  ) : (
                    <Wind className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                  )}
                  {room.isAC ? 'AC' : 'Non-AC'}
                </span>
                <span className="text-stone-300 mx-1">·</span>
                {room.capacity} guests
              </>
            )}
          </p>

          <OccupancyLine room={room} />
        </div>

        <div className="shrink-0 text-right flex flex-col items-end gap-1">
          {room.price > 0 ? (
            <div>
              {hasDiscount && (
                <p className="text-[10px] text-stone-400 line-through">{formatBDT(room.listPrice)}</p>
              )}
              <p className="text-sm font-semibold text-forest-700 tabular-nums">{formatBDT(room.price)}</p>
              <p className="text-[10px] text-stone-400">/ {priceUnit}</p>
            </div>
          ) : (
            <p className="text-xs text-stone-400">Rate not set</p>
          )}
          <ChevronRight className="w-4 h-4 text-stone-300 mt-1" />
        </div>
      </div>
    </button>
  )
}
