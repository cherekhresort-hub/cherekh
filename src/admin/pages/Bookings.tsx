import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Plus } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Input'
import { BookingTable } from '../components/bookings/BookingTable'
import { BookingFiltersBar } from '../components/bookings/BookingFiltersBar'
import { BookingDrawer } from '../components/bookings/BookingDrawer'
import { AddBookingModal } from '../components/bookings/AddBookingModal'
import { useBookingsData } from '../hooks/useBookingsData'
import { useToast } from '../components/ui/Toast'
import { exportBookingsToExcel } from '../../utils/exportExcel'
import { ensureBookingDetail, ensureBookingDetails, reloadBookingDetail } from '../../lib/bookingsStore'
import type { Booking } from '../../utils/bookings'
import { roomCatalog, facilityCatalog } from '../../data/roomCatalog'
import { bookingHasRoomType } from '../../utils/bookings'
import {
  applyBookingFilters,
  defaultBookingFilters,
  type BookingFilterState,
} from '../utils/bookingFilters'

type StatusFilter = 'all' | Booking['status']
type SortKey = keyof Booking | 'totalGuests'

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

const compareBookings = (a: Booking, b: Booking, key: SortKey, dir: 'asc' | 'desc'): number => {
  const av = (a as Booking & { totalGuests: number })[key]
  const bv = (b as Booking & { totalGuests: number })[key]

  if (key === 'createdAt' || key === 'updatedAt' || key === 'checkIn' || key === 'checkOut') {
    const at = av ? new Date(String(av)).getTime() : 0
    const bt = bv ? new Date(String(bv)).getTime() : 0
    return dir === 'asc' ? at - bt : bt - at
  }

  if (typeof av === 'number' && typeof bv === 'number') {
    return dir === 'asc' ? av - bv : bv - av
  }

  return dir === 'asc' ? String(av ?? '').localeCompare(String(bv ?? '')) : String(bv ?? '').localeCompare(String(av ?? ''))
}

