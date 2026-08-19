import { calculateBookingTotal } from './bookingHelpers'
import { generateBookingId } from './bookingId'
import { getTodayDate, resolveBookingCreatedAt } from './dates'
import { areRoomsAvailableForBooking } from './rooms'
import {
  applyBookingToCache,
  BookingDuplicateIdError,
  ensureBookingDetail,
  ensureBookingsHydrated,
  getBookingsCache,
  persistBooking,
  removeBooking,
} from '../lib/bookingsStore'
import { checkoutPastConfirmedBookingsRemote, updateBookingStatusRemote } from '../lib/bookingsDb'
import { invalidateAvailabilityCache } from '../lib/availabilityCache'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import { notifyAdminOfManagerAction } from '../lib/adminNotifications'
import { canDeleteRecords, canEditPricing } from '../lib/permissions'

export { ensureBookingsHydrated }

export interface BookingNote {
  id: string
  note: string
  createdBy: string
  createdAt: string
}

export type PaymentMethod =
  | 'cash'
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'bank-transfer'
  | 'card'
  | 'other'

export type PaymentTransactionType = 'payment' | 'refund' | 'adjustment'

export interface PaymentTransaction {
  id: string
  type: PaymentTransactionType
  amount: number
  method?: PaymentMethod
  reference?: string
  notes?: string
  recordedBy?: string
  recordedAt: string
}

export type DiscountType = 'amount' | 'percent'

export interface BookingDiscount {
  type: DiscountType
  value: number
  reason?: string
}

export interface Payment {
  amount: number
  status: 'pending' | 'partial' | 'paid' | 'refunded'
  method?: string
  transactionId?: string
  paidAt?: string
  notes?: string
  transactions?: PaymentTransaction[]
  discount?: BookingDiscount
  /**
   * Net collected (payments − refunds) from the admin list view.
   * Used only when full transaction lines are not loaded. Never persist this.
   */
  listNetPaid?: number
  listTxCount?: number
  listLastTransaction?: Pick<PaymentTransaction, 'amount' | 'type' | 'recordedAt'> & {
    method?: PaymentMethod
  }
}

export const computeDiscountAmount = (
  subtotal: number,
  discount?: BookingDiscount | null
): number => {
  if (!discount || !discount.value || discount.value <= 0) return 0
  const base = Math.max(0, subtotal)
  if (discount.type === 'percent') {
    const pct = Math.min(100, Math.max(0, discount.value))
    return Math.round((base * pct) / 100)
  }
  return Math.min(base, Math.max(0, discount.value))
}

export interface BookingRoomLine {
  roomType: string
  roomName: string
  adults: number
  children: number
  totalGuests: number
}

export type GuestIdType = 'nid' | 'passport' | 'driving-license' | 'birth-certificate' | 'other'

export interface GuestRecord {
  name?: string
  idType?: GuestIdType
  idNumber?: string
  idIssuedBy?: string
  nationality?: string
  address?: string
  city?: string
  country?: string
}

export interface EmergencyContact {
  name?: string
  phone?: string
  relation?: string
}

/** @deprecated use Booking.guests / emergencyContact / adminNotes - kept for migration */
export interface GuestDetails {
  idType?: GuestIdType
  idNumber?: string
  idIssuedBy?: string
  nationality?: string
  address?: string
  city?: string
  country?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
  adminNotes?: string
}

export type ExtraChargeCategory = 'food' | 'other'
export type FoodMeal = 'breakfast' | 'lunch' | 'dinner'

export const FOOD_MEALS: FoodMeal[] = ['breakfast', 'lunch', 'dinner']
export const FOOD_MEAL_LABELS: Record<FoodMeal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
}

export interface ExtraCharge {
  id: string
  category: ExtraChargeCategory
  name: string
  amount: number
  quantity: number
  unitPrice?: number
  roomName?: string
  menuItemId?: string
  meal?: FoodMeal
  recordedAt: string
  recordedBy?: string
}

