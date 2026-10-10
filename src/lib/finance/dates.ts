/** All financial reporting uses the resort's calendar day, regardless of the viewer's device timezone. */
export const BUSINESS_TIMEZONE = 'Asia/Dhaka'

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** YYYY-MM-DD in Asia/Dhaka for a timestamp; plain dates pass through unchanged. */
export const toBusinessDay = (value?: string | Date | null): string => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? value.slice(0, 10) : ''
  return dayFormatter.format(date)
}

export const businessToday = (now: Date = new Date()): string => toBusinessDay(now)

const parseDay = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

const formatDay = (date: Date): string => date.toISOString().slice(0, 10)

export const addDays = (iso: string, days: number): string => {
  const date = parseDay(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDay(date)
}

export const addMonths = (iso: string, months: number): string => {
  const date = parseDay(iso)
  const day = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  date.setUTCDate(Math.min(day, lastDay))
  return formatDay(date)
}

/** Whole days from `from` to `to` (to - from). */
export const diffDays = (from: string, to: string): number =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86400000)

/** Inclusive list of days. */
export const eachDay = (from: string, to: string): string[] => {
  const days: string[] = []
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) days.push(cursor)
  return days
}

export interface DateRange {
  from: string
  to: string
}

/** `null` range = all time. */
export const dayInRange = (day: string | null | undefined, range: DateRange | null): boolean => {
  if (!day) return false
  if (!range) return true
  const d = day.slice(0, 10)
  return d >= range.from && d <= range.to
}

export const monthKey = (day: string): string => day.slice(0, 7)

const startOfWeek = (iso: string): string => {
  const dow = parseDay(iso).getUTCDay()
  const offset = (dow + 6) % 7
  return addDays(iso, -offset)
}

const startOfQuarter = (iso: string): string => {
  const [y, m] = iso.split('-').map(Number)
  const q = Math.floor((m - 1) / 3) * 3 + 1
  return `${y}-${String(q).padStart(2, '0')}-01`
}

export type PeriodPreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'

export const PERIOD_PRESET_LABELS: Record<PeriodPreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  last_week: 'Last week',
  this_month: 'This month',
  last_month: 'Last month',
  this_quarter: 'This quarter',
  last_quarter: 'Last quarter',
  this_year: 'This year',
  last_year: 'Last year',
}

/** Weeks start on Monday. */
export const presetRange = (preset: PeriodPreset, today: string = businessToday()): DateRange => {
  switch (preset) {
    case 'today':
      return { from: today, to: today }
    case 'yesterday': {
      const y = addDays(today, -1)
      return { from: y, to: y }
    }
    case 'this_week':
      return { from: startOfWeek(today), to: addDays(startOfWeek(today), 6) }
    case 'last_week': {
      const start = addDays(startOfWeek(today), -7)
      return { from: start, to: addDays(start, 6) }
    }
    case 'this_month': {
      const start = `${today.slice(0, 7)}-01`
      return { from: start, to: addDays(addMonths(start, 1), -1) }
    }
    case 'last_month': {
      const start = addMonths(`${today.slice(0, 7)}-01`, -1)
      return { from: start, to: addDays(addMonths(start, 1), -1) }
    }
    case 'this_quarter': {
      const start = startOfQuarter(today)
      return { from: start, to: addDays(addMonths(start, 3), -1) }
    }
    case 'last_quarter': {
      const start = addMonths(startOfQuarter(today), -3)
      return { from: start, to: addDays(addMonths(start, 3), -1) }
    }
    case 'this_year':
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` }
    case 'last_year': {
      const y = Number(today.slice(0, 4)) - 1
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    }
  }
}
