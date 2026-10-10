import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { Card, CardDescription, CardTitle } from '../ui/Card'
import { ExportButtons } from '../finance/shared'
import { DailyActivityChart } from './charts'
import {
  countsTowardRevenue,
  getBookingCashMovements,
  getBookingRooms,
  type Booking,
} from '../../../utils/bookings'
import { CONFERENCE_ROOM_ID } from '../../../data/roomCatalog'
import { addDays, businessToday, eachDay, toBusinessDay } from '../../../lib/finance/dates'
import { earnedByDay } from '../../../lib/finance/revenue'
import { toRevenueBookings } from '../../../lib/finance/revenueAdapter'
import { formatBDT } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { ExportColumn } from '../../../utils/reportExport'

const MAX_DAYS = 366

interface DayRow {
  date: string
  checkIns: number
  checkOuts: number
  roomsOccupied: number
  occupancy: number
  newBookings: number
  earned: number
  collected: number
  refunds: number
}

const formatDayLabel = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', options)

const DAY_COLUMNS: ExportColumn<DayRow>[] = [
  { header: 'Date', value: (r) => r.date },
  { header: 'Check-ins', value: (r) => r.checkIns, total: true },
  { header: 'Check-outs', value: (r) => r.checkOuts, total: true },
  { header: 'Rooms occupied', value: (r) => r.roomsOccupied, total: true },
  { header: 'Occupancy %', value: (r) => r.occupancy },
  { header: 'New bookings', value: (r) => r.newBookings, total: true },
  { header: 'Revenue earned (BDT)', value: (r) => r.earned, total: true },
  { header: 'Collected (BDT)', value: (r) => r.collected, total: true },
  { header: 'Refunds (BDT)', value: (r) => r.refunds, total: true },
  { header: 'Net collected (BDT)', value: (r) => r.collected - r.refunds, total: true },
]

interface DailyAnalyticsProps {
  bookings: Booking[]
  guestRoomCount: number
  /** `null` = all time; falls back to the last 30 days. */
  range: { from: string; to: string } | null
  rangeLabel: string
}