export const extraLineTotal = (extra: ExtraCharge): number => Math.round(Number(extra.amount) || 0)

export const sumExtras = (
  extras: ExtraCharge[] | undefined,
  category?: ExtraChargeCategory
): number =>
  (extras ?? [])
    .filter((extra) => !category || extra.category === category)
    .reduce((sum, extra) => sum + extraLineTotal(extra), 0)

export interface Booking {
  id: string
  checkIn: string
  checkOut: string
  /** Discrete event dates for conference bookings (YYYY-MM-DD). */
  eventDates?: string[]
  adults: number
  children: number
  totalGuests: number
  roomType: string
  roomName: string
  rooms?: BookingRoomLine[]
  name: string
  email: string
  phone: string
  expectedArrivalTime?: string
  eventTimeline?: string
  specialRequests: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'checked-out'
  guests?: GuestRecord[]
  emergencyContact?: EmergencyContact
  adminNotes?: string
  /** @deprecated retained for backward compatibility with older bookings */
  guestDetails?: GuestDetails
  notes: BookingNote[]
  payment: Payment
  extras?: ExtraCharge[]
  /** List-row extra charges total when full extras are not loaded. Never persist. */
  listExtrasTotal?: number
  createdAt: string
  updatedAt: string
}

/** Cancelled bookings are excluded from revenue and financial reports. */
export const countsTowardRevenue = (booking: Pick<Booking, 'status'>): boolean =>
  booking.status !== 'cancelled'

const buildRoomNameSummary = (roomNames: string[]): string => {
  if (roomNames.length === 0) return ''
  if (roomNames.length === 1) return roomNames[0]
  return `${roomNames.length} rooms (${roomNames.join(', ')})`
}

const BLOCKING_INVENTORY_STATUSES: Booking['status'][] = ['pending', 'confirmed']

const bookingHoldsInventory = (status: Booking['status']): boolean =>
  BLOCKING_INVENTORY_STATUSES.includes(status)

const assertBookingInventory = async (
  booking: Booking,
  excludeBookingId: string
): Promise<boolean> => {
  if (!bookingHoldsInventory(booking.status)) return true

  const lines = getBookingRooms(booking).filter((line) => line.roomType)
  if (lines.length === 0) return true

  const roomTypes = lines.map((line) => line.roomType)
  return areRoomsAvailableForBooking(booking.checkIn, booking.checkOut, roomTypes, {
    excludeBookingId,
    lines: lines.map((line) => ({
      roomType: line.roomType,
      adults: line.adults ?? 1,
      children: line.children ?? 0,
    })),
    conferenceEventDates: booking.eventDates,
  })
}

export const getBookingRooms = (booking: Booking): BookingRoomLine[] => {
  if (booking.rooms && booking.rooms.length > 0) return booking.rooms

  if (!booking.roomType) return []

  return [
    {
      roomType: booking.roomType,
      roomName: booking.roomName,
      adults: booking.adults,
      children: booking.children,
      totalGuests: booking.totalGuests,
    },
  ]
}

export const bookingHasRoomType = (booking: Booking, roomType: string): boolean =>
  getBookingRooms(booking).some((room) => room.roomType === roomType)

type SaveBookingInput = {
  checkIn: string
  checkOut: string
  eventDates?: string[]
  name: string
  email: string
  phone: string
  expectedArrivalTime?: string
  eventTimeline?: string
  specialRequests: string
} & (
  | {
      rooms: BookingRoomLine[]
    }
  | {
      adults: number
      children: number
      totalGuests: number
      roomType: string
      roomName: string
    }
)

const normalizeBookingInput = (
  input: SaveBookingInput
): Pick<
  Booking,
  | 'checkIn'
  | 'checkOut'
  | 'eventDates'
  | 'adults'
  | 'children'
  | 'totalGuests'
  | 'roomType'
  | 'roomName'
  | 'rooms'
  | 'name'
  | 'email'
  | 'phone'
  | 'expectedArrivalTime'
  | 'eventTimeline'
  | 'specialRequests'
