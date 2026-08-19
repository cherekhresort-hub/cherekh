import type { Booking } from '../../utils/bookings'
import { bookingStayOverlapsRange } from './bookingFilters'
import { toISODate } from './date'

export type ReportPeriodMode = 'all' | 'month' | 'custom'

export interface ReportPeriod {
  mode: ReportPeriodMode
  /** YYYY-MM - used when mode is `month` */
  month: string
  from: string
  to: string
}

export const currentYearMonth = (date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const lastDayOfMonth = (year: number, month1to12: number): number =>
  new Date(year, month1to12, 0).getDate()

export const monthBounds = (yearMonth: string): { from: string; to: string } => {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!year || !month) {
    const today = toISODate()
    return { from: today, to: today }
  }
  const from = `${yearMonth}-01`
  const to = `${yearMonth}-${String(lastDayOfMonth(year, month)).padStart(2, '0')}`
  return { from, to }
}

export const defaultReportPeriod = (): ReportPeriod => {
  const month = currentYearMonth()
  const bounds = monthBounds(month)
  return {
    mode: 'month',
    month,
    from: bounds.from,
    to: bounds.to,
  }
}

export const shiftYearMonth = (yearMonth: string, delta: number): string => {
  const [yearStr, monthStr] = yearMonth.split('-')
  const date = new Date(Number(yearStr), Number(monthStr) - 1 + delta, 1)
  return currentYearMonth(date)
}

export const getReportRange = (
  period: ReportPeriod
): { from: string; to: string } | null => {
  if (period.mode === 'all') return null
  if (period.mode === 'month') {
    if (!period.month) return null
    return monthBounds(period.month)
  }
  const from = period.from || period.to
  const to = period.to || period.from
  if (!from) return null
  return { from, to: to < from ? from : to }
}

export const isoDateInRange = (iso: string | undefined, from: string, to: string): boolean => {
  if (!iso) return false
  const day = iso.slice(0, 10)
  return day >= from && day <= to
}

export const bookingInReportRange = (
  booking: Booking,
  range: { from: string; to: string } | null
): boolean => {
  if (!range) return true
  return bookingStayOverlapsRange(booking, range.from, range.to)
}

export const formatReportRangeLabel = (
  period: ReportPeriod,
  range: { from: string; to: string } | null
): string => {
  if (!range) return 'All time'
  if (period.mode === 'month') {
    const [yearStr, monthStr] = period.month.split('-')
    const date = new Date(Number(yearStr), Number(monthStr) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }
  const from = new Date(`${range.from}T12:00:00`)
  const to = new Date(`${range.to}T12:00:00`)
  const fromLabel = from.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const toLabel = to.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${fromLabel} – ${toLabel}`
}

export const eachCalendarMonth = (
  from: string,
  to: string
): { key: string; label: string }[] => {
  const start = new Date(`${from.slice(0, 7)}-01T12:00:00`)
  const end = new Date(`${to.slice(0, 7)}-01T12:00:00`)
  const months: { key: string; label: string }[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    const key = currentYearMonth(cursor)
    months.push({
      key,
      label: cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

export const rollingMonths = (count: number, end = new Date()): { key: string; label: string }[] => {
  const months: { key: string; label: string }[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(end.getFullYear(), end.getMonth() - i, 1)
    months.push({
      key: currentYearMonth(date),
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    })
  }
  return months
}

export const yearMonths = (year: number): { key: string; label: string }[] =>
  Array.from({ length: 12 }, (_, idx) => {
    const date = new Date(year, idx, 1)
    return {
      key: currentYearMonth(date),
      label: date.toLocaleDateString('en-US', { month: 'short' }),
    }
  })

export const daysInRange = (from: string, to: string): string[] => {
  const days: string[] = []
  const cursor = new Date(`${from}T12:00:00`)
  const end = new Date(`${to}T12:00:00`)
  while (cursor <= end) {
    days.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}
