const parseDisplayDate = (iso: string): Date | null => {
  if (!iso) return null
  const date = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatStayWeekday = (iso: string): string => {
  const date = parseDisplayDate(iso)
  if (!date) return ''
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/** Compact range: "26–28 Aug 2026" when the stay is in one month. */
export const formatStayRange = (checkIn: string, checkOut: string): string => {
  const start = parseDisplayDate(checkIn)
  const end = parseDisplayDate(checkOut)
  if (!start || !end) return [formatShortDate(checkIn), formatShortDate(checkOut)].filter((part) => part !== '-').join(' – ') || '-'

  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  if (sameMonth) {
    const monthYear = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return `${start.getDate()}–${end.getDate()} ${monthYear}`
  }
  if (sameYear) {
    const left = start.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    const right = end.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
    return `${left} – ${right}`
  }
  return `${formatShortDate(checkIn)} – ${formatShortDate(checkOut)}`
}

export const formatShortDate = (iso: string | Date): string => {
  if (!iso) return '-'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatTime = (iso: string | Date): string => {
  if (!iso) return '-'
  const date = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export const formatDateTime = (iso: string | Date): string => {
  if (!iso) return '-'
  return `${formatShortDate(iso)} · ${formatTime(iso)}`
}

export const toISODate = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const daysBetween = (startISO: string, endISO: string): number => {
  if (!startISO || !endISO) return 0
  const start = new Date(`${startISO}T00:00:00`).getTime()
  const end = new Date(`${endISO}T00:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0
  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export const isWithinRange = (target: Date, start: string, end: string): boolean => {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const s = new Date(`${start}T00:00:00`).getTime()
  const e = new Date(`${end}T00:00:00`).getTime()
  return t >= s && t < e
}

export const relativeFromNow = (iso: string | Date): string => {
  if (!iso) return ''
  const date = typeof iso === 'string' ? new Date(iso) : iso
  const diff = date.getTime() - Date.now()
  const minutes = Math.round(diff / (1000 * 60))
  const abs = Math.abs(minutes)
  const direction = diff < 0 ? 'ago' : 'from now'

  if (abs < 1) return 'just now'
  if (abs < 60) return `${abs} min ${direction}`
  const hours = Math.round(abs / 60)
  if (hours < 24) return `${hours} hr ${direction}`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ${direction}`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} mo ${direction}`
  return `${Math.round(months / 12)} yr ${direction}`
}
