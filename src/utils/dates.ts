/** Local calendar date as YYYY-MM-DD (avoids UTC shift from toISOString). */
export const toLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getTodayDate = (): string => toLocalDateString()

export const addDaysToDateString = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toLocalDateString(date)
}

/** ISO timestamp on the calendar day before a stay start, using the current local time of day. */
export const bookingCreatedAtForPastStay = (stayStartDate: string, now = new Date()): string => {
  const dayBefore = addDaysToDateString(stayStartDate, -1)
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return new Date(`${dayBefore}T${hours}:${minutes}:${seconds}`).toISOString()
}

/** Use a backdated created time when the stay starts before today (admin backfill). */
export const resolveBookingCreatedAt = (checkIn: string, eventDates?: string[]): string => {
  const today = getTodayDate()
  const stayStart =
    eventDates && eventDates.length > 0 ? [...eventDates].sort()[0] : checkIn
  if (stayStart < today) {
    return bookingCreatedAtForPastStay(stayStart)
  }
  return new Date().toISOString()
}

export const formatDisplayDate = (
  dateString: string,
  locale = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string => {
  const date = new Date(`${dateString}T12:00:00`)
  return date.toLocaleDateString(locale, options)
}
