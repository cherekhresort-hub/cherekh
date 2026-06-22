import {
  CalendarCheck2,
  Users,
  BedDouble,
  BedSingle,
  LogIn,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { DashboardMetrics } from '../../hooks/useMetrics'
import { cn } from '../../utils/cn'

interface MetricDef {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  accent: string
  badge: string
}

const buildMetrics = (m: DashboardMetrics): MetricDef[] => [
  {
    label: "Today's Bookings",
    value: m.todayBookings,
    hint: 'Created today',
    icon: CalendarCheck2,
    accent: 'bg-forest-50 text-forest-700',
    badge: 'bg-forest-700 text-white',
  },
  {
    label: 'Active Guests',
    value: m.activeGuests,
    hint: 'In-house right now',
    icon: Users,
    accent: 'bg-teal-50 text-teal-700',
    badge: 'bg-teal-600 text-white',
  },
  {
    label: 'Occupied Rooms',
    value: m.occupiedRooms,
    hint: `${m.occupancyRate}% occupancy`,
    icon: BedDouble,
    accent: 'bg-sky-50 text-sky-700',
    badge: 'bg-sky-600 text-white',
  },
  {
    label: 'Available Rooms',
    value: m.availableRooms,
    hint: 'Ready to book',
    icon: BedSingle,
    accent: 'bg-sand-50 text-sand-700',
    badge: 'bg-sand-600 text-white',
  },
  {
    label: 'Pending Check-ins',
    value: m.pendingCheckIns,
    hint: 'Arriving today',
    icon: LogIn,
    accent: 'bg-amber-50 text-amber-700',
    badge: 'bg-amber-600 text-white',
  },
  {
    label: 'Pending Check-outs',
    value: m.pendingCheckOuts,
    hint: 'Departing today',
    icon: LogOut,
    accent: 'bg-violet-50 text-violet-700',
    badge: 'bg-violet-600 text-white',
  },
]

export const SummaryCards = ({ metrics }: { metrics: DashboardMetrics }) => {
  const items = buildMetrics(metrics)
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-4">
      {items.map((m, idx) => {
        const Icon = m.icon
        return (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.3 }}
            className="bg-white rounded-2xl shadow-soft border border-stone-100 p-4 lg:p-5 hover:shadow-card transition-all"
          >
            <div className="flex items-start justify-between">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', m.accent)}>
                <Icon className="w-5 h-5" strokeWidth={1.75} />
              </div>
            </div>
            <p className="mt-4 text-3xl font-serif text-forest-700">{m.value}</p>
            <p className="mt-1 text-xs font-medium text-stone-600">{m.label}</p>
            <p className="text-[11px] text-stone-400 mt-0.5">{m.hint}</p>
          </motion.div>
        )
      })}
    </div>
  )
}
