import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  BedDouble,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Input'
import { Tabs } from '../components/ui/Tabs'
import {
  MonthlyBookingsBarChart,
  OccupancyAreaChart,
  PaymentMethodPie,
  ReturnRatePie,
  RevenueBarChart,
  SeasonalLineChart,
} from '../components/reports/charts'
import { DailyAnalytics } from '../components/reports/DailyAnalytics'
import { ExpensesReport } from '../components/reports/ExpensesReport'
import { FinancialStatementsReport } from '../components/reports/FinancialStatementsReport'
import { InvestmentsReport } from '../components/reports/InvestmentsReport'
import { ExportButtons, FinanceNotice } from '../components/finance/shared'
import { useBookingsData } from '../hooks/useBookingsData'
import { useRoomsData } from '../hooks/useRoomsData'
import { useFinanceData } from '../hooks/useFinanceData'
import { useAuth } from '../../contexts/AuthProvider'
import { guestIdentityKey } from '../data/guests'
import {
  computeBookingFinancials,
  countsTowardRevenue,
  PAYMENT_METHOD_LABELS,
  type Booking,
  type PaymentMethod,
} from '../../utils/bookings'
import { formatBDT } from '../utils/format'
import { formatShortDate } from '../utils/date'
import { addDays, businessToday, PERIOD_PRESET_LABELS, type PeriodPreset } from '../../lib/finance/dates'
import { cashReceived, earnedByDay, earnsRevenue, revenueEarned, type RevenueBooking } from '../../lib/finance/revenue'
import { toRevenueBookings } from '../../lib/finance/revenueAdapter'
import type { ExportColumn, ExportSheet } from '../../utils/reportExport'
import {
  bookingInReportRange,
  currentYearMonth,
  daysInRange,
  defaultReportPeriod,
  eachCalendarMonth,
  formatReportRangeLabel,
  getReportRange,
  rollingMonths,
  shiftYearMonth,
  yearMonths,
  type ReportPeriod,
  type ReportPeriodMode,
} from '../utils/reportPeriod'

type ReportTab = 'bookings' | 'daywise' | 'expenses' | 'statements' | 'investments'

const Reports = () => {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const canSeeExpenses = role === 'admin' || role === 'manager'
  const { bookings } = useBookingsData()
  const { rooms } = useRoomsData()
  const [period, setPeriod] = useState(defaultReportPeriod)
  const [searchParams, setSearchParams] = useSearchParams()

  const tabs = [
    { value: 'bookings' as ReportTab, label: 'Bookings & revenue' },
    { value: 'daywise' as ReportTab, label: 'Daywise' },
    ...(canSeeExpenses ? [{ value: 'expenses' as ReportTab, label: 'Expenses' }] : []),
    ...(isAdmin
      ? [
          { value: 'statements' as ReportTab, label: 'Financial statements' },
          { value: 'investments' as ReportTab, label: 'Investment' },
        ]
      : []),
  ]
  const requested = searchParams.get('tab') as ReportTab | null
  const tab: ReportTab = tabs.some((t) => t.value === requested) ? (requested as ReportTab) : 'bookings'
  const setTab = (next: ReportTab) =>
    setSearchParams(
      (p) => {
        p.set('tab', next)
        return p
      },
      { replace: true }
    )

  const needsFinance = tab === 'expenses' || tab === 'statements' || tab === 'investments'
  const finance = useFinanceData(canSeeExpenses && needsFinance)

  const range = useMemo(() => getReportRange(period), [period])
  const rangeLabel = useMemo(() => formatReportRangeLabel(period, range), [period, range])
  const revenueBookings = useMemo(() => toRevenueBookings(bookings), [bookings])
  const guestRoomCount = rooms.filter((room) => !room.isConference).length

  return (
    <>
      <TopBar title="Reports" description="Bookings, expenses and financial statements for any period" />
      <main className="px-4 lg:px-8 py-6 space-y-6">
        <PeriodPicker period={period} setPeriod={setPeriod} rangeLabel={rangeLabel} />

        <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs<ReportTab> value={tab} onChange={setTab} items={tabs} className="w-max" layoutId="reports-tab" />
        </div>

        {tab === 'bookings' && (
          <BookingsRevenueReport
            bookings={bookings}
            revenueBookings={revenueBookings}
            guestRoomCount={guestRoomCount}
            period={period}
            range={range}
            rangeLabel={rangeLabel}
          />
        )}
        {tab === 'daywise' && <DailyAnalytics bookings={bookings} guestRoomCount={guestRoomCount} range={range} rangeLabel={rangeLabel} />}
        {needsFinance &&
          (!finance.available && !finance.loading ? (
            <FinanceNotice title="Finance data is unavailable">{finance.error}</FinanceNotice>
          ) : finance.loading && finance.data.expenses.length === 0 && finance.data.accounts.length === 0 ? (
            <div className="rounded-2xl border border-stone-200 bg-white/80 px-6 py-12 text-center text-sm text-stone-500">Loading finance records…</div>
          ) : tab === 'expenses' ? (
            <ExpensesReport data={finance.data} range={range} rangeLabel={rangeLabel} />
          ) : tab === 'statements' ? (
            <FinancialStatementsReport data={finance.data} revenueBookings={revenueBookings} range={range} rangeLabel={rangeLabel} />
          ) : (
            <InvestmentsReport data={finance.data} range={range} rangeLabel={rangeLabel} />
          ))}
      </main>
    </>
  )
}