const Bookings = () => {
  const toast = useToast()
  const { bookings, refresh } = useBookingsData()
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkHandled = useRef<string | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [roomFilter, setRoomFilter] = useState<string>('all')
  const [bookingFilters, setBookingFilters] = useState<BookingFilterState>(defaultBookingFilters)
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [visibleCount, setVisibleCount] = useState(10)
  const [selected, setSelected] = useState<Booking | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  // Keep the currently open drawer in sync with the latest data after any
  // mutation (status change, payment, discount, guest details, etc.).
  useEffect(() => {
    if (!selected) return
    const fresh = bookings.find((b) => b.id === selected.id)
    if (!fresh) {
      setSelected(null)
      return
    }
    if (fresh !== selected) setSelected(fresh)
  }, [bookings, selected])

  useEffect(() => {
    setVisibleCount(pageSize)
  }, [pageSize, status, roomFilter, search, bookingFilters])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: bookings.length, pending: 0, confirmed: 0, cancelled: 0, 'checked-out': 0 }
    bookings.forEach((b) => { base[b.status] = (base[b.status] ?? 0) + 1 })
    return base
  }, [bookings])

  const filtered = useMemo(() => {
    let list = bookings
    if (status !== 'all') list = list.filter((b) => b.status === status)
    if (roomFilter !== 'all') list = list.filter((b) => bookingHasRoomType(b, roomFilter))
    list = applyBookingFilters(list, bookingFilters)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((b) =>
        [b.name, b.email, b.phone, b.id, b.roomName].join(' ').toLowerCase().includes(q)
      )
    }
    const sorted = [...list].sort((a, b) => {
      const primary = compareBookings(a, b, sortKey, sortDir)
      if (primary !== 0) return primary
      return compareBookings(a, b, 'createdAt', 'desc')
    })
    return sorted
  }, [bookings, status, roomFilter, bookingFilters, search, sortKey, sortDir])

  const visibleBookings = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  )

  const canShowMore = visibleCount < filtered.length
  const canShowLess = visibleCount > pageSize
  const rangeStart = filtered.length === 0 ? 0 : 1
  const rangeEnd = Math.min(visibleCount, filtered.length)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('desc') }
  }

  const openBooking = async (booking: Booking) => {
    setSelected(booking)
    setDetailLoading(true)
    try {
      const full = await ensureBookingDetail(booking.id)
      if (full) setSelected(full)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || bookings.length === 0) return
    if (deepLinkHandled.current === id) return

    const booking = bookings.find((b) => b.id === id)
    if (!booking) return

    deepLinkHandled.current = id
    void openBooking(booking)
    setSearchParams(
      (params) => {
        params.delete('id')
        return params
      },
      { replace: true }
    )
  }, [bookings, searchParams, setSearchParams])

  const retryBookingDetail = async () => {
    if (!selected) return
    setDetailLoading(true)
    try {
      const full = await reloadBookingDetail(selected.id)
      if (full) setSelected(full)
    } finally {
      setDetailLoading(false)
    }
  }

  const exportNow = async () => {
    if (filtered.length === 0) {
      toast.info('No bookings to export')
      return
    }
    try {
      const detailed = await ensureBookingDetails(filtered)
      await exportBookingsToExcel(detailed)
      toast.success('Export complete', `${filtered.length} bookings`)
    } catch {
      toast.error('Export failed', 'Please try again.')
    }
  }

  const handleBookingChanged = async () => {
    const id = selected?.id
    await refresh()
    if (!id) return
    const full = await reloadBookingDetail(id)
    if (full) setSelected(full)
  }

  return (
    <>
      <TopBar
        title="Bookings"
        description="Manage reservations across all rooms and stays"
        actions={
          <>
            <Button variant="outline" size="md" leftIcon={<Download className="w-4 h-4" />} onClick={exportNow}>
              Export
            </Button>
            <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setAddOpen(true)}>
              Add booking
            </Button>
          </>
        }
      />
      <main className="px-4 lg:px-8 py-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Tabs<StatusFilter>
              value={status}
              onChange={setStatus}
              className="w-max"
              items={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'pending', label: 'Pending', count: counts.pending ?? 0 },
                { value: 'confirmed', label: 'Confirmed', count: counts.confirmed ?? 0 },
                { value: 'checked-out', label: 'Checked-out', count: counts['checked-out'] ?? 0 },
                { value: 'cancelled', label: 'Cancelled', count: counts.cancelled ?? 0 },
              ]}
            />
          </div>
          <div className="w-full sm:w-56">
            <Select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
              <option value="all">All rooms</option>
              <option value="conference">{facilityCatalog.conference.name}</option>
              {roomCatalog.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>
        </div>

        <BookingFiltersBar
          filters={bookingFilters}
          onChange={setBookingFilters}
          search={search}
          onSearchChange={setSearch}
        />

        <Card className="p-0 overflow-hidden">
          <BookingTable
            bookings={visibleBookings}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            onSelect={openBooking}
          />
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-stone-100 bg-cream/30">
              <p className="text-sm text-stone-600">
                Showing {rangeStart}–{rangeEnd} of {filtered.length} booking{filtered.length === 1 ? '' : 's'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-stone-600">
                  <span className="whitespace-nowrap">Per page</span>
                  <Select
                    value={String(pageSize)}
                    onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                    className="h-9 w-20"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </Select>
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canShowLess}
                  onClick={() => setVisibleCount((count) => Math.max(pageSize, count - pageSize))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canShowMore}
                  onClick={() =>
                    setVisibleCount((count) => Math.min(filtered.length, count + pageSize))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </main>

      <BookingDrawer
        booking={selected}
        detailLoading={detailLoading}
        onClose={() => setSelected(null)}
        onChanged={handleBookingChanged}
        onRetryLoad={retryBookingDetail}
      />

      <AddBookingModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => refresh()}
      />
    </>
  )
}

export default Bookings
