import { Booking, computeBookingFinancials, getBookingRooms } from './bookings'
import {
  bookingHasGuestRooms,
  bookingIncludesConference,
  formatEventDatesDisplay,
  getArrivalTimeLabel,
  getBookingArrivalTime,
  getBookingEventDates,
  getBookingEventTimeline,
} from './bookingHelpers'
import { formatBookingId } from './bookingId'
import { CONFERENCE_ROOM_ID } from '../data/roomCatalog'

type ExportCell = string | number

const formatBookingDate = (iso: string): string => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatBookingTime = (iso: string): string => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const sanitizeFilenamePart = (value: string): string =>
  value
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 60) || 'booking'

const filenameTimestamp = (iso: string): { date: string; time: string } => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    const now = new Date()
    return {
      date: now.toISOString().slice(0, 10),
      time: `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`,
    }
  }
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    time: `${String(date.getHours()).padStart(2, '0')}-${String(date.getMinutes()).padStart(2, '0')}`,
  }
}

/** e.g. John_Doe_2026-06-08_14-45 or John_Doe_2026-06-08_14-45_plus_3_more */
export const buildBookingExportFilename = (bookings: Booking[]): string => {
  if (bookings.length === 0) return 'bookings'

  const primary = bookings[0]
  const name = sanitizeFilenamePart(primary.name)
  const { date, time } = filenameTimestamp(primary.createdAt)
  const base = `${name}_${date}_${time}`

  if (bookings.length === 1) return base
  return `${base}_plus_${bookings.length - 1}_more`
}

const parseConferenceDetails = (specialRequests: string): Record<string, string> => {
  const details: Record<string, string> = {}
  specialRequests.split('\n').forEach((line) => {
    const [label, ...rest] = line.split(':')
    if (label && rest.length > 0) {
      details[label.trim()] = rest.join(':').trim()
    }
  })
  return details
}

const paymentFields = (booking: Booking): Record<string, ExportCell> => {
  const fin = computeBookingFinancials(booking)
  const discount = booking.payment?.discount
  return {
    Subtotal: fin.subtotal,
    Discount: fin.discount,
    'Discount Type': discount ? discount.type : '',
    'Discount Value': discount ? discount.value : '',
    'Discount Reason': discount?.reason || '',
    'Total Due': fin.total,
    Paid: fin.paid,
    Refunded: fin.refunded,
    Outstanding: fin.outstanding,
    'Payment Method': booking.payment?.method || '',
    'Transaction ID': booking.payment?.transactionId || '',
  }
}

const baseFields = (booking: Booking): Record<string, ExportCell> => ({
  'Booking ID': formatBookingId(booking.id),
  'Booking Date': formatBookingDate(booking.createdAt),
  'Booking Time': formatBookingTime(booking.createdAt),
  'Guest Name': booking.name || '',
  Email: booking.email || '',
  Phone: booking.phone || '',
  Status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
  'Payment Status': booking.payment?.status
    ? booking.payment.status.charAt(0).toUpperCase() + booking.payment.status.slice(1)
    : 'Pending',
})

const ROOM_HEADERS = [
  'Booking ID',
  'Booking Date',
  'Booking Time',
  'Guest Name',
  'Email',
  'Phone',
  'Rooms',
  'Rooms Booked',
  'Expected Arrival',
  'Check-in Date',
  'Check-out Date',
  'Adults',
  'Children',
  'Total Guests',
  'Special Requests',
  'Status',
  'Payment Status',
  'Subtotal',
  'Discount',
  'Discount Type',
  'Discount Value',
  'Discount Reason',
  'Total Due',
  'Paid',
  'Refunded',
  'Outstanding',
  'Payment Method',
  'Transaction ID',
  'Updated At',
] as const

const CONFERENCE_HEADERS = [
  'Booking ID',
  'Booking Date',
  'Booking Time',
  'Guest Name',
  'Email',
  'Phone',
  'Room',
  'Event Dates',
  'Event Timeline',
  'Check-in Date',
  'Check-out Date',
  'Adults',
  'Children',
  'Total Guests',
  'Event Type',
  'Organization',
  'Notes',
  'Status',
  'Payment Status',
  'Subtotal',
  'Discount',
  'Discount Type',
  'Discount Value',
  'Discount Reason',
  'Total Due',
  'Paid',
  'Refunded',
  'Outstanding',
  'Payment Method',
  'Transaction ID',
  'Updated At',
] as const

