import {
  Booking,
  computeBookingFinancials,
  getBookingGuestInfo,
  getBookingRooms,
  GUEST_ID_TYPE_LABELS,
  type GuestRecord,
} from './bookings'
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

/** Cancelled bookings never appear in exports. */
export const exportableBookings = (bookings: Booking[]): Booking[] =>
  bookings.filter((booking) => booking.status !== 'cancelled')

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
  if (booking.paymentHidden) {
    return {
      Subtotal: 'Hidden',
      Discount: '',
      'Discount Type': '',
      'Discount Value': '',
      'Discount Reason': '',
      'Total Due': '',
      Paid: '',
      Refunded: '',
      Outstanding: '',
      'Payment Method': '',
      'Transaction ID': '',
    }
  }
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
  'Booked By':
    booking.bookedBy?.type === 'staff'
      ? booking.bookedBy.name
        ? `${booking.bookedBy.name} (${booking.bookedBy.email})`
        : booking.bookedBy.email
      : booking.bookedBy?.type === 'website'
        ? 'Website'
        : '',
  'Guest Name': booking.name || '',
  Email: booking.email || '',
  Phone: booking.phone || '',
  Status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
  'Payment Status': booking.paymentHidden
    ? 'Hidden'
    : booking.payment?.status
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
 * Excel export - loads xlsx only on Export click.
 * Write-only (no parsing uploaded files); npm audit flags apply mainly to untrusted parses.
 */
export const exportBookingsToExcel = async (
  allBookings: Booking[],
  filename?: string
): Promise<void> => {
  const XLSX = await import('xlsx')
  const bookings = exportableBookings(allBookings)

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
  XLSX.utils.book_append_sheet(workbook, buildGuestSheet(XLSX, bookings), 'Guests')

  downloadWorkbook(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }), filename ?? buildBookingExportFilename(bookings))
}

