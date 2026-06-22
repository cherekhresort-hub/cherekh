import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Phone } from 'lucide-react'
import { Card, CardDescription, CardTitle } from '../ui/Card'
import { BookingStatusBadge } from '../ui/StatusBadge'
import { SearchInput } from '../ui/SearchInput'
import { Avatar } from '../ui/Avatar'
import { EmptyState } from '../ui/EmptyState'
import { formatShortDate } from '../../utils/date'
import { formatBDT } from '../../utils/format'
import type { Booking } from '../../../utils/bookings'
import { computeBookingFinancials, getBookingRooms } from '../../../utils/bookings'

interface RecentBookingsProps {
  bookings: Booking[]
}

export const RecentBookings = ({ bookings }: RecentBookingsProps) => {
  const [q, setQ] = useState('')

  const recent = useMemo(() => {
    const filtered = q
      ? bookings.filter((b) =>
          [b.name, b.email, b.phone, b.id, b.roomName].join(' ').toLowerCase().includes(q.toLowerCase())
        )
      : bookings
    return [...filtered]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8)
  }, [bookings, q])

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-6 pt-5 pb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Recent bookings</CardTitle>
          <CardDescription>Latest reservations across all channels</CardDescription>
        </div>
        <div className="w-full sm:w-64">
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onClear={() => setQ('')}
            placeholder="Search guest, room, phone…"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        {recent.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No bookings yet"
              description="When new reservations come in they'll appear here."
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-cream/70 backdrop-blur">
              <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="py-3 px-6 font-medium">Guest</th>
                <th className="py-3 px-3 font-medium">Room</th>
                <th className="py-3 px-3 font-medium">Stay</th>
                <th className="py-3 px-3 font-medium">Status</th>
                <th className="py-3 px-6 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {recent.map((b) => {
                const lines = getBookingRooms(b)
                return (
                  <tr key={b.id} className="hover:bg-cream/40 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar name={b.name} color="#367E7E" size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-forest-700 truncate">{b.name}</p>
                          <p className="text-xs text-stone-500 inline-flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {b.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-forest-700 font-medium">
                        {lines.map((l) => l.roomName).join(', ')}
                      </p>
                      <p className="text-xs text-stone-500">
                        {lines.length} room{lines.length > 1 ? 's' : ''} · {b.totalGuests} guests
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-forest-700">{formatShortDate(b.checkIn)}</p>
                      <p className="text-xs text-stone-500">to {formatShortDate(b.checkOut)}</p>
                    </td>
                    <td className="py-3 px-3">
                      <BookingStatusBadge status={b.status} />
                    </td>
                    <td className="py-3 px-6 text-right">
                      {(() => {
                        const fin = computeBookingFinancials(b)
                        return (
                          <>
                            <p className="font-serif text-forest-700">{formatBDT(fin.total)}</p>
                            <p className="text-xs text-stone-500">{b.payment?.status ?? 'pending'}</p>
                            {fin.discount > 0 && (
                              <p className="text-[10px] text-stone-400">
                                was {formatBDT(fin.subtotal)}
                              </p>
                            )}
                          </>
                        )
                      })()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-6 py-3 border-t border-stone-100 flex justify-end">
        <Link
          to="/admin/bookings"
          className="text-xs font-medium text-forest-700 inline-flex items-center gap-1 hover:gap-2 transition-all"
        >
          View all bookings <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </Card>
  )
}