> => {
  if ('rooms' in input) {
    const rooms = input.rooms
    return {
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      eventDates: input.eventDates?.length ? input.eventDates : undefined,
      name: input.name,
      email: input.email,
      phone: input.phone,
      expectedArrivalTime: input.expectedArrivalTime || undefined,
      eventTimeline: input.eventTimeline || undefined,
      specialRequests: input.specialRequests,
      rooms,
      adults: rooms.reduce((sum, room) => sum + room.adults, 0),
      children: rooms.reduce((sum, room) => sum + room.children, 0),
      totalGuests: rooms.reduce((sum, room) => sum + room.totalGuests, 0),
      roomType: rooms[0]?.roomType ?? '',
      roomName: buildRoomNameSummary(rooms.map((room) => room.roomName)),
    }
  }

  return {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    eventDates: input.eventDates?.length ? input.eventDates : undefined,
    name: input.name,
    email: input.email,
    phone: input.phone,
    expectedArrivalTime: input.expectedArrivalTime || undefined,
    eventTimeline: input.eventTimeline || undefined,
    specialRequests: input.specialRequests,
    adults: input.adults,
    children: input.children,
    totalGuests: input.totalGuests,
    roomType: input.roomType,
    roomName: input.roomName,
    rooms: [
      {
        roomType: input.roomType,
        roomName: input.roomName,
        adults: input.adults,
        children: input.children,
        totalGuests: input.totalGuests,
      },
    ],
  }
}

export const getBookings = (): Booking[] => getBookingsCache()

export const saveBooking = async (booking: SaveBookingInput): Promise<Booking> => {
  const normalized = normalizeBookingInput(booking)
  const derivedTotal = calculateBookingTotal(normalized)

  for (let attempt = 0; attempt < 25; attempt++) {
    const createdAt = resolveBookingCreatedAt(normalized.checkIn, normalized.eventDates)
    const newBooking: Booking = {
      ...normalized,
      id: generateBookingId(getBookings().map((b) => b.id)),
      status: 'pending',
      notes: [],
      payment: {
        amount: derivedTotal,
        status: 'pending',
      },
      createdAt,
      updatedAt: createdAt,
    }

    try {
      await persistBooking(newBooking)
      void import('../lib/bookingEmails').then((m) => m.sendBookingCreatedEmails(newBooking))
      void notifyAdminOfManagerAction({
        category: 'booking',
        action: 'booking.created',
        title: 'New booking',
        message: `${newBooking.name} · ${newBooking.roomName || 'rooms'} · ${newBooking.checkIn} → ${newBooking.checkOut}`,
        entityId: newBooking.id,
      })
      return newBooking
    } catch (error) {
      if (error instanceof BookingDuplicateIdError && attempt < 24) continue
      throw error
    }
  }

  throw new Error('Could not generate a unique booking ID')
}

export const updateBookingStatus = async (
  id: string,
  status: Booking['status']
): Promise<Booking | null> => {
  const existing = getBookings().find((b) => b.id === id)
  if (!existing) return null

  const base = (await ensureBookingDetail(id)) ?? existing
  const updated: Booking = {
    ...base,
    status,
    updatedAt: new Date().toISOString(),
  }

  if (bookingHoldsInventory(updated.status)) {
    const inventoryOk = await assertBookingInventory(updated, id)
    if (!inventoryOk) return null
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabase()
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    if (session?.user) {
      const result = await updateBookingStatusRemote(id, status)
      if (!result.ok) return null

      const merged: Booking = {
        ...(result.payload as Booking),
        status,
        updatedAt: new Date().toISOString(),
      }
      applyBookingToCache(merged)
      invalidateAvailabilityCache()
      void notifyAdminOfManagerAction({
        category: 'booking',
        action: 'booking.status',
        title: 'Booking status updated',
        message: `${merged.name} is now ${status}`,
        entityId: id,
      })
      return merged
    }
  }

  await persistBooking(updated)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.status',
    title: 'Booking status updated',
    message: `${updated.name} is now ${status}`,
    entityId: id,
  })
  return updated
}

