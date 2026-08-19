import { useMemo, useState } from 'react'
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Input'
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
  getBookingCashMovements,
  getBookingRooms,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
} from '../../utils/bookings'
import { formatBDT } from '../utils/format'
import { formatShortDate, toISODate } from '../utils/date'
import { toLocalDateString } from '../../utils/dates'
import {
  bookingInReportRange,
  currentYearMonth,
  daysInRange,
  defaultReportPeriod,
  eachCalendarMonth,
  formatReportRangeLabel,
  getReportRange,
  isoDateInRange,
  rollingMonths,
  shiftYearMonth,
  yearMonths,
  type ReportPeriodMode,
} from '../utils/reportPeriod'

const Reports = () => {
  const { bookings } = useBookingsData()
  const { rooms } = useRoomsData()
  const [period, setPeriod] = useState(defaultReportPeriod)

  const range = useMemo(() => getReportRange(period), [period])
  const rangeLabel = useMemo(() => formatReportRangeLabel(period, range), [period, range])

  const periodBookings = useMemo(
    () => bookings.filter((booking) => bookingInReportRange(booking, range)),
    [bookings, range]
  )

  const occupancyData = useMemo(() => {
    const totalRooms = Math.max(1, rooms.length)
    const today = toISODate()
    const days = range
      ? daysInRange(range.from, range.to)
      : daysInRange(
          toLocalDateString(new Date(Date.now() - 13 * 86400000)),
          today
        )
    const sampled = days.length > 62 ? days.filter((_, idx) => idx % Math.ceil(days.length / 31) === 0) : days

    return sampled.map((iso) => {
      const occupied = bookings.reduce((sum, booking) => {
        if (booking.status !== 'confirmed') return sum
        if (booking.checkIn <= iso && booking.checkOut > iso) {
          return sum + getBookingRooms(booking).length
        }
        return sum
      }, 0)
      const date = new Date(`${iso}T12:00:00`)
      return {
        day: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        occupancy: Math.min(100, Math.round((occupied / totalRooms) * 100)),
      }
    })
  }, [bookings, range, rooms])

  const chartMonths = useMemo(() => {
    if (period.mode === 'month' && period.month) {
      return yearMonths(Number(period.month.slice(0, 4)))
    }
    if (range) return eachCalendarMonth(range.from, range.to)
    return rollingMonths(12)
  }, [period.mode, period.month, range])

  const monthlyBookings = useMemo(() => {
    const map = new Map<string, number>()
    periodBookings.forEach((booking) => {
      if (!countsTowardRevenue(booking)) return
      const key = booking.checkIn.slice(0, 7)
      map.set(key, (map.get(key) ?? 0) + 1)
    })
    return chartMonths.map((month) => ({
      month: month.label,
      bookings: map.get(month.key) ?? 0,
    }))
  }, [chartMonths, periodBookings])

  const seasonalData = useMemo(() => {
    const focusYear =
      period.mode === 'month' && period.month
        ? Number(period.month.slice(0, 4))
        : range
          ? Number(range.from.slice(0, 4))
          : new Date().getFullYear()
    const thisYearMonths = yearMonths(focusYear)
    const countByMonth = (year: number) => {
      const map = new Map<number, number>()
      bookings.forEach((booking) => {
        if (!countsTowardRevenue(booking)) return
        const checkIn = booking.checkIn.slice(0, 10)
        const yearNum = Number(checkIn.slice(0, 4))
        if (yearNum !== year) return
        const monthIdx = Number(checkIn.slice(5, 7)) - 1
        map.set(monthIdx, (map.get(monthIdx) ?? 0) + 1)
      })
      return map
    }
    const thisYear = countByMonth(focusYear)
    const lastYear = countByMonth(focusYear - 1)
    return thisYearMonths.map((month, idx) => ({
      period: month.label,
      thisYear: thisYear.get(idx) ?? 0,
      lastYear: lastYear.get(idx) ?? 0,
    }))
  }, [bookings, period.mode, period.month, range])

  const financials = useMemo(() => {
    const active = periodBookings.filter(countsTowardRevenue)
    let totalRevenue = 0
    let totalRefunds = 0
    let totalOutstanding = 0
    let totalBilled = 0
    let totalDiscount = 0
    let discountedBookings = 0
    let paidBookings = 0
    let outstandingBookings = 0

    const addMovement = (amount: number, isRefund: boolean, recordedAt: string) => {
      if (range && !isoDateInRange(recordedAt, range.from, range.to)) return
      if (isRefund) totalRefunds += Math.abs(amount)
      else totalRevenue += amount
    }

    active.forEach((booking) => {
      const fin = computeBookingFinancials(booking)
      totalOutstanding += fin.outstanding
      totalBilled += fin.total
      totalDiscount += fin.discount
      if (fin.discount > 0) discountedBookings += 1
      if (fin.status === 'paid') paidBookings += 1
      if (fin.outstanding > 0) outstandingBookings += 1
    })

    bookings.forEach((booking) => {
      getBookingCashMovements(booking).forEach((move) => {
        addMovement(move.amount, move.isRefund, move.recordedAt)
      })
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
  }, [bookings, periodBookings, range])

  const cancelledFinancials = useMemo(() => {
    const cancelled = periodBookings.filter((booking) => booking.status === 'cancelled')
    let totalBilled = 0
    cancelled.forEach((booking) => {
      totalBilled += computeBookingFinancials(booking).total
    })
    return {
      count: cancelled.length,
      totalBilled,
    }
  }, [periodBookings])

  const monthlyRevenue = useMemo(() => {
    const rev = new Map<string, number>()
    const refunds = new Map<string, number>()
    bookings.forEach((booking) => {
      getBookingCashMovements(booking).forEach((move) => {
        const day = move.recordedAt.slice(0, 10)
        if (range && (day < range.from || day > range.to)) return
        const key = day.slice(0, 7)
        if (move.isRefund) {
          refunds.set(key, (refunds.get(key) ?? 0) + Math.abs(move.amount))
        } else {
          rev.set(key, (rev.get(key) ?? 0) + move.amount)
        }
      })
    })
    return chartMonths.map((month) => ({
      month: month.label,
      revenue: rev.get(month.key) ?? 0,
      refunds: refunds.get(month.key) ?? 0,
    }))
  }, [bookings, chartMonths, range])

  const paymentMethodBreakdown = useMemo(() => {
    const map = new Map<PaymentMethod, number>()
    bookings.forEach((booking) => {
      getBookingCashMovements(booking).forEach((move) => {
        if (move.isRefund) return
        if (range && !isoDateInRange(move.recordedAt, range.from, range.to)) return
        const key = (move.method ?? 'other') as PaymentMethod
        map.set(key, (map.get(key) ?? 0) + move.amount)
      })
    })
    const entries = Array.from(map.entries())
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({ name: PAYMENT_METHOD_LABELS[key] ?? key, value }))
    return entries.length > 0 ? entries : [{ name: 'No data yet', value: 1 }]
  }, [bookings, range])

  const outstandingList = useMemo(() => {
    return periodBookings
      .filter(countsTowardRevenue)
      .map((booking) => ({ booking, fin: computeBookingFinancials(booking) }))
      .filter(({ fin }) => fin.outstanding > 0)
      .sort((a, b) => b.fin.outstanding - a.fin.outstanding)
      .slice(0, 8)
  }, [periodBookings])

  const returnRate = useMemo(() => {
    const guests = new Map<string, number>()
    periodBookings.forEach((booking) => {
      if (!countsTowardRevenue(booking)) return
      const key = `${booking.email}|${booking.name}`.toLowerCase()
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
        { name: 'New guests', value: 0 },
        { name: 'Returning', value: 0 },
        { name: 'Frequent (5+)', value: 0 },
      ]
    }
    return [
      { name: 'New guests', value: newGuests },
      { name: 'Returning', value: returning },
      { name: 'Frequent (5+)', value: frequent },
    ]
  }, [periodBookings])

  const occupancyCaption = range ? rangeLabel : 'Last 14 days'

  const setMode = (mode: ReportPeriodMode) => {
    setPeriod((prev) => {
      if (mode === 'month') {
        return {
          ...prev,
          mode,
          month: prev.month || currentYearMonth(),
        }
      }
      if (mode === 'custom') {
        const bounds = prev.month
          ? {
              from: `${prev.month}-01`,
              to: getReportRange({ ...prev, mode: 'month' })?.to ?? toISODate(),
            }
          : { from: prev.from, to: prev.to }
        return { ...prev, mode, from: bounds.from || prev.from, to: bounds.to || prev.to }
      }
      return { ...prev, mode }
    })
  }

  return (
    <>
      <TopBar
        title="Reports"
        description="Financial totals and trends for a month or custom date range"
      />
      <main className="px-4 lg:px-8 py-6 space-y-6">
        <section className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Period" className="min-w-[10rem]">
              <Select
                value={period.mode}
                onChange={(event) => setMode(event.target.value as ReportPeriodMode)}
              >
                <option value="all">All time</option>
                <option value="month">By month</option>
                <option value="custom">Custom range</option>
              </Select>
            </Field>

            {period.mode === 'month' && (
              <>
                <Field label="Month" className="min-w-[11rem]">
                  <Input
                    type="month"
                    value={period.month}
                    max={currentYearMonth()}
                    onChange={(event) =>
                      setPeriod((prev) => ({ ...prev, month: event.target.value }))
                    }
                  />
                </Field>
                <div className="flex gap-1 pb-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="Previous month"
                    onClick={() =>
                      setPeriod((prev) => ({
                        ...prev,
                        month: shiftYearMonth(prev.month || currentYearMonth(), -1),
                      }))
                    }
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="Next month"
                    disabled={
                      (period.month || currentYearMonth()) >= currentYearMonth()
                    }
                    onClick={() =>
                      setPeriod((prev) => {
                        const next = shiftYearMonth(prev.month || currentYearMonth(), 1)
                        return {
                          ...prev,
                          month: next > currentYearMonth() ? currentYearMonth() : next,
                        }
                      })
                    }
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </>
            )}

            {period.mode === 'custom' && (
              <>
                <Field label="From" className="min-w-[10rem]">
                  <Input
                    type="date"
                    value={period.from}
                    max={period.to || undefined}
                    onChange={(event) =>
                      setPeriod((prev) => ({ ...prev, from: event.target.value }))
                    }
                  />
                </Field>
                <Field label="To" className="min-w-[10rem]">
                  <Input
                    type="date"
                    value={period.to}
                    min={period.from || undefined}
                    onChange={(event) =>
                      setPeriod((prev) => ({ ...prev, to: event.target.value }))
                    }
                  />
                </Field>
              </>
            )}
          </div>
          <p className="text-xs text-stone-500">
            Showing <span className="font-medium text-forest-700">{rangeLabel}</span>
            {period.mode === 'month' && ' - use the arrows to move month to month.'}
            {period.mode === 'custom' && ' - stays overlapping these dates, payments recorded in this range.'}
            {period.mode === 'all' && ' - lifetime totals. Monthly charts show the last 12 months.'}
          </p>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-serif text-xl text-forest-700 flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Financial overview
            </h2>
            <p className="text-xs text-stone-500">
              Bookings whose stay overlaps this period · payments and refunds by transaction date
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <FinancialStat
              label="Revenue (net paid)"
              value={formatBDT(financials.totalRevenue)}
              icon={<Banknote className="w-4 h-4" />}
              tone="forest"
              hint={`${financials.bookingCount} booking${financials.bookingCount === 1 ? '' : 's'} in ${rangeLabel}`}
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
              hint={rangeLabel}
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
              hint="Not included in revenue totals above"
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
                  <CardDescription>
                    {period.mode === 'month'
                      ? `Payments vs refunds across ${period.month.slice(0, 4)}`
                      : period.mode === 'custom'
                        ? 'Payments vs refunds in the selected range'
                        : 'Payments vs refunds, last 12 months'}
                  </CardDescription>
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
                  <CardDescription>Share of collected revenue in {rangeLabel}</CardDescription>
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
                <CardDescription>Unpaid balances on stays in {rangeLabel}</CardDescription>
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
                <CardDescription>{occupancyCaption}</CardDescription>
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
                <CardDescription>
                  Check-ins by month
                  {period.mode === 'month' ? ` in ${period.month.slice(0, 4)}` : ''}
                </CardDescription>
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
                <CardDescription>Year-over-year bookings (real data)</CardDescription>
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
                <CardDescription>New vs returning guests in {rangeLabel}</CardDescription>
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
