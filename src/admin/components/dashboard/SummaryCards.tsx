import { Link } from 'react-router-dom'
import {
  BedDouble,
  CircleAlert,
  LogIn,
  LogOut,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { DashboardMetrics } from '../../hooks/useMetrics'
import { formatBDT } from '../../utils/format'
import { cn } from '../../utils/cn'

interface OverviewStat {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  to?: string
  tone?: 'default' | 'warn' | 'good'
}

export const SummaryCards = ({ metrics }: { metrics: DashboardMetrics }) => {
  const attentionCount = metrics.attention.length
  const stats: OverviewStat[] = [
    {
      label: 'Occupancy',
      value: `${metrics.occupancyRate}%`,
      hint: `${metrics.occupiedRooms} of ${metrics.guestRoomCount} rooms in use`,
      icon: BedDouble,
      to: '/admin/rooms',
      tone: metrics.occupancyRate >= 80 ? 'warn' : 'good',
    },
    {
      label: 'In-house guests',
      value: String(metrics.activeGuests),
      hint: `${metrics.inHouseStays} stay${metrics.inHouseStays === 1 ? '' : 's'} on property`,
      icon: Users,
      to: '/admin/bookings',
    },
    {
      label: 'Arrivals today',
      value: String(metrics.pendingCheckIns),
      hint: metrics.pendingCheckIns === 0 ? 'No check-ins scheduled' : 'Ready for front desk',
      icon: LogIn,
      to: '/admin/bookings',
      tone: metrics.pendingCheckIns > 0 ? 'warn' : 'default',
    },
    {
      label: 'Departures today',
      value: String(metrics.pendingCheckOuts),
      hint:
        metrics.cleaningRooms > 0
          ? `${metrics.cleaningRooms} room${metrics.cleaningRooms === 1 ? '' : 's'} cleaning`
          : 'No rooms in cleaning',
      icon: LogOut,
      to: '/admin/bookings',
    },
    {
      label: 'Needs attention',
      value: String(attentionCount),
      hint:
        metrics.outstandingBalance > 0
          ? `${formatBDT(metrics.outstandingBalance)} still due`
          : metrics.pendingBookings > 0
            ? `${metrics.pendingBookings} pending booking${metrics.pendingBookings === 1 ? '' : 's'}`
            : 'All clear',
      icon: CircleAlert,
      to: '/admin/bookings',
      tone: attentionCount > 0 ? 'warn' : 'good',
    },
    {
      label: 'Booked this month',
      value: formatBDT(metrics.monthlyRevenue),
      hint: `${metrics.todayBookings} booking${metrics.todayBookings === 1 ? '' : 's'} created today`,
      icon: Sparkles,
      to: '/admin/reports',
    },
  ]

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-forest-700">Today at a glance</h2>
          <p className="text-xs text-stone-500 mt-0.5">Front-desk overview for the current stay day</p>
        </div>
        {(metrics.cleaningRooms > 0 || metrics.maintenanceRooms > 0) && (
          <p className="text-xs text-stone-500">
            {metrics.cleaningRooms > 0 && (
              <span className="mr-3">{metrics.cleaningRooms} cleaning</span>
            )}
            {metrics.maintenanceRooms > 0 && (
              <span className="text-red-700">{metrics.maintenanceRooms} offline</span>
            )}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          const body = (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.28 }}
              className={cn(
                'h-full rounded-2xl border bg-white p-4 shadow-soft transition-shadow',
                stat.to && 'hover:shadow-card',
                stat.tone === 'warn' && 'border-amber-200/80',
                stat.tone === 'good' && 'border-forest-100',
                (!stat.tone || stat.tone === 'default') && 'border-stone-100'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center',
                  stat.tone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-forest-50 text-forest-700'
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <p className="mt-3 font-serif text-2xl text-forest-700 tabular-nums leading-none">{stat.value}</p>
              <p className="mt-2 text-xs font-medium text-stone-700">{stat.label}</p>
              <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{stat.hint}</p>
            </motion.div>
          )
          return stat.to ? (
            <Link
              key={stat.label}
              to={stat.to}
              className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400 rounded-2xl"
            >
              {body}
            </Link>
          ) : (
            <div key={stat.label}>{body}</div>
          )
        })}
      </div>
    </section>
  )
}
