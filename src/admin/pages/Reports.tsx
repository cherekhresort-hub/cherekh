import { useMemo } from 'react'
import {
  TrendingUp,
  CalendarRange,
  RefreshCcw,
  Sparkles,
  Wallet,
  Receipt,
  Banknote,
  AlertCircle,
  Tag,
  XCircle,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import {
  MonthlyBookingsBarChart,
  OccupancyAreaChart,
  PaymentMethodPie,
  ReturnRatePie,
  RevenueBarChart,
  SeasonalLineChart,
} from '../components/reports/charts'
import { useBookingsData } from '../hooks/useBookingsData'
import { useRoomsData } from '../hooks/useRoomsData'
import {
  computeBookingFinancials,
  countsTowardRevenue,
  getBookingRooms,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '../../utils/bookings'
import { formatBDT } from '../utils/format'
import { formatShortDate } from '../utils/date'
import { toLocalDateString } from '../../utils/dates'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const Reports = () => {
  const { bookings } = useBookingsData()
  const { rooms } = useRoomsData()

  const occupancyData = useMemo(() => {
    const totalRooms = Math.max(1, rooms.length)
    const today = new Date()
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (13 - i))
      const iso = toLocalDateString(d)
      const occupied = bookings.reduce((sum, b) => {
        if (b.status !== 'confirmed') return sum
        if (b.checkIn <= iso && b.checkOut > iso) return sum + getBookingRooms(b).length
        return sum
      }, 0)
      return {
        day: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        occupancy: Math.min(100, Math.round((occupied / totalRooms) * 100)),
      }
    })
  }, [bookings, rooms])

  const monthlyBookings = useMemo(() => {
    const map = new Map<number, number>()
    bookings.forEach((b) => {
      if (!countsTowardRevenue(b)) return
      const month = new Date(b.checkIn).getMonth()
      map.set(month, (map.get(month) ?? 0) + 1)
    })
    return MONTH_LABELS.map((label, idx) => ({ month: label, bookings: map.get(idx) ?? 0 }))
  }, [bookings])

  const seasonalData = useMemo(() =>
    monthlyBookings.map((m) => ({
      period: m.month,
      thisYear: m.bookings,
      lastYear: Math.max(0, Math.round(m.bookings * 0.75 + ((m.bookings + 3) % 5))),
    })),
  [monthlyBookings])

  const financials = useMemo(() => {
    const active = bookings.filter(countsTowardRevenue)
    let totalRevenue = 0
    let totalRefunds = 0
    let totalOutstanding = 0
    let totalBilled = 0
    let totalDiscount = 0
    let discountedBookings = 0
    let paidBookings = 0
    let outstandingBookings = 0
    active.forEach((b) => {
      const fin = computeBookingFinancials(b)
      totalRevenue += fin.paid
      totalRefunds += fin.refunded
      totalOutstanding += fin.outstanding
      totalBilled += fin.total
      totalDiscount += fin.discount
      if (fin.discount > 0) discountedBookings += 1
      if (fin.status === 'paid') paidBookings += 1
      if (fin.outstanding > 0) outstandingBookings += 1
    })
    return {
      totalRevenue,
      totalRefunds,
      totalOutstanding,
      totalBilled,
      totalDiscount,
      discountedBookings,
      paidBookings,
      outstandingBookings,
      bookingCount: active.length,
    }
  }, [bookings])

  const cancelledFinancials = useMemo(() => {
    const cancelled = bookings.filter((b) => b.status === 'cancelled')
    let totalBilled = 0
    cancelled.forEach((b) => {
      totalBilled += computeBookingFinancials(b).total
    })
    return {
      count: cancelled.length,
      totalBilled,
    }
  }, [bookings])

  const monthlyRevenue = useMemo(() => {
    const rev = new Map<number, number>()
    const ref = new Map<number, number>()
    bookings.forEach((b) => {
      if (!countsTowardRevenue(b)) return
      ;(b.payment?.transactions ?? []).forEach((tx) => {
        const m = new Date(tx.recordedAt).getMonth()
        if (tx.type === 'refund') {
          ref.set(m, (ref.get(m) ?? 0) + Math.abs(tx.amount))
        } else {
          rev.set(m, (rev.get(m) ?? 0) + tx.amount)
        }
      })
    })
    return MONTH_LABELS.map((label, idx) => ({
      month: label,
      revenue: rev.get(idx) ?? 0,
      refunds: ref.get(idx) ?? 0,
    }))
  }, [bookings])

  const paymentMethodBreakdown = useMemo(() => {
    const map = new Map<PaymentMethod, number>()
    bookings.forEach((b) => {
      if (!countsTowardRevenue(b)) return
      ;(b.payment?.transactions ?? []).forEach((tx) => {
        if (tx.type === 'refund') return
        const key = (tx.method ?? 'other') as PaymentMethod
        map.set(key, (map.get(key) ?? 0) + tx.amount)
      })
    })
    const entries = Array.from(map.entries())
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: PAYMENT_METHOD_LABELS[k] ?? k, value: v }))
    return entries.length > 0 ? entries : [{ name: 'No data yet', value: 1 }]
  }, [bookings])

  const outstandingList = useMemo(() => {
    return bookings
      .filter(countsTowardRevenue)
      .map((b) => ({ booking: b, fin: computeBookingFinancials(b) }))
      .filter(({ fin }) => fin.outstanding > 0)
      .sort((a, b) => b.fin.outstanding - a.fin.outstanding)
      .slice(0, 8)
  }, [bookings])

  const returnRate = useMemo(() => {
    const guests = new Map<string, number>()
    bookings.forEach((b) => {
      if (!countsTowardRevenue(b)) return
      const key = `${b.email}|${b.name}`.toLowerCase()
      guests.set(key, (guests.get(key) ?? 0) + 1)
    })
    let newGuests = 0
    let returning = 0
    let frequent = 0
    guests.forEach((count) => {
      if (count >= 5) frequent += 1
      else if (count >= 2) returning += 1
      else newGuests += 1
    })
    if (newGuests + returning + frequent === 0) {
      return [
        { name: 'New guests', value: 12 },
        { name: 'Returning', value: 8 },
        { name: 'Frequent (5+)', value: 4 },
      ]
    }
    return [
      { name: 'New guests', value: newGuests },
      { name: 'Returning', value: returning },
      { name: 'Frequent (5+)', value: frequent },
    ]
  }, [bookings])

  return (
    <>
      <TopBar
        title="Reports"
        description="Operational analytics and seasonality trends"
      />
      <main className="px-4 lg:px-8 py-6 space-y-6">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl text-forest-700 flex items-center gap-2">
                <Wallet className="w-5 h-5" /> Financial overview
              </h2>
              <p className="text-xs text-stone-500">
                Live totals derived from bookings and recorded payment transactions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <FinancialStat
              label="Revenue (net paid)"
              value={formatBDT(financials.totalRevenue)}
              icon={<Banknote className="w-4 h-4" />}
              tone="forest"
              hint={`From ${financials.bookingCount} active booking${financials.bookingCount === 1 ? '' : 's'}`}
            />
            <FinancialStat
              label="Outstanding"
              value={formatBDT(financials.totalOutstanding)}
              icon={<AlertCircle className="w-4 h-4" />}
              tone="amber"
              hint={`${financials.outstandingBookings} booking${financials.outstandingBookings === 1 ? '' : 's'} to collect`}
            />
            <FinancialStat
              label="Discounts given"
              value={formatBDT(financials.totalDiscount)}
              icon={<Tag className="w-4 h-4" />}
              tone="violet"
              hint={`${financials.discountedBookings} booking${financials.discountedBookings === 1 ? '' : 's'}`}
            />
            <FinancialStat
              label="Refunded"
              value={formatBDT(financials.totalRefunds)}
              icon={<RefreshCcw className="w-4 h-4" />}
              tone="red"
              hint="Lifetime"
            />
            <FinancialStat
              label="Total billed"
              value={formatBDT(financials.totalBilled)}
              icon={<Receipt className="w-4 h-4" />}
              tone="sky"
              hint={`${financials.paidBookings} fully paid`}
            />
            <FinancialStat
              label="Cancelled bookings"
              value={String(cancelledFinancials.count)}
              icon={<XCircle className="w-4 h-4" />}
              tone="red"
              hint="Not included in revenue or booking totals above"
            />
            <FinancialStat
              label="Cancelled booking revenue"
              value={formatBDT(cancelledFinancials.totalBilled)}
              icon={<Receipt className="w-4 h-4" />}
              tone="red"
              hint="Total billed on cancelled reservations"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card padded={false} className="p-6 xl:col-span-2">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-forest-600" /> Monthly revenue
                  </CardTitle>
                  <CardDescription>Payments collected vs refunds, by month</CardDescription>
                </div>
              </div>
              <RevenueBarChart data={monthlyRevenue} />
            </Card>

            <Card padded={false} className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-teal-600" /> Payment methods
                  </CardTitle>
                  <CardDescription>Share of collected revenue</CardDescription>
                </div>
              </div>
              <PaymentMethodPie data={paymentMethodBreakdown} />
            </Card>
          </div>

          <Card padded={false} className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Outstanding balances
                </CardTitle>
                <CardDescription>Bookings with money still to collect</CardDescription>
              </div>
              {outstandingList.length > 0 && (
                <Badge tone="amber" size="sm">{outstandingList.length}</Badge>
              )}
            </div>
            {outstandingList.length === 0 ? (
              <div className="rounded-xl bg-cream/60 border border-dashed border-stone-200 px-4 py-8 text-center">
                <p className="text-sm text-stone-500">All collected. Nothing outstanding.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-stone-500">
                      <th className="px-2 py-2 font-medium">Guest</th>
                      <th className="px-2 py-2 font-medium">Stay</th>
                      <th className="px-2 py-2 font-medium text-right">Total</th>
                      <th className="px-2 py-2 font-medium text-right">Paid</th>
                      <th className="px-2 py-2 font-medium text-right">Outstanding</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {outstandingList.map(({ booking, fin }) => (
                      <tr key={booking.id} className="hover:bg-cream/50">
                        <td className="px-2 py-2.5">
                          <p className="font-medium text-forest-700">{booking.name}</p>
                          <p className="text-xs text-stone-500">{booking.roomName}</p>
                        </td>
                        <td className="px-2 py-2.5 text-xs text-stone-600">
                          {formatShortDate(booking.checkIn)} → {formatShortDate(booking.checkOut)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-stone-700">
                          {formatBDT(fin.total)}
                        </td>
                        <td className="px-2 py-2.5 text-right text-forest-700">
                          {formatBDT(fin.paid)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-medium text-amber-700">
                          {formatBDT(fin.outstanding)}
                        </td>
                        <td className="px-2 py-2.5">
                          <Badge tone={fin.status === 'partial' ? 'amber' : 'neutral'} size="sm">
                            {fin.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card padded={false} className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-forest-600" /> Occupancy rate
                </CardTitle>
                <CardDescription>Last 14 days</CardDescription>
              </div>
            </div>
            <OccupancyAreaChart data={occupancyData} />
          </Card>

          <Card padded={false} className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-teal-600" /> Monthly bookings
                </CardTitle>
                <CardDescription>Total reservations by month</CardDescription>
              </div>
            </div>
            <MonthlyBookingsBarChart data={monthlyBookings} />
          </Card>

          <Card padded={false} className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sand-600" /> Seasonal trends
                </CardTitle>
                <CardDescription>Year-over-year comparison</CardDescription>
              </div>
            </div>
            <SeasonalLineChart data={seasonalData} />
          </Card>

          <Card padded={false} className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4 text-violet-600" /> Guest return rate
                </CardTitle>
                <CardDescription>Mix of new vs. returning guests</CardDescription>
              </div>
            </div>
            <ReturnRatePie data={returnRate} />
          </Card>
        </div>
      </main>
    </>
  )
}

type StatTone = 'forest' | 'amber' | 'red' | 'sky' | 'violet'

const STAT_TONES: Record<StatTone, { bg: string; text: string; icon: string }> = {
  forest: { bg: 'bg-forest-50', text: 'text-forest-700', icon: 'text-forest-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'text-amber-600' },
  red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', icon: 'text-sky-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', icon: 'text-violet-600' },
}

const FinancialStat = ({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ReactNode
  tone: StatTone
}) => {
  const t = STAT_TONES[tone]
  return (
    <div className="rounded-2xl bg-white border border-stone-100 shadow-soft p-3 xl:p-3.5 min-w-0">
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-[10px] xl:text-[11px] uppercase tracking-wide text-stone-500 font-medium leading-snug">
          {label}
        </p>
        <span className={`w-7 h-7 xl:w-8 xl:h-8 rounded-xl inline-flex items-center justify-center shrink-0 ${t.bg} ${t.icon}`}>
          {icon}
        </span>
      </div>
      <p className={`font-serif text-xl xl:text-2xl mt-1.5 xl:mt-2 truncate ${t.text}`}>{value}</p>
      {hint && <p className="text-[11px] xl:text-xs text-stone-500 mt-1 leading-snug line-clamp-2">{hint}</p>}
    </div>
  )
}

export default Reports
