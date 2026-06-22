import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronRight,
  BedDouble,
  Snowflake,
  Wind,
  User,
  CalendarArrowDown,
  CalendarArrowUp,
  CheckCircle2,
} from 'lucide-react'
import type { AdminRoom } from '../../hooks/useRoomsData'
import { Card, CardDescription, CardTitle } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { formatShortDate } from '../../utils/date'
import { Link } from 'react-router-dom'
import type { RoomStatus } from '../../types'
import { cn } from '../../utils/cn'

interface RoomStatusGridProps {
  rooms: AdminRoom[]
}

type Filter = 'all' | RoomStatus

const STATUS_THEME: Record<
  RoomStatus,
  { bar: string; bg: string; label: string; tone: string; ring: string; dot: string }
> = {
  available:   { bar: 'bg-forest-500', bg: 'bg-white',        label: 'Available',   tone: 'text-forest-700',   ring: 'border-stone-100',  dot: 'bg-forest-500' },
  occupied:    { bar: 'bg-sky-500',    bg: 'bg-sky-50/40',    label: 'Occupied',    tone: 'text-sky-700',      ring: 'border-sky-100',    dot: 'bg-sky-500' },
  cleaning:    { bar: 'bg-amber-500',  bg: 'bg-amber-50/40',  label: 'Cleaning',    tone: 'text-amber-700',    ring: 'border-amber-100',  dot: 'bg-amber-500' },
  maintenance: { bar: 'bg-red-500',    bg: 'bg-red-50/40',    label: 'Maintenance', tone: 'text-red-700',      ring: 'border-red-100',    dot: 'bg-red-500' },
}

export const RoomStatusGrid = ({ rooms }: RoomStatusGridProps) => {
  const [filter, setFilter] = useState<Filter>('all')

  const counts = rooms.reduce(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1, all: acc.all + 1 }),
    { all: 0 } as Record<string, number>
  )

  const visible = filter === 'all' ? rooms : rooms.filter((r) => r.status === filter)

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-6 pt-5 pb-3 space-y-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-forest-600" />
            Room status
          </CardTitle>
          <CardDescription>Live occupancy across all rooms</CardDescription>
        </div>
        <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs
            value={filter}
            onChange={setFilter}
            layoutId="dashboard-room-status-tabs"
            className="w-max"
            items={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'available', label: 'Available', count: counts.available ?? 0 },
              { value: 'occupied', label: 'Occupied', count: counts.occupied ?? 0 },
              { value: 'cleaning', label: 'Cleaning', count: counts.cleaning ?? 0 },
            ]}
          />
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((room, idx) => {
            const theme = STATUS_THEME[room.status]
            const roomNumber = extractRoomNumber(room)
            return (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025, duration: 0.22 }}
                className={cn(
                  'relative rounded-2xl border shadow-soft hover:shadow-card transition-all overflow-hidden',
                  theme.ring,
                  theme.bg
                )}
              >
                <span className={cn('absolute left-0 top-0 bottom-0 w-1', theme.bar)} />
                <div className="pl-3 pr-3.5 py-3 min-w-0 space-y-1">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-medium whitespace-nowrap',
                      theme.tone
                    )}
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full', theme.dot)} />
                    {theme.label}
                  </span>

                  <p className="font-serif text-xl text-forest-700 leading-none">
                    {room.isConference ? room.name : `Room ${roomNumber || room.name}`}
                  </p>

                  <p className="text-[11px] text-stone-600 truncate">
                    {room.isConference ? (
                      <span className="text-forest-700">{room.capacityLabel ?? 'Event space'}</span>
                    ) : (
                      <>
                        {room.bedType ?? 'Bed'}
                        <span className="text-stone-300 mx-1">·</span>
                        <span className={room.isAC ? 'text-sky-700' : 'text-sand-700'}>
                          {room.isAC ? (
                            <Snowflake className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                          ) : (
                            <Wind className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                          )}
                          {room.isAC ? 'AC' : 'Non AC'}
                        </span>
                      </>
                    )}
                  </p>

                  <RoomSubLine room={room} />
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <Link
            to="/admin/rooms"
            className="text-xs font-medium text-forest-700 inline-flex items-center gap-1 hover:gap-2 transition-all"
          >
            Manage all rooms <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </Card>
  )
}

const RoomSubLine = ({ room }: { room: AdminRoom }) => {
  if (room.currentGuest) {
    return (
      <div className="text-[11px] space-y-0.5 min-w-0">
        <p className="text-forest-700 font-medium truncate inline-flex items-center gap-1 max-w-full">
          <User className="w-3 h-3 text-stone-400 shrink-0" />
          <span className="truncate">{room.currentGuest}</span>
        </p>
        {room.currentCheckOut && (
          <p className="text-stone-500 truncate inline-flex items-center gap-1 max-w-full">
            <CalendarArrowDown className="w-3 h-3 text-stone-400 shrink-0" />
            <span className="truncate">Departs {formatShortDate(room.currentCheckOut)}</span>
          </p>
        )}
      </div>
    )
  }
  if (room.nextGuest) {
    return (
      <div className="text-[11px] space-y-0.5 min-w-0">
        <p className="text-stone-700 truncate inline-flex items-center gap-1 max-w-full">
          <User className="w-3 h-3 text-stone-400 shrink-0" />
          <span className="truncate">Next: {room.nextGuest}</span>
        </p>
        {room.nextCheckIn && (
          <p className="text-stone-500 truncate inline-flex items-center gap-1 max-w-full">
            <CalendarArrowUp className="w-3 h-3 text-stone-400 shrink-0" />
            <span className="truncate">{formatShortDate(room.nextCheckIn)}</span>
          </p>
        )}
      </div>
    )
  }
  return (
    <p className="text-[11px] text-stone-400 inline-flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Ready to assign
    </p>
  )
}

const extractRoomNumber = (room: AdminRoom): string => {
  const match = room.id.match(/(\d{2,4})/)
  return match ? match[1] : ''
}
