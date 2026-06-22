import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  ScrollText,
  RefreshCw,
  Search,
  CalendarDays,
  Clock3,
  Layers3,
  BellDot,
  ArrowUpRight,
  CheckCheck,
  Trash2,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Tabs } from '../components/ui/Tabs'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../../contexts/AuthProvider'
import {
  categoryLabel,
  roleLabelForActivity,
  type StaffActivityCategory,
  type StaffActivityEntry,
} from '../../lib/staffActivityLog'
import {
  getActivityDestination,
  getActivityDestinationLabel,
} from '../../lib/activityNavigation'
import {
  useStaffActivityLog,
  type ActivityCategoryFilter,
  type ActivityReadFilter,
} from '../hooks/useStaffActivityLog'
import { cn } from '../utils/cn'
import { confirmDeleteActivity } from '../utils/confirmDelete'

const CATEGORY_TABS: { value: ActivityCategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'booking', label: 'Bookings' },
  { value: 'inquiry', label: 'Inquiries' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'guest', label: 'Guests' },
  { value: 'staff', label: 'Staff' },
  { value: 'team', label: 'Team' },
  { value: 'settings', label: 'Settings' },
]

const formatWhen = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const roleTone: Record<string, string> = {
  admin: 'text-violet-700 bg-violet-50 border-violet-200',
  manager: 'text-sky-700 bg-sky-50 border-sky-200',
  booking_officer: 'text-amber-700 bg-amber-50 border-amber-200',
}

const categoryTone: Record<StaffActivityCategory, string> = {
  booking: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  inquiry: 'text-orange-700 bg-orange-50 border-orange-200',
  housekeeping: 'text-teal-700 bg-teal-50 border-teal-200',
  guest: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  staff: 'text-stone-700 bg-stone-50 border-stone-200',
  team: 'text-violet-700 bg-violet-50 border-violet-200',
  settings: 'text-stone-600 bg-stone-50 border-stone-200',
  system: 'text-stone-600 bg-stone-50 border-stone-200',
}

