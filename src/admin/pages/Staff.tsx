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
import { PageSkeleton } from '../components/ui/Skeleton'
import { StaffProfileModal } from '../components/staff/StaffProfileModal'
import { StaffFormModal } from '../components/staff/StaffFormModal'
import { PayrollPanel } from '../components/staff/PayrollPanel'
import { AdvancesPanel } from '../components/staff/AdvancesPanel'
import { FinanceNotice } from '../components/finance/shared'
import { useStaffData } from '../hooks/useStaffData'
import { currentStaff, isFormerStaff } from '../data/staff'
import { Badge } from '../components/ui/Badge'
import { formatDay } from '../components/finance/financeHelpers'
import { useFinanceData } from '../hooks/useFinanceData'
import { usePayrollData } from '../hooks/usePayrollData'
import type { StaffMember, StaffShift } from '../types'

type Filter = 'all' | StaffShift | 'former'
type View = 'team' | 'payroll' | 'advances'

const VIEWS: View[] = ['team', 'payroll', 'advances']

const Staff = () => {
  const { staff, loading, refresh } = useStaffData()
  const [searchParams, setSearchParams] = useSearchParams()
  const viewParam = searchParams.get('view') as View | null
  const view: View = viewParam && VIEWS.includes(viewParam) ? viewParam : 'team'
  const finance = useFinanceData(view !== 'team')
  const payroll = usePayrollData(view === 'payroll')
  const setView = (next: View) =>
    setSearchParams(
      (params) => {
        if (next === 'team') params.delete('view')
        else params.set('view', next)
        return params
      },
      { replace: true }
    )
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
        if (isFormerStaff(s)) {
          acc.former += 1
          acc.all += 1
          return acc
        }
        acc.all += 1
        acc.current += 1
        acc[s.shift] = (acc[s.shift] ?? 0) + 1
        return acc
      },
      { all: 0, current: 0, former: 0 }
    )
  }, [staff])

  const filtered = useMemo(() => {
    let list =
      filter === 'former'
        ? staff.filter(isFormerStaff)
        : filter === 'all'
          ? [...staff]
          : currentStaff(staff).filter((s) => s.shift === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) =>
        `${s.name} ${s.role} ${s.phone} ${s.email ?? ''}`.toLowerCase().includes(q)
      )
    }
    // Current team first; fired staff stay on the list (marked) so they can be rehired.
    return list.sort((a, b) => {
      const aFormer = isFormerStaff(a) ? 1 : 0
      const bFormer = isFormerStaff(b) ? 1 : 0
      if (aFormer !== bFormer) return aFormer - bFormer
      return a.name.localeCompare(b.name)
    })
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
        description="Team, payroll, advances and adjustments"
        search={{ value: search, onChange: setSearch, placeholder: 'Search staff…' }}
        actions={
          view === 'team' ? (
            <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Add staff
            </Button>
          ) : undefined
        }
      />
      <main className="px-4 lg:px-8 py-6 space-y-4">
        <Tabs<View>
          value={view}
          onChange={setView}
          items={[
            { value: 'team', label: 'Team', count: counts.current },
            { value: 'payroll', label: 'Payroll' },
            { value: 'advances', label: 'Advances' },
          ]}
        />

        {view !== 'team' &&
          (!finance.available ? (
            <FinanceNotice title="Finance data is not available" tone="amber">
              {finance.error}
            </FinanceNotice>
          ) : view === 'payroll' && !payroll.available ? (
            <FinanceNotice title="Payroll is not set up yet" tone="amber">
              {payroll.error}
            </FinanceNotice>
          ) : (finance.loading && finance.data.accounts.length === 0) || (view === 'payroll' && !payroll.loaded) ? (
            <PageSkeleton variant="stats" count={4} />
          ) : view === 'payroll' ? (
            <PayrollPanel staff={staff} data={finance.data} salaries={payroll.salaries} payrolls={payroll.payrolls} search={search} />
          ) : (
            <AdvancesPanel staff={staff} data={finance.data} search={search} />
          ))}

        {view === 'team' && (
          <>
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
                  { value: 'full-time', label: 'Full time', count: counts['full-time'] ?? 0 },
                  { value: 'off', label: 'Off', count: counts.off ?? 0 },
                  ...(counts.former > 0 ? [{ value: 'former' as Filter, label: 'Fired', count: counts.former }] : []),
                ]}
              />
            </div>

            {loading ? (
              <PageSkeleton variant="cards" count={6} />
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
                    <Card
                      interactive
                      onClick={() => setSelected(member)}
                      className={isFormerStaff(member) ? 'opacity-80 border-red-100' : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} color={member.avatarColor} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-forest-700 truncate">{member.name}</p>
                          <p className="text-xs text-stone-500 truncate">{member.role}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {isFormerStaff(member) ? (
                          <Badge tone="red">Fired {formatDay(member.terminatedOn)}</Badge>
                        ) : (
                          <>
                            <ShiftBadge shift={member.shift} />
                            <StaffStatusBadge status={member.status} />
                          </>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-stone-500 inline-flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> {member.phone}
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <StaffProfileModal
        staff={selected}
        onClose={() => setSelected(null)}
        onEdit={openEdit}
        onDeleted={refresh}
        onChanged={refresh}
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