export const deleteBooking = async (id: string): Promise<boolean> => {
  if (!canDeleteRecords()) return false
  const bookings = getBookings()
  const booking = bookings.find((b) => b.id === id)
  if (!booking) return false
  await removeBooking(id)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.deleted',
    title: 'Booking deleted',
    message: `${booking.name} · ${booking.checkIn} → ${booking.checkOut}`,
    entityId: id,
  })
  return true
}

export const getBookingById = (id: string): Booking | null => {
  const bookings = getBookings()
  return bookings.find((b) => b.id === id) || null
}

export const getBookingsByStatus = (status: Booking['status']): Booking[] => {
  return getBookings().filter((b) => b.status === status)
}

export const getBookingsByDateRange = (startDate: string, endDate: string): Booking[] => {
  return getBookings().filter((b) => {
    return b.checkIn >= startDate && b.checkIn <= endDate
  })
}

export const addBookingNote = async (
  id: string,
  note: string,
  createdBy: string
): Promise<Booking | null> => {
  const bookings = getBookings()
  const index = bookings.findIndex((b) => b.id === id)
  if (index === -1) return null

  const newNote: BookingNote = {
    id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    note,
    createdBy,
    createdAt: new Date().toISOString(),
  }

  const updated: Booking = {
    ...bookings[index],
    notes: [...(bookings[index].notes || []), newNote],
    updatedAt: new Date().toISOString(),
  }
  await persistBooking(updated)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.note',
    title: 'Booking note added',
    message: `${bookings[index].name}: ${note.slice(0, 120)}${note.length > 120 ? '…' : ''}`,
    entityId: id,
  })
  return updated
}

export const updateBookingPayment = async (
  id: string,
  payment: Partial<Payment>
): Promise<Booking | null> => {
  const bookings = getBookings()
  const index = bookings.findIndex((b) => b.id === id)
  if (index === -1) return null

  const updated: Booking = {
    ...bookings[index],
    payment: {
      ...bookings[index].payment,
      ...payment,
    },
    updatedAt: new Date().toISOString(),
  }
  await persistBooking(updated)
  return updated
}

export interface BookingFinancials {
  roomRent: number
  extrasTotal: number
  foodTotal: number
  otherTotal: number
  subtotal: number
  discount: number
  total: number
  paid: number
  refunded: number
  outstanding: number
  status: Payment['status']
  lastPaymentAt?: string
}

export const computeBookingFinancials = (booking: Booking): BookingFinancials => {
  const txs = booking.payment?.transactions ?? []
  const money = (n: number) => Math.round(Number(n) || 0)

  let paid = money(
    txs
      .filter((t) => t.type === 'payment' || t.type === 'adjustment')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  )
  let refunded = money(
    txs
      .filter((t) => t.type === 'refund')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0)
  )
  const roomRent = money(Number(booking.payment?.amount) || 0)
  const extras = booking.extras ?? []
  const foodTotal = money(sumExtras(extras, 'food'))
  const otherTotal = money(sumExtras(extras, 'other'))
  const extrasTotal =
    extras.length > 0 ? money(foodTotal + otherTotal) : money(Number(booking.listExtrasTotal) || 0)
  const discount = money(computeDiscountAmount(roomRent, booking.payment?.discount))
  const total = Math.max(0, roomRent - discount + extrasTotal)
  let net = paid - refunded

  // List stubs omit transaction lines. Without this, a paid booking looks fully outstanding
  // until the full payload is fetched (reports, filters, dashboard).
  if (txs.length === 0) {
    const listNet = booking.payment?.listNetPaid
    const stored = booking.payment?.status
    const hasListNet = typeof listNet === 'number' && Number.isFinite(listNet) && listNet !== 0
    if (hasListNet) {
      net = money(listNet)
      if (net >= 0) {
        paid = net
        refunded = 0
      } else {
        paid = 0
        refunded = Math.abs(net)
      }
    } else if (stored === 'paid' && total > 0) {
      net = total
      paid = total
    } else if (stored === 'refunded') {
      refunded = Math.max(refunded, total)
      net = paid - refunded
    }
  }

  const outstanding = Math.max(0, total - net)
  let status: Payment['status'] = booking.payment?.status ?? 'pending'
  if (total === 0 && net === 0) status = 'pending'
  else if (refunded > 0 && net <= 0) status = 'refunded'
  else if (total > 0 && net >= total) status = 'paid'
  else if (net > 0) status = 'partial'
  else status = 'pending'

  const sortedTxs = [...txs].sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1))
  return {
    roomRent,
    extrasTotal,
    foodTotal,
    otherTotal,
    subtotal: roomRent,
    discount,
    total,
    paid: net,
    refunded,
    outstanding,
    status,
    lastPaymentAt: sortedTxs.find((t) => t.type !== 'refund')?.recordedAt,
  }
}

