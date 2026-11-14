import { describe, expect, it } from 'vitest'
import { bookingFromListRow, type BookingListRow } from '../bookingList'
import { toPersistedBooking } from '../bookingsDb'
import { bookingGuestHidden, bookingMoneyHidden } from '../../utils/bookings'
import { matchesPaymentFilter } from '../../admin/utils/bookingFilters'

const row = (overrides: Partial<BookingListRow> = {}): BookingListRow => ({
  id: 'B1',
  status: 'confirmed',
  check_in: '2026-10-20',
  check_out: '2026-10-22',
  guest_email: null,
  guest_phone: null,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  guest_name: 'Guest',
  room_name: '101',
  room_type: 'deluxe',
  adults: 2,
  children: 0,
  total_guests: 2,
  rooms: [],
  special_requests: '',
  payment_amount: 5000,
  payment_status: 'pending',
  payment_discount: null,
  ...overrides,
})

describe('payment hidden from booking officers', () => {
  it('marks rows the server blanked', () => {
    const hidden = bookingFromListRow(
      row({ payment_hidden: true, payment_amount: null as unknown as number, payment_status: null as unknown as string })
    )
    expect(bookingMoneyHidden(hidden)).toBe(true)
    expect(hidden.payment.amount).toBe(0)
    expect(bookingMoneyHidden(bookingFromListRow(row({ payment_hidden: false })))).toBe(false)
    expect(bookingMoneyHidden(bookingFromListRow(row()))).toBe(false)
  })

  it('marks rows whose guest details the server withheld', () => {
    const hidden = bookingFromListRow(
      row({ guest_hidden: true, guest_name: 'Hidden guest', guest_email: null, guest_phone: null })
    )
    expect(bookingGuestHidden(hidden)).toBe(true)
    expect(hidden.name).toBe('Hidden guest')
    expect(hidden.phone).toBe('')
    expect(bookingGuestHidden(bookingFromListRow(row()))).toBe(false)
  })

  it('never persists the hidden flags', () => {
    const persisted = toPersistedBooking(
      bookingFromListRow(row({ payment_hidden: true, guest_hidden: true }))
    )
    expect(persisted).not.toHaveProperty('paymentHidden')
    expect(persisted).not.toHaveProperty('guestHidden')
  })

  it('leaves hidden bookings out of payment filters', () => {
    const hidden = bookingFromListRow(row({ payment_hidden: true, payment_amount: 0 }))
    expect(matchesPaymentFilter(hidden, 'all')).toBe(true)
    expect(matchesPaymentFilter(hidden, 'pending')).toBe(false)
    expect(matchesPaymentFilter(hidden, 'outstanding')).toBe(false)
  })
})