const toRoomRow = (booking: Booking): Record<string, ExportCell> => {
  const guestRooms = getBookingRooms(booking).filter((room) => room.roomType !== CONFERENCE_ROOM_ID)
  return {
    ...baseFields(booking),
    Rooms: guestRooms.map((room) => room.roomName).join(', '),
    'Rooms Booked': guestRooms.length,
    'Expected Arrival': getBookingArrivalTime(booking)
      ? getArrivalTimeLabel(getBookingArrivalTime(booking)!)
      : '',
    'Check-in Date': booking.checkIn || '',
    'Check-out Date': booking.checkOut || '',
    Adults: booking.adults ?? 0,
    Children: booking.children ?? 0,
    'Total Guests': booking.totalGuests ?? 0,
    'Special Requests': booking.specialRequests || '',
    ...paymentFields(booking),
    'Updated At': booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : '',
  }
}

const toConferenceRow = (booking: Booking): Record<string, ExportCell> => {
  const conferenceDetails = parseConferenceDetails(booking.specialRequests || '')
  const conferenceRooms = getBookingRooms(booking).filter((room) => room.roomType === CONFERENCE_ROOM_ID)
  const roomLabel =
    conferenceRooms.map((room) => room.roomName).join(', ') ||
    booking.roomName ||
    'Conference Room'
  const eventType =
    (booking as Booking & { eventType?: string }).eventType ||
    conferenceDetails['Event Type'] ||
    ''
  const organization =
    (booking as Booking & { organization?: string }).organization ||
    conferenceDetails['Organization'] ||
    ''

  return {
    ...baseFields(booking),
    Room: roomLabel,
    'Event Dates': formatEventDatesDisplay(getBookingEventDates(booking)),
    'Event Timeline': getBookingEventTimeline(booking) ?? '',
    'Check-in Date': booking.checkIn || '',
    'Check-out Date': booking.checkOut || '',
    Adults: booking.adults ?? 0,
    Children: booking.children ?? 0,
    'Total Guests': booking.totalGuests ?? 0,
    'Event Type': eventType,
    Organization: organization,
    Notes: conferenceDetails['Additional Notes'] || booking.specialRequests || '',
    ...paymentFields(booking),
    'Updated At': booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : '',
  }
}

const rowsToSheet = (headers: readonly string[], rows: Record<string, ExportCell>[]) => {
  const body = rows.map((row) => headers.map((header) => row[header] ?? ''))
  return { headers: [...headers], body }
}

const DEFAULT_COL_WIDTHS = [
  { wch: 10 },
  { wch: 14 },
  { wch: 12 },
  { wch: 20 },
  { wch: 25 },
  { wch: 15 },
  { wch: 22 },
  { wch: 18 },
  { wch: 18 },
  { wch: 14 },
  { wch: 14 },
  { wch: 8 },
  { wch: 8 },
  { wch: 12 },
  { wch: 18 },
  { wch: 12 },
  { wch: 15 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 15 },
  { wch: 12 },
  { wch: 12 },
  { wch: 12 },
  { wch: 15 },
  { wch: 20 },
  { wch: 20 },
  { wch: 18 },
  { wch: 18 },
  { wch: 18 },
]

/**
 * Excel export — loads xlsx only on Export click.
 * Write-only (no parsing uploaded files); npm audit flags apply mainly to untrusted parses.
 */
export const exportBookingsToExcel = async (
  bookings: Booking[],
  filename?: string
): Promise<void> => {
  const XLSX = await import('xlsx')

  const roomBookings = bookings.filter((booking) => bookingHasGuestRooms(booking))
  const conferenceBookings = bookings.filter((booking) => bookingIncludesConference(booking))

  const roomSheetData = rowsToSheet(ROOM_HEADERS, roomBookings.map(toRoomRow))
  const conferenceSheetData = rowsToSheet(CONFERENCE_HEADERS, conferenceBookings.map(toConferenceRow))

  const workbook = XLSX.utils.book_new()

  const roomSheet = XLSX.utils.aoa_to_sheet([roomSheetData.headers, ...roomSheetData.body])
  roomSheet['!cols'] = DEFAULT_COL_WIDTHS
  XLSX.utils.book_append_sheet(workbook, roomSheet, 'Room Bookings')

  const conferenceSheet = XLSX.utils.aoa_to_sheet([
    conferenceSheetData.headers,
    ...conferenceSheetData.body,
  ])
  conferenceSheet['!cols'] = DEFAULT_COL_WIDTHS
  XLSX.utils.book_append_sheet(workbook, conferenceSheet, 'Conference Bookings')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename ?? buildBookingExportFilename(bookings)}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