/** Rebuild a ledger line when the booking is paid/refunded but transaction rows were lost. */
export const inferredLedgerFromPaymentStatus = (booking: Booking): PaymentTransaction[] => {
  const existing = booking.payment?.transactions ?? []
  if (existing.length > 0) return existing

  const fin = computeBookingFinancials(booking)
  if (fin.paid <= 0 && fin.refunded <= 0) return []

  const recordedAt =
    booking.payment?.paidAt || booking.updatedAt || booking.createdAt || new Date().toISOString()
  const method = (booking.payment?.method as PaymentMethod | undefined) ?? undefined

  if (fin.refunded > 0 && fin.paid <= 0) {
    return [
      {
        id: `restored-refund-${booking.id}`,
        type: 'refund',
        amount: fin.refunded,
        method,
        recordedAt,
        recordedBy: 'System',
        notes: 'Restored from booking payment status',
      },
    ]
  }

  return [
    {
      id: `restored-payment-${booking.id}`,
      type: 'payment',
      amount: fin.paid,
      method,
      recordedAt,
      recordedBy: 'System',
      notes: 'Restored from paid balance',
    },
  ]
}

export type BookingCashMovement = {
  amount: number
  isRefund: boolean
  recordedAt: string
  method?: PaymentMethod
}

/** Cash in/out for reports. Uses transaction lines when loaded; otherwise list-summary net paid. */
export const getBookingCashMovements = (booking: Booking): BookingCashMovement[] => {
  const txs = booking.payment?.transactions ?? []
  if (txs.length > 0) {
    return txs
      .filter((tx) => tx.type === 'payment' || tx.type === 'refund' || tx.type === 'adjustment')
      .map((tx) => ({
        amount: Math.abs(Number(tx.amount) || 0),
        isRefund: tx.type === 'refund',
        recordedAt: tx.recordedAt,
        method: tx.method,
      }))
  }

  const fin = computeBookingFinancials(booking)
  const recordedAt =
    booking.payment?.paidAt || booking.updatedAt || booking.createdAt || new Date().toISOString()
  const method = (booking.payment?.method as PaymentMethod | undefined) ?? undefined

  if (fin.refunded > 0 && fin.paid <= 0) {
    return [{ amount: fin.refunded, isRefund: true, recordedAt, method }]
  }
  if (fin.paid > 0) {
    return [{ amount: fin.paid, isRefund: false, recordedAt, method }]
  }
  return []
}

const recomputePaymentStatus = (booking: Booking): Booking => {
  const fin = computeBookingFinancials(booking)
  return {
    ...booking,
    payment: {
      ...booking.payment,
      status: fin.status,
      paidAt: fin.lastPaymentAt ?? booking.payment?.paidAt,
    },
  }
}

