import { ArrowUpDown, MoreHorizontal, Phone } from 'lucide-react'
import { FaPrint, FaWhatsapp } from 'react-icons/fa'
import { Avatar } from '../ui/Avatar'
import { BookingStatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { useToast } from '../ui/Toast'
import { formatShortDate, formatTime, daysBetween } from '../../utils/date'
import { formatBookingId } from '../../../utils/bookingId'
import { formatBDT, truncate } from '../../utils/format'
import {
  computeBookingFinancials,
  getBookingRooms,
  type Booking,
} from '../../../utils/bookings'
import {
  buildBookingMessages,
  whatsappHref,
} from '../../utils/bookingMessages'
import { printBookingInvoice } from '../../utils/bookingInvoice'
import { cn } from '../../utils/cn'

interface BookingTableProps {
  bookings: Booking[]
  sortKey: keyof Booking | 'totalGuests'
  sortDir: 'asc' | 'desc'
  onSort: (key: keyof Booking | 'totalGuests') => void
  onSelect: (booking: Booking) => void
}

type Column = {
  key: keyof Booking | 'totalGuests'
  label: string
  sortable?: boolean
  className?: string
}

const columns: Column[] = [
  { key: 'id', label: 'Booking', sortable: true },
  { key: 'name', label: 'Guest', sortable: true },
  { key: 'phone', label: 'Phone' },
  { key: 'roomName', label: 'Room' },
  { key: 'checkIn', label: 'Stay', sortable: true },
  { key: 'totalGuests', label: 'Guests', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'specialRequests', label: 'Notes' },
]

export const BookingTable = ({ bookings, sortKey, sortDir, onSort, onSelect }: BookingTableProps) => {
  const toast = useToast()

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  const print = (booking: Booking) => {
    const ok = printBookingInvoice(booking)
    if (!ok) toast.error('Pop-up blocked', 'Allow pop-ups for this site to print invoices.')
  }

  if (bookings.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No bookings match these filters"
          description="Try clearing search or status filters."
        />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-cream/85 backdrop-blur z-10">
          <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
            {columns.map((col) => (
              <th key={col.key as string} className={cn('py-3 px-4 font-medium', col.className)}>
                {col.sortable ? (
                  <button
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-forest-700"
                  >
                    {col.label}
                    <ArrowUpDown
                      className={cn('w-3 h-3 opacity-60', sortKey === col.key && 'opacity-100 text-forest-700')}
                    />
                    {sortKey === col.key && <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
            <th className="py-3 px-4 font-medium text-right text-xs uppercase tracking-wide text-stone-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {bookings.map((booking) => {
            const lines = getBookingRooms(booking)
            const nights = daysBetween(booking.checkIn, booking.checkOut)
            return (
              <tr
                key={booking.id}
                onClick={() => onSelect(booking)}
                className="cursor-pointer hover:bg-cream/40 transition-colors"
              >
                <td className="py-3 px-4">
                  <p className="text-xs font-mono text-stone-500">{formatBookingId(booking.id)}</p>
                  <p className="text-[11px] text-stone-400">{formatShortDate(booking.createdAt)}</p>
                  <p className="text-[11px] text-stone-400">{formatTime(booking.createdAt)}</p>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={booking.name} size="sm" color="#367E7E" />
                    <div className="min-w-0">
                      <p className="font-medium text-forest-700 truncate">{booking.name}</p>
                      <p className="text-xs text-stone-500 truncate">{booking.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-forest-700 inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-stone-400" />
                    {booking.phone}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <p className="font-medium text-forest-700">{lines.map((l) => l.roomName).join(', ')}</p>
                  <p className="text-xs text-stone-500">
                    {lines.length} room{lines.length > 1 ? 's' : ''}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <p className="text-forest-700">{formatShortDate(booking.checkIn)}</p>
                  <p className="text-xs text-stone-500">
                    {nights} night{nights === 1 ? '' : 's'} · until {formatShortDate(booking.checkOut)}
                  </p>
                </td>
                <td className="py-3 px-4">
                  <p className="text-forest-700 font-medium">{booking.totalGuests}</p>
                  <p className="text-xs text-stone-500">
                    {booking.adults}A · {booking.children}C
                  </p>
                </td>
                <td className="py-3 px-4">
                  <BookingStatusBadge status={booking.status} />
                  {(() => {
                    const fin = computeBookingFinancials(booking)
                    if (fin.total <= 0) return null
                    return (
                      <p className="text-[11px] text-stone-500 mt-1">
                        {formatBDT(fin.total)}
                        {fin.discount > 0 && (
                          <span className="text-stone-400"> · {formatBDT(fin.subtotal)} − {formatBDT(fin.discount)}</span>
                        )}
                      </p>
                    )
                  })()}
                </td>
                <td className="py-3 px-4 max-w-[12rem]">
                  <p className="text-xs text-stone-500 truncate">
                    {truncate(booking.specialRequests || '—', 48)}
                  </p>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-0.5" onClick={stop}>
                    <button
                      type="button"
                      onClick={() => print(booking)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-forest-50 text-stone-500 hover:text-forest-700"
                      aria-label="Print invoice"
                      title="Print invoice / Save as PDF"
                    >
                      <FaPrint className="w-4 h-4" />
                    </button>
                    {booking.phone && (
                      <a
                        href={whatsappHref(booking.phone, buildBookingMessages(booking).whatsappBody)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-forest-50 text-stone-500 hover:text-forest-700"
                        aria-label="Message on WhatsApp"
                        title="Message on WhatsApp"
                      >
                        <FaWhatsapp className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelect(booking)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-forest-700"
                      aria-label="Open booking"
                      title="Open booking"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
