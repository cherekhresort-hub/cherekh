import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, Users, Plus } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { ShiftBadge, StaffStatusBadge } from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { StaffProfileModal } from '../components/staff/StaffProfileModal'
import { StaffFormModal } from '../components/staff/StaffFormModal'
import { useStaffData } from '../hooks/useStaffData'
import type { StaffMember, StaffShift } from '../types'

type Filter = 'all' | StaffShift

const Staff = () => {
  const { staff, loading, refresh } = useStaffData()
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkHandled = useRef<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<StaffMember | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)

  // Keep the open profile modal in sync after any mutation.
  useEffect(() => {
    if (!selected) return
    const fresh = staff.find((s) => s.id === selected.id)
    if (!fresh) {
      setSelected(null)
      return
    }
    if (fresh !== selected) setSelected(fresh)
  }, [staff, selected])

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || staff.length === 0) return
    if (deepLinkHandled.current === id) return

    const member = staff.find((s) => s.id === id)
    if (!member) return

    deepLinkHandled.current = id
    setSelected(member)
    setSearchParams(
      (params) => {
        params.delete('id')
        return params
      },
      { replace: true }
    )
  }, [staff, searchParams, setSearchParams])

  const counts = useMemo(() => {
    return staff.reduce<Record<string, number>>(
      (acc, s) => {
        acc.all += 1
        acc[s.shift] = (acc[s.shift] ?? 0) + 1
        return acc
      },
      { all: 0 }
    )
  }, [staff])

  const filtered = useMemo(() => {
    let list = staff
    if (filter !== 'all') list = list.filter((s) => s.shift === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) =>
        `${s.name} ${s.role} ${s.phone} ${s.email ?? ''}`.toLowerCase().includes(q)
      )
    }
    return list
  }, [staff, filter, search])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (member: StaffMember) => {
    setEditing(member)
    setSelected(null)
    setFormOpen(true)
  }

  return (
    <>
      <TopBar
        title="Staff"
        description="Schedules, shifts, and contact details for the accommodation team"
        search={{ value: search, onChange: setSearch, placeholder: 'Search staff…' }}
        actions={
          <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add staff
          </Button>
        }
      />
      <main className="px-4 lg:px-8 py-6 space-y-4">
        <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs<Filter>
            value={filter}
            onChange={setFilter}
            className="w-max"
            items={[
              { value: 'all', label: 'All staff', count: counts.all },
              { value: 'morning', label: 'Morning', count: counts.morning ?? 0 },
              { value: 'afternoon', label: 'Afternoon', count: counts.afternoon ?? 0 },
              { value: 'night', label: 'Night', count: counts.night ?? 0 },
              { value: 'off', label: 'Off', count: counts.off ?? 0 },
            ]}
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-stone-200 bg-white/80 px-6 py-12 text-center text-sm text-stone-500">
            Loading staff roster…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title={staff.length === 0 ? 'No staff yet' : 'No matching staff'}
            description={
              staff.length === 0
                ? 'Add your first team member to manage shifts, contacts and assignments.'
                : 'Try a different shift filter or clear your search.'
            }
            action={
              staff.length === 0 ? (
                <Button leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
                  Add first staff member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((member, idx) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.025 }}
              >
                <Card interactive onClick={() => setSelected(member)}>
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} color={member.avatarColor} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-forest-700 truncate">{member.name}</p>
                      <p className="text-xs text-stone-500 truncate">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <ShiftBadge shift={member.shift} />
                    <StaffStatusBadge status={member.status} />
                  </div>
                  <div className="mt-3 text-xs text-stone-500 inline-flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> {member.phone}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <StaffProfileModal
        staff={selected}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onDeleted={refresh}
      />

      <StaffFormModal
        open={formOpen}
        member={editing}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
    </>
  )
}

export default Staff