export const setBookingTotalAmount = async (
  id: string,
  amount: number
): Promise<Booking | null> => {
  if (!canEditPricing()) return null

  const bookings = getBookings()
  const index = bookings.findIndex((b) => b.id === id)
  if (index === -1) return null

  const bookingRef = bookings[index]
  const next: Booking = recomputePaymentStatus({
    ...bookingRef,
    payment: { ...bookingRef.payment, amount: Math.max(0, Number(amount) || 0) },
    updatedAt: new Date().toISOString(),
  })
  await persistBooking(next)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.total_updated',
    title: 'Booking total updated',
    message: `${bookingRef.name}: total set to ৳${Math.max(0, Number(amount) || 0)}`,
    entityId: id,
  })
  return next
}

export const setBookingDiscount = async (
  id: string,
  discount: BookingDiscount | null
): Promise<Booking | null> => {
  if (!discount && !canDeleteRecords()) return null

  const bookings = getBookings()
  const index = bookings.findIndex((b) => b.id === id)
  if (index === -1) return null

  const cleanDiscount: BookingDiscount | undefined =
    discount && discount.value > 0
      ? {
          type: discount.type,
          value: Math.max(0, Number(discount.value) || 0),
          reason: discount.reason?.trim() || undefined,
        }
      : undefined

  const bookingRef = bookings[index]

  const nextPayment = { ...bookingRef.payment }
  if (cleanDiscount) {
    nextPayment.discount = cleanDiscount
  } else {
    delete nextPayment.discount
  }

  const next: Booking = recomputePaymentStatus({
    ...bookings[index],
    payment: nextPayment,
    updatedAt: new Date().toISOString(),
  })
  await persistBooking(next)
  const label = cleanDiscount
    ? `${cleanDiscount.type === 'percent' ? `${cleanDiscount.value}%` : `৳${cleanDiscount.value}`} discount`
    : 'discount removed'
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: cleanDiscount ? 'booking.discount' : 'booking.discount_removed',
    title: cleanDiscount ? 'Discount applied' : 'Discount removed',
    message: `${bookingRef.name}: ${label}${cleanDiscount?.reason ? ` - ${cleanDiscount.reason}` : ''}`,
    entityId: id,
  })
  return next
}

export type ExtraChargeInput = {
  category: ExtraChargeCategory
  name: string
  amount: number
  quantity?: number
  unitPrice?: number
  roomName?: string
  menuItemId?: string
  meal?: FoodMeal
  recordedBy?: string
}