// ---------------------------------------------------------------------------
// Period picker
// ---------------------------------------------------------------------------

const PeriodPicker = ({
  period,
  setPeriod,
  rangeLabel,
}: {
  period: ReportPeriod
  setPeriod: React.Dispatch<React.SetStateAction<ReportPeriod>>
  rangeLabel: string
}) => {
  const setMode = (mode: ReportPeriodMode) => {
    setPeriod((prev) => {
      if (mode === 'month') return { ...prev, mode, month: prev.month || currentYearMonth() }
      if (mode === 'preset') return { ...prev, mode, preset: prev.preset ?? 'this_month' }
      if (mode === 'custom') {
        const current = getReportRange(prev)
        return { ...prev, mode, from: current?.from || prev.from, to: current?.to || prev.to }
      }
      return { ...prev, mode }
    })
  }

  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Period" className="min-w-[10rem]">
          <Select value={period.mode} onChange={(event) => setMode(event.target.value as ReportPeriodMode)}>
            <option value="preset">Quick period</option>
            <option value="month">By month</option>
            <option value="custom">Custom range</option>
            <option value="all">All time</option>
          </Select>
        </Field>

        {period.mode === 'preset' && (
          <Field label="Range" className="min-w-[11rem]">
            <Select value={period.preset ?? 'this_month'} onChange={(event) => setPeriod((prev) => ({ ...prev, preset: event.target.value as PeriodPreset }))}>
              {(Object.keys(PERIOD_PRESET_LABELS) as PeriodPreset[]).map((p) => (
                <option key={p} value={p}>
                  {PERIOD_PRESET_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {period.mode === 'month' && (
          <>
            <Field label="Month" className="min-w-[11rem]">
              <Input type="month" value={period.month} max={currentYearMonth()} onChange={(event) => setPeriod((prev) => ({ ...prev, month: event.target.value }))} />
            </Field>
            <div className="flex gap-1 pb-0.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
                aria-label="Previous month"
                onClick={() => setPeriod((prev) => ({ ...prev, month: shiftYearMonth(prev.month || currentYearMonth(), -1) }))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10"
                aria-label="Next month"
                disabled={(period.month || currentYearMonth()) >= currentYearMonth()}
                onClick={() =>
                  setPeriod((prev) => {
                    const next = shiftYearMonth(prev.month || currentYearMonth(), 1)
                    return { ...prev, month: next > currentYearMonth() ? currentYearMonth() : next }
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
              <Input type="date" value={period.from} max={period.to || undefined} onChange={(event) => setPeriod((prev) => ({ ...prev, from: event.target.value }))} />
            </Field>
            <Field label="To" className="min-w-[10rem]">
              <Input type="date" value={period.to} min={period.from || undefined} onChange={(event) => setPeriod((prev) => ({ ...prev, to: event.target.value }))} />
            </Field>
          </>
        )}
      </div>
      <p className="text-xs text-stone-500">
        Showing <span className="font-medium text-forest-700">{rangeLabel}</span>
        {period.mode === 'month' && ' - use the arrows to move month to month.'}
        {period.mode === 'all' && ' - lifetime totals. Monthly charts show the last 12 months.'}
        {' '}Dates follow Bangladesh time (Asia/Dhaka).
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Bookings & revenue
// ---------------------------------------------------------------------------

interface BookingsRevenueProps {
  bookings: Booking[]
  revenueBookings: RevenueBooking[]
  guestRoomCount: number
  period: ReportPeriod
  range: { from: string; to: string } | null
  rangeLabel: string
}

const BookingsRevenueReport = ({ bookings, revenueBookings, guestRoomCount, period, range, rangeLabel }: BookingsRevenueProps) => {
  const periodBookings = useMemo(() => bookings.filter((booking) => bookingInReportRange(booking, range)), [bookings, range])

  const occupancyData = useMemo(() => {
    const totalRooms = Math.max(1, guestRoomCount)
    const today = businessToday()
    const days = range ? daysInRange(range.from, range.to) : daysInRange(addDays(today, -13), today)
    const sampled = days.length > 62 ? days.filter((_, idx) => idx % Math.ceil(days.length / 31) === 0) : days
    const earned = earnedByDay(revenueBookings, sampled)
    return sampled.map((iso) => ({
      day: new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      occupancy: Math.min(100, Math.round(((earned.get(iso)?.roomNights ?? 0) / totalRooms) * 100)),
    }))
  }, [revenueBookings, range, guestRoomCount])

  const chartMonths = useMemo(() => {
    if (period.mode === 'month' && period.month) return yearMonths(Number(period.month.slice(0, 4)))
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
    return chartMonths.map((month) => ({ month: month.label, bookings: map.get(month.key) ?? 0 }))
  }, [chartMonths, periodBookings])

  const seasonalData = useMemo(() => {
    const focusYear =
      period.mode === 'month' && period.month ? Number(period.month.slice(0, 4)) : range ? Number(range.from.slice(0, 4)) : Number(businessToday().slice(0, 4))
    const countByMonth = (year: number) => {
      const map = new Map<number, number>()
      bookings.forEach((booking) => {
        if (!countsTowardRevenue(booking)) return
        const checkIn = booking.checkIn.slice(0, 10)
        if (Number(checkIn.slice(0, 4)) !== year) return
        const monthIdx = Number(checkIn.slice(5, 7)) - 1
        map.set(monthIdx, (map.get(monthIdx) ?? 0) + 1)
      })
      return map
    }
    const thisYear = countByMonth(focusYear)
    const lastYear = countByMonth(focusYear - 1)
    return yearMonths(focusYear).map((month, idx) => ({ period: month.label, thisYear: thisYear.get(idx) ?? 0, lastYear: lastYear.get(idx) ?? 0 }))
  }, [bookings, period.mode, period.month, range])

  const cash = useMemo(() => cashReceived(revenueBookings, range), [revenueBookings, range])
  const earned = useMemo(() => revenueEarned(revenueBookings, range), [revenueBookings, range])

  const financials = useMemo(() => {
    const active = periodBookings.filter(countsTowardRevenue)
    let totalOutstanding = 0
    let totalBilled = 0
    let totalDiscount = 0
    let discountedBookings = 0
    let paidBookings = 0
    let outstandingBookings = 0
    active.forEach((booking) => {
      const fin = computeBookingFinancials(booking)
      totalOutstanding += fin.outstanding
      totalBilled += fin.total
      totalDiscount += fin.discount
      if (fin.discount > 0) discountedBookings += 1
      if (fin.status === 'paid') paidBookings += 1
      if (fin.outstanding > 0) outstandingBookings += 1
    })
    return { totalOutstanding, totalBilled, totalDiscount, discountedBookings, paidBookings, outstandingBookings, bookingCount: active.length }
  }, [periodBookings])

  const cancelledFinancials = useMemo(() => {
    const cancelled = periodBookings.filter((booking) => booking.status === 'cancelled')
    return { count: cancelled.length, totalBilled: cancelled.reduce((s, b) => s + computeBookingFinancials(b).total, 0) }
  }, [periodBookings])

  const monthlyRevenue = useMemo(() => {
    const rev = new Map<string, number>()
    const refunds = new Map<string, number>()
    revenueBookings.forEach((b) =>
      b.cash.forEach((move) => {
        if (range && (move.day < range.from || move.day > range.to)) return
        const key = move.day.slice(0, 7)
        const target = move.isRefund ? refunds : rev
        target.set(key, (target.get(key) ?? 0) + move.amount)
      })
    )
    return chartMonths.map((month) => ({ month: month.label, revenue: rev.get(month.key) ?? 0, refunds: refunds.get(month.key) ?? 0 }))
  }, [revenueBookings, chartMonths, range])

  const paymentMethodBreakdown = useMemo(() => {
    const entries = Object.entries(cash.byMethod)
      .filter(([, v]) => v.received > 0)
      .map(([key, v]) => ({ name: PAYMENT_METHOD_LABELS[key as PaymentMethod] ?? (key === 'unspecified' ? 'Not specified' : key), value: v.received }))
    return entries.length > 0 ? entries : [{ name: 'No data yet', value: 1 }]
  }, [cash])

  const outstandingAll = useMemo(
    () =>
      periodBookings
        .filter(countsTowardRevenue)
        .map((booking) => ({ booking, fin: computeBookingFinancials(booking) }))
        .filter(({ fin }) => fin.outstanding > 0)
        .sort((a, b) => b.fin.outstanding - a.fin.outstanding),
    [periodBookings]
  )
  const outstandingList = outstandingAll.slice(0, 8)

  /** Guests with a stay in the period, grouped by how many stays they've had up to the end of the period. */
  const returnRate = useMemo(() => {
    const end = range?.to ?? '9999-12-31'
    const history = new Map<string, number>()
    revenueBookings.forEach((rb, i) => {
      if (!earnsRevenue(rb) || rb.checkIn > end) return
      const key = guestIdentityKey(bookings[i])
      history.set(key, (history.get(key) ?? 0) + 1)
    })
    const inPeriod = new Set<string>()
    periodBookings.forEach((booking) => {
      if (booking.status === 'confirmed' || booking.status === 'checked-out') inPeriod.add(guestIdentityKey(booking))
    })
    let newGuests = 0
    let returning = 0
    let frequent = 0
    inPeriod.forEach((key) => {
      const count = history.get(key) ?? 1
      if (count >= 5) frequent += 1
      else if (count >= 2) returning += 1
      else newGuests += 1
    })
    return [
      { name: 'New guests', value: newGuests },
      { name: 'Returning', value: returning },
      { name: 'Frequent (5+)', value: frequent },
    ]
  }, [revenueBookings, bookings, periodBookings, range])

  const occupancyCaption = range ? rangeLabel : 'Last 14 days'

  const summaryRows = [
    { label: 'Revenue earned (stay nights in period)', value: earned.total },
    { label: 'Room revenue earned', value: earned.rooms },
    { label: 'Food revenue earned (booking extras)', value: earned.food },
    { label: 'Other extras earned', value: earned.other },
    { label: 'Room nights sold', value: earned.roomNights },
    { label: 'Guest payments received', value: cash.received },
    { label: 'Guest refunds paid', value: cash.refunded },
    { label: 'Net collected', value: cash.net },
    { label: 'Bookings in period (confirmed/checked-out/pending)', value: financials.bookingCount },
    { label: 'Total billed on those bookings', value: financials.totalBilled },
    { label: 'Outstanding on those bookings', value: financials.totalOutstanding },
    { label: 'Discounts given', value: financials.totalDiscount },
    { label: 'Cancelled bookings', value: cancelledFinancials.count },
  ]
  const outstandingColumns: ExportColumn<(typeof outstandingAll)[number]>[] = [
    { header: 'Guest', value: (r) => r.booking.name, width: 24 },
    { header: 'Room', value: (r) => r.booking.roomName },
    { header: 'Check-in', value: (r) => r.booking.checkIn },
    { header: 'Check-out', value: (r) => r.booking.checkOut },
    { header: 'Total (BDT)', value: (r) => r.fin.total, total: true },
    { header: 'Paid (BDT)', value: (r) => r.fin.paid, total: true },
    { header: 'Outstanding (BDT)', value: (r) => r.fin.outstanding, total: true },
  ]
  const sheets: ExportSheet<any>[] = [
    { name: 'Summary', columns: [{ header: 'Measure', value: (r: { label: string }) => r.label, width: 50 }, { header: 'Value', value: (r: { value: number }) => Math.round(r.value * 100) / 100 }], rows: summaryRows },
    { name: 'Monthly collections', columns: [{ header: 'Month', value: (r: { month: string }) => r.month }, { header: 'Received (BDT)', value: (r: { revenue: number }) => r.revenue, total: true }, { header: 'Refunds (BDT)', value: (r: { refunds: number }) => r.refunds, total: true }], rows: monthlyRevenue },
    { name: 'Outstanding', columns: outstandingColumns, rows: outstandingAll },
  ]

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl text-forest-700 flex items-center gap-2">
              <Wallet className="w-5 h-5" /> Financial overview
            </h2>
            <p className="text-xs text-stone-500">Earned = booking value spread over stay nights in the period · collected = payments and refunds by transaction date</p>
          </div>
          <ExportButtons options={{ title: 'Bookings & revenue', filenameBase: 'cherekh-bookings-revenue', period: rangeLabel }} sheets={sheets} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          <FinancialStat
            label="Revenue earned"
            value={formatBDT(Math.round(earned.total))}
            icon={<BedDouble className="w-4 h-4" />}
            tone="forest"
            hint={`${earned.roomNights} room night${earned.roomNights === 1 ? '' : 's'} (confirmed & checked-out)`}
          />
          <FinancialStat
            label="Collected (net)"
            value={formatBDT(cash.net)}
            icon={<Banknote className="w-4 h-4" />}
            tone="forest"
            hint={`Received ${formatBDT(cash.received)} − refunds, by payment date`}
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
          <FinancialStat label="Refunded" value={formatBDT(cash.refunded)} icon={<RefreshCcw className="w-4 h-4" />} tone="red" hint={rangeLabel} />
          <FinancialStat label="Total billed" value={formatBDT(financials.totalBilled)} icon={<Receipt className="w-4 h-4" />} tone="sky" hint={`${financials.paidBookings} fully paid`} />
          <FinancialStat label="Cancelled bookings" value={String(cancelledFinancials.count)} icon={<XCircle className="w-4 h-4" />} tone="red" hint="Not included in revenue totals above" />
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
                  <Banknote className="w-4 h-4 text-forest-600" /> Monthly collections
                </CardTitle>
                <CardDescription>
                  {period.mode === 'month'
                    ? `Payments vs refunds across ${period.month.slice(0, 4)}`
                    : range
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
                <CardDescription>Share of collected payments in {rangeLabel}</CardDescription>
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
            {outstandingAll.length > 0 && (
              <Badge tone="amber" size="sm">
                {outstandingAll.length}
              </Badge>
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
                      <td className="px-2 py-2.5 text-right font-medium text-stone-700">{formatBDT(fin.total)}</td>
                      <td className="px-2 py-2.5 text-right text-forest-700">{formatBDT(fin.paid)}</td>
                      <td className="px-2 py-2.5 text-right font-medium text-amber-700">{formatBDT(fin.outstanding)}</td>
                      <td className="px-2 py-2.5">
                        <Badge tone={fin.status === 'partial' ? 'amber' : 'neutral'} size="sm">
                          {fin.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {outstandingAll.length > outstandingList.length && (
                <p className="px-2 pt-2 text-xs text-stone-500">
                  Showing the {outstandingList.length} largest of {outstandingAll.length}. Export for the full list.
                </p>
              )}
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
              <CardDescription>{occupancyCaption} · confirmed and checked-out stays</CardDescription>
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
              <CardDescription>Guests staying in {rangeLabel}, by total stays so far</CardDescription>
            </div>
          </div>
          <ReturnRatePie data={returnRate} />
        </Card>
      </div>
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

const FinancialStat = ({ label, value, hint, icon, tone }: { label: string; value: string; hint?: string; icon: React.ReactNode; tone: StatTone }) => {
  const t = STAT_TONES[tone]
  return (
    <div className="rounded-2xl bg-white border border-stone-100 shadow-soft p-3 xl:p-3.5 min-w-0">
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-[10px] xl:text-[11px] uppercase tracking-wide text-stone-500 font-medium leading-snug">{label}</p>
        <span className={`w-7 h-7 xl:w-8 xl:h-8 rounded-xl inline-flex items-center justify-center shrink-0 ${t.bg} ${t.icon}`}>{icon}</span>
      </div>
      <p className={`font-serif text-xl xl:text-2xl mt-1.5 xl:mt-2 truncate ${t.text}`}>{value}</p>
      {hint && <p className="text-[11px] xl:text-xs text-stone-500 mt-1 leading-snug line-clamp-2">{hint}</p>}
    </div>
  )
}

export default Reports
