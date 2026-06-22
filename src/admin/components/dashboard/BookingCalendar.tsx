import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventContentArg, EventInput } from '@fullcalendar/core'
import { CalendarDays } from 'lucide-react'
import { Card, CardTitle, CardDescription } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { Modal } from '../ui/Modal'
import { BookingStatusBadge } from '../ui/StatusBadge'
import { Badge } from '../ui/Badge'
import { formatShortDate } from '../../utils/date'
import { formatBDT } from '../../utils/format'
import type { Booking } from '../../../utils/bookings'
import { computeBookingFinancials, getBookingRooms } from '../../../utils/bookings'

interface BookingCalendarProps {
  bookings: Booking[]
}

const STATUS_COLORS: Record<Booking['status'], { bg: string; border: string; text: string }> = {
  pending:       { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' },
  confirmed:     { bg: '#DCE9DE', border: '#B7D2BD', text: '#1E4D2B' },
  cancelled:     { bg: '#FEE2E2', border: '#FECACA', text: '#991B1B' },
  'checked-out': { bg: '#F1F1ED', border: '#E2E1DA', text: '#4F4A44' },
}

const toEvents = (bookings: Booking[]): EventInput[] =>
  bookings
    .filter((b) => b.checkIn && b.checkOut)
    .map((b) => {
      const c = STATUS_COLORS[b.status]
      const lines = getBookingRooms(b)
      return {
        id: b.id,
        title: `${b.name} · ${lines.map((l) => l.roomName).join(', ')}`,
        start: b.checkIn,
        end: b.checkOut,
        backgroundColor: c.bg,
        borderColor: c.border,
        textColor: c.text,
        extendedProps: { booking: b },
      }
    })

const renderEvent = (arg: EventContentArg) => (
  <div className="px-2 py-1 text-[11px] leading-snug truncate">
    <span className="font-medium">{arg.event.title}</span>
  </div>
)

export const BookingCalendar = ({ bookings }: BookingCalendarProps) => {
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek'>('dayGridMonth')
  const [selected, setSelected] = useState<Booking | null>(null)

  const events = useMemo(() => toEvents(bookings), [bookings])

  const onEventClick = (arg: EventClickArg) => {
    const booking = arg.event.extendedProps.booking as Booking
    if (booking) setSelected(booking)
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-forest-600" />
            Booking overview
          </CardTitle>
          <CardDescription>Visualize confirmed and pending stays</CardDescription>
        </div>
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: 'dayGridMonth', label: 'Month' },
            { value: 'timeGridWeek', label: 'Week' },
          ]}
        />
      </div>

      <div className="px-3 lg:px-5 pb-5 admin-calendar">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          key={view}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
          height="auto"
          events={events}
          eventClick={onEventClick}
          eventContent={renderEvent}
          dayMaxEvents={3}
          eventDisplay="block"
          firstDay={1}
        />
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        description={selected ? selected.id : undefined}
        size="md"
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <BookingStatusBadge status={selected.status} />
              <Badge tone="forest">{selected.totalGuests} guests</Badge>
              <Badge tone="neutral">{selected.payment?.status ?? 'pending'} payment</Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-stone-500">Check-in</p>
                <p className="font-medium text-forest-700">{formatShortDate(selected.checkIn)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Check-out</p>
                <p className="font-medium text-forest-700">{formatShortDate(selected.checkOut)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Phone</p>
                <p className="font-medium text-forest-700">{selected.phone}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500">Email</p>
                <p className="font-medium text-forest-700 truncate">{selected.email}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-stone-500 mb-2">Rooms</p>
              <ul className="space-y-1.5">
                {getBookingRooms(selected).map((line) => (
                  <li
                    key={`${selected.id}-${line.roomType}`}
                    className="flex items-center justify-between bg-cream/70 px-3 py-2 rounded-xl"
                  >
                    <span className="font-medium text-forest-700 text-sm">{line.roomName}</span>
                    <span className="text-xs text-stone-500">{line.totalGuests} guests</span>
                  </li>
                ))}
              </ul>
            </div>

            {(() => {
              const fin = computeBookingFinancials(selected)
              if (fin.subtotal <= 0 && fin.total <= 0) return null
              return (
                <div className="bg-forest-50 rounded-xl px-4 py-3 space-y-1">
                  {fin.discount > 0 && (
                    <>
                      <div className="flex items-center justify-between text-xs text-stone-600">
                        <span>Subtotal</span>
                        <span>{formatBDT(fin.subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-red-700">
                        <span>Discount</span>
                        <span>− {formatBDT(fin.discount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-forest-700 font-medium uppercase tracking-wide">Total</span>
                    <span className="font-serif text-lg text-forest-700">
                      {formatBDT(fin.total)}
                    </span>
                  </div>
                </div>
              )
            })()}

            {selected.specialRequests && (
              <div>
                <p className="text-xs text-stone-500 mb-1">Special requests</p>
                <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 rounded-xl px-3 py-2">
                  {selected.specialRequests}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Card>
  )
}
