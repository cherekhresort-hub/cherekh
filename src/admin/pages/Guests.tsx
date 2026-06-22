import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { GuestDrawer } from '../components/guests/GuestDrawer'
import { GuestTable, type GuestSortKey } from '../components/guests/GuestTable'
import { getGuests } from '../data/guests'
import { useBookingsData } from '../hooks/useBookingsData'
import type { Guest, GuestTag } from '../types'

type TagFilter = 'all' | GuestTag

const Guests = () => {
  const { bookings } = useBookingsData()
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkHandled = useRef<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<TagFilter>('all')
  const [sortKey, setSortKey] = useState<GuestSortKey>('lastStay')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Guest | null>(null)
  const [overridesVersion, setOverridesVersion] = useState(0)

  const refreshOverrides = useCallback(() => setOverridesVersion((v) => v + 1), [])

  const guests = useMemo(
    () => getGuests(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookings.length, overridesVersion]
  )

  useEffect(() => {
    if (!selected) return
    const fresh = guests.find((g) => g.id === selected.id)
    if (!fresh) {
      setSelected(null)
      return
    }
    if (fresh !== selected) setSelected(fresh)
  }, [guests, selected])

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || guests.length === 0) return
    if (deepLinkHandled.current === id) return

    const guest = guests.find((g) => g.id === id)
    if (!guest) return

    deepLinkHandled.current = id
    setSelected(guest)
    setSearchParams(
      (params) => {
        params.delete('id')
        return params
      },
      { replace: true }
    )
  }, [guests, searchParams, setSearchParams])

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: guests.length, vip: 0, returning: 0, frequent: 0, new: 0 }
    guests.forEach((g) => g.tags.forEach((t) => (base[t] = (base[t] ?? 0) + 1)))
    return base
  }, [guests])

  const filtered = useMemo(() => {
    let list = guests
    if (filter !== 'all') list = list.filter((g) => g.tags.includes(filter))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((g) => `${g.name} ${g.email} ${g.phone}`.toLowerCase().includes(q))
    }

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1

      if (sortKey === 'totalStays' || sortKey === 'totalSpent') {
        return (a[sortKey] - b[sortKey]) * dir
      }

      if (sortKey === 'lastStay') {
        const av = a.lastStay ?? ''
        const bv = b.lastStay ?? ''
        if (!av && !bv) return 0
        if (!av) return 1
        if (!bv) return -1
        return av.localeCompare(bv) * dir
      }

      const av = (a[sortKey] ?? '').toString().toLowerCase()
      const bv = (b[sortKey] ?? '').toString().toLowerCase()
      return av.localeCompare(bv) * dir
    })
  }, [guests, filter, search, sortKey, sortDir])

  const toggleSort = (key: GuestSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'name' || key === 'phone' ? 'asc' : 'desc')
    }
  }

  return (
    <>
      <TopBar
        title="Guests"
        description="Track loyalty, history, and preferences"
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, email, phone…' }}
      />
      <main className="px-4 lg:px-8 py-6 space-y-4">
        <Tabs<TagFilter>
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'all', label: 'All guests', count: counts.all },
            { value: 'vip', label: 'VIP', count: counts.vip ?? 0 },
            { value: 'frequent', label: 'Frequent', count: counts.frequent ?? 0 },
            { value: 'returning', label: 'Returning', count: counts.returning ?? 0 },
            { value: 'new', label: 'New', count: counts.new ?? 0 },
          ]}
        />

        {guests.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="No guests yet"
            description="Guest profiles are built automatically from new bookings."
          />
        ) : (
          <Card className="p-0 overflow-hidden">
            <GuestTable
              guests={filtered}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              onSelect={setSelected}
            />
          </Card>
        )}
      </main>

      <GuestDrawer
        guest={selected}
        onClose={() => setSelected(null)}
        onChanged={refreshOverrides}
      />
    </>
  )
}

export default Guests