const Activity = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const { isAdmin, loading: authLoading } = useAuth()
  const {
    entries,
    allEntries,
    counts,
    loading,
    error,
    category,
    setCategory,
    readFilter,
    setReadFilter,
    actorEmail,
    setActorEmail,
    refresh,
    markRead,
    markAllRead,
    removeEntry,
  } = useStaffActivityLog()
  const [search, setSearch] = useState('')
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.trim().toLowerCase()
    return entries.filter((entry) =>
      [
        entry.title,
        entry.message,
        entry.action,
        entry.actorEmail,
        entry.entityId ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [entries, search])

  const tabItems = useMemo(
    () =>
      CATEGORY_TABS.map((tab) => ({
        ...tab,
        count:
          tab.value === 'all'
            ? counts.total
            : counts.byCategory[tab.value as StaffActivityCategory] ?? 0,
      })).filter((tab) => tab.value === 'all' || tab.count > 0 || category === tab.value),
    [category, counts.byCategory, counts.total]
  )

  const readTabItems = useMemo(
    () => [
      { value: 'all' as const, label: 'All', count: counts.total },
      { value: 'unread' as const, label: 'Unread', count: counts.unread },
      {
        value: 'read' as const,
        label: 'Read',
        count: Math.max(0, counts.total - counts.unread),
      },
    ],
    [counts.total, counts.unread]
  )

  const openEntry = async (entry: StaffActivityEntry) => {
    if (!entry.read) await markRead(entry.id)
    navigate(getActivityDestination(entry))
  }

  const onMarkRead = async (entry: StaffActivityEntry, event: React.MouseEvent) => {
    event.stopPropagation()
    if (entry.read) return
    setMarkingId(entry.id)
    try {
      await markRead(entry.id)
    } finally {
      setMarkingId(null)
    }
  }

  const onDelete = async (entry: StaffActivityEntry, event: React.MouseEvent) => {
    event.stopPropagation()
    const ok = await confirmDeleteActivity(entry.title, entry.message)
    if (!ok) return

    setDeletingId(entry.id)
    try {
      const deleted = await removeEntry(entry.id)
      if (deleted) {
        toast.success('Activity entry deleted')
      } else {
        toast.error('Could not delete entry')
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (authLoading) {
    return (
      <div className="px-4 lg:px-8 py-12 text-center text-sm text-stone-500">Loading…</div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return (
    <>
      <TopBar
        title="Activity"
        description="Audit trail of important actions by admins, managers, and booking officers"
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Search title, message, actor…',
        }}
        actions={
          <div className="flex items-center gap-2">
            {counts.unread > 0 && (
              <Button
                variant="secondary"
                size="md"
                leftIcon={<CheckCheck className="w-4 h-4" />}
                onClick={() => void markAllRead()}
              >
                Mark all read
              </Button>
            )}
            <Button
              variant="secondary"
              size="md"
              leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={() => void refresh()}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <main className="px-4 lg:px-8 py-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Card className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-resort-cta/10 text-resort-cta flex items-center justify-center shrink-0">
              <BellDot className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-2xl font-serif text-forest-700">{counts.unread}</p>
              <p className="text-xs font-medium text-stone-600">Unread</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Needs your review</p>
            </div>
          </Card>
          <Card className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-2xl font-serif text-forest-700">{counts.today}</p>
              <p className="text-xs font-medium text-stone-600">Today</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Actions logged today</p>
            </div>
          </Card>
          <Card className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Clock3 className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-2xl font-serif text-forest-700">{counts.week}</p>
              <p className="text-xs font-medium text-stone-600">Last 7 days</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Recent staff activity</p>
            </div>
          </Card>
          <Card className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <Layers3 className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-2xl font-serif text-forest-700">{counts.total}</p>
              <p className="text-xs font-medium text-stone-600">Total loaded</p>
              <p className="text-[11px] text-stone-400 mt-0.5">Up to 500 most recent entries</p>
            </div>
          </Card>
        </div>

        <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs<ActivityReadFilter>
            value={readFilter}
            onChange={setReadFilter}
            layoutId="activity-read-tab"
            className="w-max"
            items={readTabItems}
          />
        </div>

        <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs<ActivityCategoryFilter>
            value={category}
            onChange={setCategory}
            layoutId="activity-category-tab"
            className="w-max"
            items={tabItems}
          />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="search"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            placeholder="Filter by staff email…"
            className="w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
          />
        </div>

        {error && (
          <Card className="border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            <p className="font-medium">Could not load activity log</p>
            <p className="mt-1 text-amber-800">{error}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => void refresh()}>
              Retry
            </Button>
          </Card>
        )}

        {loading && allEntries.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white/80 px-6 py-12 text-center text-sm text-stone-500">
            Loading activity…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="w-6 h-6" />}
            title={readFilter === 'unread' ? 'All caught up' : 'No activity yet'}
            description={
              allEntries.length === 0
                ? 'Actions in the admin panel will appear here once staff start working.'
                : readFilter === 'unread'
                  ? 'You have reviewed all loaded activity entries.'
                  : 'No entries match your filters.'
            }
          />
        ) : (
          <div className="grid gap-2">
            {filtered.map((entry) => (
              <Card
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => void openEntry(entry)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    void openEntry(entry)
                  }
                }}
                className={cn(
                  'p-4 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 cursor-pointer transition-colors hover:border-forest-200 hover:bg-forest-50/30',
                  !entry.read && 'border-forest-200/80 bg-cream/50'
                )}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {!entry.read && (
                      <span className="w-2 h-2 rounded-full bg-resort-cta shrink-0" aria-hidden />
                    )}
                    <span className="font-medium text-stone-900">{entry.title}</span>
                    <span
                      className={cn(
                        'text-[11px] font-medium px-2 py-0.5 rounded-full border',
                        categoryTone[entry.category]
                      )}
                    >
                      {categoryLabel(entry.category)}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600">{entry.message}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                    <span>{formatWhen(entry.createdAt)}</span>
                    <span className="text-stone-300">·</span>
                    <span className="truncate max-w-[220px]">{entry.actorEmail}</span>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                        roleTone[entry.actorRole] ?? roleTone.booking_officer
                      )}
                    >
                      {roleLabelForActivity(entry.actorRole)}
                    </span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="whitespace-nowrap"
                    leftIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                    onClick={(event) => {
                      event.stopPropagation()
                      void openEntry(entry)
                    }}
                  >
                    {getActivityDestinationLabel(entry)}
                  </Button>
                  {!entry.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="whitespace-nowrap text-stone-600"
                      disabled={markingId === entry.id}
                      onClick={(event) => void onMarkRead(entry, event)}
                    >
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="whitespace-nowrap text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={deletingId === entry.id}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={(event) => void onDelete(entry, event)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

export default Activity