export const DailyAnalytics = ({ bookings, guestRoomCount, range, rangeLabel }: DailyAnalyticsProps) => {
  const today = businessToday()

  const { days, truncated } = useMemo(() => {
    const all = range ? eachDay(range.from, range.to) : eachDay(addDays(today, -29), today)
    return all.length > MAX_DAYS
      ? { days: all.slice(-MAX_DAYS), truncated: true }
      : { days: all, truncated: false }
  }, [range, today])

  const rows = useMemo<DayRow[]>(() => {
    const earned = earnedByDay(toRevenueBookings(bookings), days)
    const byDay = new Map<string, DayRow>(
      days.map((date) => [
        date,
        {
          date,
          checkIns: 0,
          checkOuts: 0,
          roomsOccupied: 0,
          occupancy: 0,
          newBookings: 0,
          earned: 0,
          collected: 0,
          refunds: 0,
        },
      ])
    )
    const totalRooms = Math.max(1, guestRoomCount)

    bookings.forEach((booking) => {
      getBookingCashMovements(booking).forEach((move) => {
        const row = byDay.get(toBusinessDay(move.recordedAt))
        if (!row) return
        if (move.isRefund) row.refunds += Math.abs(move.amount)
        else row.collected += move.amount
      })

      if (!countsTowardRevenue(booking)) return

      const created = byDay.get(toBusinessDay(booking.createdAt))
      if (created) created.newBookings += 1

      const guestRooms = getBookingRooms(booking).filter((line) => line.roomType !== CONFERENCE_ROOM_ID)
      if (guestRooms.length > 0) {
        const checkIn = byDay.get(booking.checkIn)
        if (checkIn) checkIn.checkIns += 1
        const checkOut = byDay.get(booking.checkOut)
        if (checkOut) checkOut.checkOuts += 1
      }
    })

    earned.forEach((value, day) => {
      const row = byDay.get(day)
      if (!row) return
      row.roomsOccupied = value.roomNights
      row.earned = value.total
    })

    return days.map((day) => {
      const row = byDay.get(day)!
      return {
        ...row,
        earned: Math.round(row.earned),
        occupancy: Math.min(100, Math.round((row.roomsOccupied / totalRooms) * 100)),
      }
    })
  }, [bookings, days, guestRoomCount])

  const summary = useMemo(() => {
    const totals = rows.reduce(
      (acc, r) => ({
        checkIns: acc.checkIns + r.checkIns,
        checkOuts: acc.checkOuts + r.checkOuts,
        roomNights: acc.roomNights + r.roomsOccupied,
        newBookings: acc.newBookings + r.newBookings,
        earned: acc.earned + r.earned,
        collected: acc.collected + r.collected,
        refunds: acc.refunds + r.refunds,
      }),
      { checkIns: 0, checkOuts: 0, roomNights: 0, newBookings: 0, earned: 0, collected: 0, refunds: 0 }
    )
    const dayCount = Math.max(1, rows.length)
    const busiest = rows.reduce<DayRow | null>(
      (best, r) => (r.roomsOccupied > 0 && (!best || r.roomsOccupied > best.roomsOccupied) ? r : best),
      null
    )
    const bestCollection = rows.reduce<DayRow | null>(
      (best, r) => (r.collected > 0 && (!best || r.collected > best.collected) ? r : best),
      null
    )
    return {
      totals,
      avgOccupancy: Math.round(rows.reduce((s, r) => s + r.occupancy, 0) / dayCount),
      avgCollected: Math.round((totals.collected - totals.refunds) / dayCount),
      busiest,
      bestCollection,
    }
  }, [rows])

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        day: formatDayLabel(r.date, { month: 'short', day: 'numeric' }),
        collected: r.collected - r.refunds,
        earned: r.earned,
        occupancy: r.occupancy,
      })),
    [rows]
  )

  const periodCaption = range ? rangeLabel : 'Last 30 days'

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl text-forest-700 flex items-center gap-2">
            <CalendarDays className="w-5 h-5" /> Daywise analytics
          </h2>
          <p className="text-xs text-stone-500">
            {periodCaption} · {rows.length} day{rows.length === 1 ? '' : 's'}
            {truncated && ` (latest ${MAX_DAYS} days shown)`}
          </p>
        </div>
        <ExportButtons
          options={{
            title: 'Daywise analytics',
            filenameBase: `cherekh-daywise-${rows[0]?.date ?? today}-to-${rows[rows.length - 1]?.date ?? today}`,
            period: periodCaption,
          }}
          sheets={[{ name: 'Daywise', columns: DAY_COLUMNS, rows }]}
          disabled={rows.length === 0}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DayStat
          label="Avg occupancy"
          value={`${summary.avgOccupancy}%`}
          hint={`${summary.totals.roomNights} room night${summary.totals.roomNights === 1 ? '' : 's'}`}
        />
        <DayStat
          label="Avg net collected / day"
          value={formatBDT(summary.avgCollected)}
          hint={`${formatBDT(summary.totals.collected - summary.totals.refunds)} total`}
        />
        <DayStat
          label="Busiest day"
          value={
            summary.busiest
              ? formatDayLabel(summary.busiest.date, { weekday: 'short', month: 'short', day: 'numeric' })
              : '-'
          }
          hint={
            summary.busiest
              ? `${summary.busiest.roomsOccupied} of ${guestRoomCount} rooms occupied`
              : 'No occupied nights'
          }
        />
        <DayStat
          label="Best collection day"
          value={
            summary.bestCollection
              ? formatDayLabel(summary.bestCollection.date, { weekday: 'short', month: 'short', day: 'numeric' })
              : '-'
          }
          hint={summary.bestCollection ? formatBDT(summary.bestCollection.collected) : 'No payments recorded'}
        />
      </div>

      <Card padded={false} className="p-6">
        <div className="mb-4">
          <CardTitle>Daily revenue &amp; occupancy</CardTitle>
          <CardDescription>
            Room revenue spreads each booking&apos;s total across its nights · collected is payments
            minus refunds on that day
          </CardDescription>
        </div>
        <DailyActivityChart data={chartData} />
      </Card>

      <Card padded={false} className="p-0 overflow-hidden">
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#E7E5E4]">
              <tr className="text-left text-[11px] uppercase tracking-wide text-stone-500">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium text-right">Check-ins</th>
                <th className="px-3 py-2.5 font-medium text-right">Check-outs</th>
                <th className="px-3 py-2.5 font-medium text-right">Occupied</th>
                <th className="px-3 py-2.5 font-medium text-right">New bookings</th>
                <th className="px-3 py-2.5 font-medium text-right">Room revenue</th>
                <th className="px-3 py-2.5 font-medium text-right">Collected</th>
                <th className="px-4 py-2.5 font-medium text-right">Refunds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr
                  key={r.date}
                  className={cn('hover:bg-cream/50', r.date === today && 'bg-forest-50/60')}
                >
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className="font-medium text-forest-700">
                      {formatDayLabel(r.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {r.date === today && <span className="ml-2 text-[10px] uppercase text-forest-600">Today</span>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.checkIns || '-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.checkOuts || '-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    {r.roomsOccupied > 0 ? (
                      <>
                        {r.roomsOccupied}/{guestRoomCount}{' '}
                        <span className="text-xs text-stone-500">({r.occupancy}%)</span>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.newBookings || '-'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-stone-700">
                    {r.earned > 0 ? formatBDT(r.earned) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-forest-700">
                    {r.collected > 0 ? formatBDT(r.collected) : '-'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-red-700">
                    {r.refunds > 0 ? `- ${formatBDT(r.refunds)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-cream font-medium text-forest-700 shadow-[0_-1px_0_#E7E5E4]">
              <tr>
                <td className="px-4 py-2.5">Total</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{summary.totals.checkIns}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{summary.totals.checkOuts}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {summary.totals.roomNights} <span className="text-xs text-stone-500">nights</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{summary.totals.newBookings}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatBDT(summary.totals.earned)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatBDT(summary.totals.collected)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-red-700">
                  {summary.totals.refunds > 0 ? `- ${formatBDT(summary.totals.refunds)}` : '-'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </section>
  )
}

const DayStat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-2xl bg-white border border-stone-100 shadow-soft p-3.5 min-w-0">
    <p className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">{label}</p>
    <p className="font-serif text-xl xl:text-2xl mt-1.5 truncate text-forest-700">{value}</p>
    {hint && <p className="text-xs text-stone-500 mt-1 truncate">{hint}</p>}
  </div>
)