const downloadWorkbook = (excelBuffer: ArrayBuffer, filename: string): void => {
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const GUEST_REGISTER_HEADERS = [
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
] as const

/** Guest register for government and other reports: identity and stay only, no money or notes. */
export const toGuestRegisterRow = (booking: Booking): ExportCell[] => {
  const rooms = getBookingRooms(booking)
  const arrival = getBookingArrivalTime(booking)
  const row: Record<(typeof GUEST_REGISTER_HEADERS)[number], ExportCell> = {
    'Booking ID': formatBookingId(booking.id),
    'Booking Date': formatBookingDate(booking.createdAt),
    'Booking Time': formatBookingTime(booking.createdAt),
    'Guest Name': booking.name || '',
    Email: booking.email || '',
    Phone: booking.phone || '',
    Rooms: rooms.map((room) => room.roomName).join(', ') || booking.roomName || '',
    'Rooms Booked': rooms.length,
    'Expected Arrival': arrival ? getArrivalTimeLabel(arrival) : '',
    'Check-in Date': booking.checkIn || '',
    'Check-out Date': booking.checkOut || '',
    Adults: booking.adults ?? 0,
    Children: booking.children ?? 0,
    'Total Guests': booking.totalGuests ?? 0,
  }
  return GUEST_REGISTER_HEADERS.map((header) => row[header])
}

export const GUEST_SHEET_HEADERS = [
  'Booking ID',
  'Guest No.',
  'Guest Name',
  'ID Type',
  'ID Number',
  'ID Issued By',
  'Nationality',
  'Address',
  'City',
  'Country',
  'Rooms',
  'Check-in Date',
  'Check-out Date',
] as const

const GUEST_SHEET_COL_WIDTHS = [10, 9, 22, 18, 20, 16, 14, 30, 14, 14, 18, 14, 14].map((wch) => ({ wch }))

const guestRecordFilled = (guest: GuestRecord): boolean =>
  Boolean(guest.name?.trim() || guest.idNumber?.trim())

/** One row per recorded guest; the booker alone when no guest details were entered. */
export const toGuestRows = (booking: Booking): ExportCell[][] => {
  const recorded = getBookingGuestInfo(booking).guests
    .map((guest, idx) => (idx === 0 && !guest.name?.trim() ? { ...guest, name: booking.name } : guest))
    .filter(guestRecordFilled)
  const guests: GuestRecord[] = recorded.length > 0 ? recorded : [{ name: booking.name }]
  const rooms = getBookingRooms(booking).map((room) => room.roomName).join(', ') || booking.roomName || ''
  return guests.map((guest, idx) => [
    formatBookingId(booking.id),
    idx + 1,
    guest.name?.trim() || '',
    guest.idNumber?.trim() ? GUEST_ID_TYPE_LABELS[guest.idType ?? 'nid'] : '',
    guest.idNumber?.trim() || '',
    guest.idIssuedBy?.trim() || '',
    guest.nationality?.trim() || '',
    guest.address?.trim() || '',
    guest.city?.trim() || '',
    guest.country?.trim() || '',
    rooms,
    booking.checkIn || '',
    booking.checkOut || '',
  ])
}

const buildGuestSheet = (XLSX: typeof import('xlsx'), bookings: Booking[]) => {
  const sheet = XLSX.utils.aoa_to_sheet([[...GUEST_SHEET_HEADERS], ...bookings.flatMap(toGuestRows)])
  sheet['!cols'] = GUEST_SHEET_COL_WIDTHS
  return sheet
}

export interface GuestProfileExport {
  name: string
  email: string
  phone: string
  tags: string[]
  totalStays: number
  lastStay?: string
  totalSpent: number
  notes?: string
  bookings: Booking[]
}

export const GUEST_PROFILE_HEADERS = [
  'Guest Name',
  'Phone',
  'Email',
  'Tags',
  'Total Stays',
  'First Stay',
  'Last Stay',
  'Total Spent',
  'ID Type',
  'ID Number',
  'ID Issued By',
  'Nationality',
  'Address',
  'City',
  'Country',
  'Emergency Contact',
  'Emergency Phone',
  'Emergency Relation',
  'Booking IDs',
  'Notes',
] as const

const GUEST_PROFILE_COL_WIDTHS = [22, 16, 26, 18, 10, 12, 12, 12, 18, 20, 16, 14, 30, 14, 14, 20, 16, 14, 28, 30].map(
  (wch) => ({ wch })
)

const formatGuestTag = (tag: string): string =>
  tag === 'vip' ? 'VIP' : tag.charAt(0).toUpperCase() + tag.slice(1)

const byCheckIn = (a: Booking, b: Booking): number => a.checkIn.localeCompare(b.checkIn)

/** ID and emergency details come from the most recent booking that has them. */
export const toGuestProfileRow = (profile: GuestProfileExport): ExportCell[] => {
  const chronological = [...profile.bookings].sort(byCheckIn)
  const newestFirst = [...chronological].reverse()
  const infos = newestFirst.map(getBookingGuestInfo)
  const primary =
    infos
      .map((info) => info.guests[0])
      .find((guest) => guest && (guest.idNumber?.trim() || guest.nationality?.trim() || guest.address?.trim())) ?? {}
  const emergency =
    infos.map((info) => info.emergencyContact).find((contact) => contact.name?.trim() || contact.phone?.trim()) ?? {}

  const row: Record<(typeof GUEST_PROFILE_HEADERS)[number], ExportCell> = {
    'Guest Name': profile.name || '',
    Phone: profile.phone || '',
    Email: profile.email || '',
    Tags: profile.tags.map(formatGuestTag).join(', '),
    'Total Stays': profile.totalStays,
    'First Stay': chronological[0]?.checkIn || '',
    'Last Stay': profile.lastStay || '',
    'Total Spent': profile.totalSpent,
    'ID Type': primary.idNumber?.trim() ? GUEST_ID_TYPE_LABELS[primary.idType ?? 'nid'] : '',
    'ID Number': primary.idNumber?.trim() || '',
    'ID Issued By': primary.idIssuedBy?.trim() || '',
    Nationality: primary.nationality?.trim() || '',
    Address: primary.address?.trim() || '',
    City: primary.city?.trim() || '',
    Country: primary.country?.trim() || '',
    'Emergency Contact': emergency.name?.trim() || '',
    'Emergency Phone': emergency.phone?.trim() || '',
    'Emergency Relation': emergency.relation?.trim() || '',
    'Booking IDs': chronological.map((booking) => formatBookingId(booking.id)).join(', '),
    Notes: profile.notes || '',
  }
  return GUEST_PROFILE_HEADERS.map((header) => row[header])
}

const ALL_GUESTS_HEADERS = ['Booker Name', 'Booker Phone', ...GUEST_SHEET_HEADERS]

/** Guest Profiles (one row per guest) plus All Guests (everyone recorded on their bookings). */
export const exportGuestsToExcel = async (profiles: GuestProfileExport[]): Promise<void> => {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()

  const profileSheet = XLSX.utils.aoa_to_sheet([[...GUEST_PROFILE_HEADERS], ...profiles.map(toGuestProfileRow)])
  profileSheet['!cols'] = GUEST_PROFILE_COL_WIDTHS
  XLSX.utils.book_append_sheet(workbook, profileSheet, 'Guest Profiles')

  const allGuestRows = profiles.flatMap((profile) =>
    [...profile.bookings]
      .sort(byCheckIn)
      .flatMap((booking) => toGuestRows(booking).map((row) => [profile.name, profile.phone, ...row]))
  )
  const allGuestsSheet = XLSX.utils.aoa_to_sheet([ALL_GUESTS_HEADERS, ...allGuestRows])
  allGuestsSheet['!cols'] = [{ wch: 22 }, { wch: 16 }, ...GUEST_SHEET_COL_WIDTHS]
  XLSX.utils.book_append_sheet(workbook, allGuestsSheet, 'All Guests')

  const { date, time } = filenameTimestamp(new Date().toISOString())
  downloadWorkbook(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }), `Guests_${date}_${time}`)
}

export const exportGuestRegisterToExcel = async (bookings: Booking[]): Promise<void> => {
  const XLSX = await import('xlsx')
  const sorted = exportableBookings(bookings).sort((a, b) => a.checkIn.localeCompare(b.checkIn))
  const sheet = XLSX.utils.aoa_to_sheet([[...GUEST_REGISTER_HEADERS], ...sorted.map(toGuestRegisterRow)])
  sheet['!cols'] = DEFAULT_COL_WIDTHS.slice(0, GUEST_REGISTER_HEADERS.length)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Guest Register')
  XLSX.utils.book_append_sheet(workbook, buildGuestSheet(XLSX, sorted), 'Guests')
  const { date, time } = filenameTimestamp(new Date().toISOString())
  downloadWorkbook(XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }), `Guest_register_${date}_${time}`)
}
