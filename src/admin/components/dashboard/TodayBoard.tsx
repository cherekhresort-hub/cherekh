import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert, LogIn, LogOut, Users } from 'lucide-react'
import type {
  DashboardAttentionItem,
  DashboardMetrics,
  DashboardStayItem,
} from '../../hooks/useMetrics'
import { formatBDT } from '../../utils/format'
import { Card, CardDescription, CardTitle } from '../ui/Card'
import { cn } from '../../utils/cn'

const StayRow = ({ item }: { item: DashboardStayItem }) => (
  <li className="border-b border-stone-50 last:border-0">
    <Link
      to={`/admin/bookings?id=${encodeURIComponent(item.booking.id)}`}
      className="flex items-start justify-between gap-3 py-2.5 -mx-1 px-1 rounded-lg hover:bg-cream/50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-forest-700 truncate">{item.booking.name}</p>
        <p className="text-[11px] text-stone-500 truncate mt-0.5">
          {item.roomsLabel}
          {item.guests > 0 ? ` · ${item.guests} guest${item.guests === 1 ? '' : 's'}` : ''}
        </p>
      </div>
      {item.booking.phone ? (
        <span className="shrink-0 text-[11px] text-stone-500 tabular-nums">{item.booking.phone}</span>
      ) : null}
    </Link>
  </li>
)

const AttentionRow = ({ item }: { item: DashboardAttentionItem }) => (
  <li className="border-b border-stone-50 last:border-0">
    <Link
      to={`/admin/bookings?id=${encodeURIComponent(item.booking.id)}`}
      className="flex items-start justify-between gap-3 py-2.5 -mx-1 px-1 rounded-lg hover:bg-cream/50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-forest-700 truncate">{item.booking.name}</p>
        <p
          className={cn(
            'text-[11px] mt-0.5',
            item.reason === 'arriving_unpaid' || item.reason === 'pending'
              ? 'text-amber-700'
              : 'text-stone-500'
          )}
        >
          {item.label}
        </p>
      </div>
      {typeof item.amount === 'number' && item.amount > 0 ? (
        <span className="shrink-0 text-xs font-medium text-amber-800 tabular-nums">
          {formatBDT(item.amount)}
        </span>
      ) : null}
    </Link>
  </li>
)

const BoardColumn = ({
  title,
  description,
  icon: Icon,
  count,
  empty,
  children,
  tone = 'default',
}: {
  title: string
  description: string
  icon: typeof LogIn
  count: number
  empty: string
  children: ReactNode
  tone?: 'default' | 'warn'
}) => (
  <Card padded={false} className="overflow-hidden flex flex-col min-h-[240px]">
    <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-stone-50">
      <div className="min-w-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <span
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center',
              tone === 'warn' ? 'bg-amber-50 text-amber-700' : 'bg-forest-50 text-forest-700'
            )}
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </span>
          {title}
        </CardTitle>
        <CardDescription className="mt-1">{description}</CardDescription>
      </div>
      <span
        className={cn(
          'shrink-0 min-w-[1.75rem] h-7 px-2 rounded-full text-xs font-semibold tabular-nums inline-flex items-center justify-center',
          count > 0
            ? tone === 'warn'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-forest-100 text-forest-800'
            : 'bg-stone-100 text-stone-500'
        )}
      >
        {count}
      </span>
    </div>
    <div className="px-5 py-1 flex-1">
      {count === 0 ? (
        <p className="py-8 text-center text-xs text-stone-400">{empty}</p>
      ) : (
        <ul>{children}</ul>
      )}
    </div>
  </Card>
)

export const TodayBoard = ({ metrics }: { metrics: DashboardMetrics }) => {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-forest-700">Today’s operations</h2>
          <p className="text-xs text-stone-500 mt-0.5">Arrivals, departures, and items that need a decision</p>
        </div>
        <Link
          to="/admin/bookings"
          className="text-xs font-medium text-forest-700 hover:text-forest-900"
        >
          Open bookings
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BoardColumn
          title="Arrivals"
          description="Confirmed check-ins for today"
          icon={LogIn}
          count={metrics.arrivals.length}
          empty="No arrivals scheduled"
          tone={metrics.arrivals.length > 0 ? 'warn' : 'default'}
        >
          {metrics.arrivals.map((item) => (
            <StayRow key={item.booking.id} item={item} />
          ))}
        </BoardColumn>

        <BoardColumn
          title="Departures"
          description="Check-outs due before night audit"
          icon={LogOut}
          count={metrics.departures.length}
          empty="No departures today"
        >
          {metrics.departures.map((item) => (
            <StayRow key={item.booking.id} item={item} />
          ))}
        </BoardColumn>

        <BoardColumn
          title="Attention"
          description="Pending confirmations and balances"
          icon={CircleAlert}
          count={metrics.attention.length}
          empty="Nothing needs attention"
          tone={metrics.attention.length > 0 ? 'warn' : 'default'}
        >
          {metrics.attention.map((item) => (
            <AttentionRow key={`${item.booking.id}-${item.reason}`} item={item} />
          ))}
        </BoardColumn>
      </div>

      {metrics.inHouseStays > 0 && (
        <p className="text-[11px] text-stone-500 inline-flex items-center gap-1.5 px-1">
          <Users className="w-3.5 h-3.5" />
          {metrics.inHouseStays} stay{metrics.inHouseStays === 1 ? '' : 's'} currently in-house
          {metrics.activeGuests > 0 ? ` · ${metrics.activeGuests} guests` : ''}
        </p>
      )}
    </section>
  )
}
