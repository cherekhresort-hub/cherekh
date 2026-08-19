import type {
  Booking,
  BookingDiscount,
  BookingRoomLine,
  Payment,
  PaymentMethod,
  PaymentTransactionType,
} from '../utils/bookings'

export type BookingListRow = {
  id: string
  status: string
  check_in: string
  check_out: string
  guest_email: string | null
  guest_phone: string | null
  created_at: string
  updated_at: string
  guest_name: string
  room_name: string
  room_type: string
  adults: number
  children: number
  total_guests: number
  rooms: BookingRoomLine[] | unknown
  special_requests: string
  payment_amount: number
  payment_status: string
  payment_discount: BookingDiscount | null
  payment_net?: number | string | null
  payment_tx_count?: number | string | null
  payment_last_amount?: number | string | null
  payment_last_type?: string | null
  payment_last_method?: string | null
  payment_last_at?: string | null
  extras_total?: number | string | null
}

const parseRooms = (raw: unknown): BookingRoomLine[] | undefined => {
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  return raw as BookingRoomLine[]
}

const parseDiscount = (raw: unknown): BookingDiscount | undefined => {
  if (!raw || typeof raw !== 'object') return undefined
  const d = raw as Record<string, unknown>
  const type = d.type === 'percent' ? 'percent' : d.type === 'amount' ? 'amount' : null
  const value = Number(d.value)
  if (!type || !Number.isFinite(value) || value <= 0) return undefined
  return {
    type,
    value,
    reason: typeof d.reason === 'string' ? d.reason : undefined,
  }
}

const buildPayment = (row: BookingListRow): Payment => {
  const payment: Payment = {
    amount: Number(row.payment_amount) || 0,
    status: (row.payment_status as Payment['status']) || 'pending',
  }
  const discount = parseDiscount(row.payment_discount)
  if (discount) payment.discount = discount
  if (row.payment_net !== undefined && row.payment_net !== null && row.payment_net !== '') {
    const net = Number(row.payment_net)
    if (Number.isFinite(net) && net !== 0) payment.listNetPaid = net
  }
  const txCount = Number(row.payment_tx_count)
  if (Number.isFinite(txCount) && txCount > 0) payment.listTxCount = txCount
  const lastAmount = Number(row.payment_last_amount)
  if (Number.isFinite(lastAmount) && lastAmount > 0) {
    const type =
      row.payment_last_type === 'refund' || row.payment_last_type === 'adjustment'
        ? row.payment_last_type
        : 'payment'
    payment.listLastTransaction = {
      amount: lastAmount,
      type: type as PaymentTransactionType,
      recordedAt: row.payment_last_at || row.updated_at,
      method: row.payment_last_method ? (row.payment_last_method as PaymentMethod) : undefined,
    }
    if (row.payment_last_method) {
      payment.method = row.payment_last_method
    }
  }
  return payment
}

/** Lightweight booking for tables, dashboard, and guests - full payload loaded on demand. */
export const bookingFromListRow = (row: BookingListRow): Booking => {
  const rooms = parseRooms(row.rooms)
  const adults = Number(row.adults) || 0
  const children = Number(row.children) || 0
  const totalGuests = Number(row.total_guests) || adults + children

  return {
    id: row.id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    status: row.status as Booking['status'],
    name: row.guest_name || 'Guest',
    email: row.guest_email ?? '',
    phone: row.guest_phone ?? '',
    roomType: row.room_type || rooms?.[0]?.roomType || '',
    roomName: row.room_name || rooms?.[0]?.roomName || '',
    rooms,
    adults,
    children,
    totalGuests,
    specialRequests: row.special_requests ?? '',
    notes: [],
    payment: buildPayment(row),
    listExtrasTotal: Number(row.extras_total) || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
