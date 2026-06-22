import { useMemo, useState } from 'react'
import { BedDouble } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { SearchInput } from '../components/ui/SearchInput'
import { EmptyState } from '../components/ui/EmptyState'
import { RoomInventoryCard } from '../components/rooms/RoomInventoryCard'
import { RoomDetailsModal } from '../components/rooms/RoomDetailsModal'
import { useRoomsData } from '../hooks/useRoomsData'
import type { RoomStatus } from '../types'

type Filter = 'all' | RoomStatus

const STAT_ITEMS: Array<{ key: Filter | RoomStatus; label: string }> = [
  { key: 'all', label: 'Total' },
  { key: 'available', label: 'Available' },
  { key: 'occupied', label: 'Occupied' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'maintenance', label: 'Maintenance' },
]

const Rooms = () => {
  const { rooms, refresh } = useRoomsData()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<(typeof rooms)[number] | null>(null)

  const counts = useMemo(
    () =>
      rooms.reduce<Record<string, number>>(
        (acc, r) => {
          acc.all += 1
          acc[r.status] = (acc[r.status] ?? 0) + 1
          return acc
        },
        { all: 0 }
      ),
    [rooms]
  )

  const filtered = useMemo(() => {
    let list = rooms
    if (filter !== 'all') list = list.filter((r) => r.status === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) =>
        `${r.name} ${r.id} ${r.bedType ?? ''} ${r.currentGuest ?? ''} ${r.nextGuest ?? ''}`
          .toLowerCase()
          .includes(q)
      )
    }
    return list
  }, [rooms, filter, search])

  return (
    <>
      <TopBar
        title="Rooms"
        description="Occupancy, rates, and room inventory"
      />
      <main className="px-4 lg:px-8 py-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {STAT_ITEMS.map(({ key, label }) => (
            <Card key={key} className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-stone-500">{label}</p>
              <p className="text-2xl font-semibold text-forest-700 tabular-nums mt-0.5">
                {counts[key] ?? 0}
              </p>
            </Card>
          ))}
        </div>

        <Card className="p-4 space-y-4">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder="Search room, guest, or bed type…"
          />
          <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Tabs<Filter>
              value={filter}
              onChange={setFilter}
              layoutId="rooms-page-tabs"
              className="w-max"
              items={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'available', label: 'Available', count: counts.available ?? 0 },
                { value: 'occupied', label: 'Occupied', count: counts.occupied ?? 0 },
                { value: 'cleaning', label: 'Cleaning', count: counts.cleaning ?? 0 },
                { value: 'maintenance', label: 'Maintenance', count: counts.maintenance ?? 0 },
              ]}
            />
          </div>
        </Card>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<BedDouble className="w-5 h-5" />}
            title="No rooms match"
            description="Try a different status filter or search term."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((room) => (
              <RoomInventoryCard
                key={room.id}
                room={room}
                onClick={() => setSelected(room)}
              />
            ))}
          </div>
        )}
      </main>

      <RoomDetailsModal room={selected} onClose={() => setSelected(null)} onChanged={refresh} />
    </>
  )
}

export default Rooms