export const addBookingExtras = async (
  id: string,
  inputs: ExtraChargeInput[]
): Promise<Booking | null> => {
  const existing = getBookings().find((b) => b.id === id)
  if (!existing) return null
  const bookingRef = (await ensureBookingDetail(id)) ?? existing
  const stamp = Date.now()
  const extras: ExtraCharge[] = []

  for (const [index, input] of inputs.entries()) {
    const quantity = Math.max(1, Math.round(Number(input.quantity) || 1))
    const unitPrice = Math.max(0, Math.round(Number(input.unitPrice ?? input.amount) || 0))
    const amount = Math.max(0, Math.round(Number(input.amount) || unitPrice * quantity))
    if (!input.name.trim() || amount <= 0) continue
    extras.push({
      id: `xtr-${stamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      category: input.category,
      name: input.name.trim(),
      amount,
      quantity,
      unitPrice,
      roomName: input.roomName?.trim() || undefined,
      menuItemId: input.menuItemId,
      meal: input.category === 'food' ? input.meal : undefined,
      recordedAt: new Date().toISOString(),
      recordedBy: input.recordedBy?.trim() || 'Staff',
    })
  }

  if (extras.length === 0) return null

  const next: Booking = recomputePaymentStatus({
    ...bookingRef,
    extras: [...(bookingRef.extras ?? []), ...extras],
    updatedAt: new Date().toISOString(),
  })
  await persistBooking(next)
  const foodCount = extras.filter((extra) => extra.category === 'food').length
  const mealLabel =
    extras[0]?.meal && extras.every((extra) => extra.meal === extras[0].meal)
      ? FOOD_MEAL_LABELS[extras[0].meal]
      : undefined
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.extra_added',
    title: foodCount === extras.length ? 'Food billed to room' : 'Extra charge added',
    message: `${bookingRef.name}: ${extras.length} item${extras.length === 1 ? '' : 's'} · ${extras.reduce((sum, extra) => sum + extra.amount, 0)} BDT${mealLabel ? ` · ${mealLabel}` : ''}`,
    entityId: id,
  })
  return next
}

export const addBookingExtra = async (
  id: string,
  input: ExtraChargeInput
): Promise<Booking | null> => addBookingExtras(id, [input])

export const removeBookingExtra = async (
  bookingId: string,
  extraId: string
): Promise<Booking | null> => {
  const existing = getBookings().find((b) => b.id === bookingId)
  if (!existing) return null
  const bookingRef = (await ensureBookingDetail(bookingId)) ?? existing
  const remaining = (bookingRef.extras ?? []).filter((extra) => extra.id !== extraId)
  if (remaining.length === (bookingRef.extras ?? []).length) return bookingRef

  const next: Booking = recomputePaymentStatus({
    ...bookingRef,
    extras: remaining,
    updatedAt: new Date().toISOString(),
  })
  await persistBooking(next)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.extra_removed',
    title: 'Extra charge removed',
    message: `${bookingRef.name}: extra charge deleted`,
    entityId: bookingId,
  })
  return next
}

export interface RecordPaymentInput {
  type: PaymentTransactionType
  amount: number
  method?: PaymentMethod
  reference?: string
  notes?: string
  recordedBy?: string
  recordedAt?: string
}

export const recordPaymentTransaction = async (
  id: string,
  input: RecordPaymentInput
): Promise<Booking | null> => {
  const bookings = getBookings()
  const existing = bookings.find((b) => b.id === id)
  if (!existing) return null
  const bookingRef = (await ensureBookingDetail(id)) ?? existing
  const index = getBookings().findIndex((b) => b.id === id)
  if (index === -1) return null

  const tx: PaymentTransaction = {
    id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: input.type,
    amount: Math.abs(Number(input.amount) || 0),
    method: input.method,
    reference: input.reference?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    recordedBy: input.recordedBy?.trim() || 'Admin',
    recordedAt: input.recordedAt ?? new Date().toISOString(),
  }

  const existingTxs = bookingRef.payment?.transactions ?? []
  const next: Booking = recomputePaymentStatus({
    ...bookingRef,
    payment: {
      ...bookingRef.payment,
      transactions: [...existingTxs, tx],
    },
    updatedAt: new Date().toISOString(),
  })
  await persistBooking(next)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.payment',
    title: 'Payment activity',
    message: `${bookingRef.name}: ${tx.type} ${tx.amount} BDT${tx.method ? ` via ${tx.method}` : ''}`,
    entityId: id,
  })
  return next
}

export const backfillMissingPaymentTransactions = async (id: string): Promise<Booking | null> => {
  const existing = getBookings().find((b) => b.id === id)
  if (!existing) return null
  const full = (await ensureBookingDetail(id)) ?? existing
  if ((full.payment?.transactions ?? []).length > 0) return full
  const inferred = inferredLedgerFromPaymentStatus(full)
  if (inferred.length === 0) return full
  const next: Booking = recomputePaymentStatus({
    ...full,
    payment: {
      ...full.payment,
      transactions: inferred,
    },
    updatedAt: new Date().toISOString(),
  })
  await persistBooking(next)
  return next
}

export const deletePaymentTransaction = async (
  bookingId: string,
  transactionId: string
): Promise<Booking | null> => {
  if (!canDeleteRecords()) return null
  const bookings = getBookings()
  const index = bookings.findIndex((b) => b.id === bookingId)
  if (index === -1) return null

  const remaining = (bookings[index].payment?.transactions ?? []).filter(
    (t) => t.id !== transactionId
  )
  const next: Booking = recomputePaymentStatus({
    ...bookings[index],
    payment: { ...bookings[index].payment, transactions: remaining },
    updatedAt: new Date().toISOString(),
  })
  await persistBooking(next)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.payment_deleted',
    title: 'Payment entry removed',
    message: `${bookings[index].name}: payment transaction deleted`,
    entityId: bookingId,
  })
  return next
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
  'bank-transfer': 'Bank transfer',
  card: 'Card',
  other: 'Other',
}

export const updateBooking = async (
  id: string,
  updates: Partial<Booking>
): Promise<Booking | null> => {
  const existing = getBookings().find((b) => b.id === id)
  if (!existing) return null

  const base = (await ensureBookingDetail(id)) ?? existing
  const updated: Booking = {
    ...base,
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  if (bookingHoldsInventory(updated.status)) {
    const inventoryOk = await assertBookingInventory(updated, id)
    if (!inventoryOk) return null
  }

  await persistBooking(updated)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.updated',
    title: 'Booking updated',
    message: `${updated.name} - reservation details changed`,
    entityId: id,
  })
  return updated
}

export interface BookingGuestInfoUpdate {
  guests?: GuestRecord[]
  emergencyContact?: EmergencyContact
  adminNotes?: string
}

export const updateBookingGuestInfo = async (
  id: string,
  update: BookingGuestInfoUpdate
): Promise<Booking | null> => {
  const bookings = getBookings()
  const index = bookings.findIndex((b) => b.id === id)
  if (index === -1) return null

  const updated: Booking = {
    ...bookings[index],
    ...(update.guests !== undefined && { guests: update.guests }),
    ...(update.emergencyContact !== undefined && { emergencyContact: update.emergencyContact }),
    ...(update.adminNotes !== undefined && { adminNotes: update.adminNotes }),
    updatedAt: new Date().toISOString(),
  }
  await persistBooking(updated)
  void notifyAdminOfManagerAction({
    category: 'booking',
    action: 'booking.guest_info',
    title: 'Guest details updated',
    message: `${updated.name} - guest IDs, emergency contact, or admin notes changed`,
    entityId: id,
  })
  return updated
}

/**
 * Migrate the legacy single-record `guestDetails` shape into the new structured
 * fields so the admin UI can keep editing existing bookings without data loss.
 */
export const getBookingGuestInfo = (booking: Booking): {
  guests: GuestRecord[]
  emergencyContact: EmergencyContact
  adminNotes: string
} => {
  const legacy = booking.guestDetails
  const guests = booking.guests ?? (legacy
    ? [{
        name: booking.name,
        idType: legacy.idType,
        idNumber: legacy.idNumber,
        idIssuedBy: legacy.idIssuedBy,
        nationality: legacy.nationality,
        address: legacy.address,
        city: legacy.city,
        country: legacy.country,
      }]
    : [])

  const emergencyContact = booking.emergencyContact ?? (legacy
    ? {
        name: legacy.emergencyContactName,
        phone: legacy.emergencyContactPhone,
        relation: legacy.emergencyContactRelation,
      }
    : {})

  const adminNotes = booking.adminNotes ?? legacy?.adminNotes ?? ''

  return { guests, emergencyContact, adminNotes }
}

/** Automatically update bookings to checked-out when checkout date passes. */
export const autoUpdateCheckedOutBookings = async (): Promise<Booking[]> => {
  const todayIso = getTodayDate()

  if (isSupabaseConfigured()) {
    const supabase = getSupabase()
    const session = supabase ? (await supabase.auth.getSession()).data.session : null
    if (session?.user) {
      await checkoutPastConfirmedBookingsRemote()
      return getBookings()
    }
  }

  const bookings = getBookings()
  const toCheckout = bookings.filter(
    (b) => b.status === 'confirmed' && b.checkOut < todayIso
  )

  for (const stub of toCheckout) {
    const full = (await ensureBookingDetail(stub.id)) ?? stub
    if (full.status !== 'confirmed' || full.checkOut >= todayIso) continue

    const checkedOut: Booking = {
      ...full,
      status: 'checked-out',
      updatedAt: new Date().toISOString(),
    }
    await persistBooking(checkedOut)
  }

  return getBookings()
}

