import { describe, expect, it } from 'vitest'
import { computeBookingFinancials, type Booking } from '../bookings'

const booking = (payment: Booking['payment']): Booking =>
  ({
    id: 'CHK-1',
    checkIn: '2026-10-11',
    checkOut: '2026-10-12',
    adults: 2,
    children: 0,
    totalGuests: 2,
    roomType: 'deluxe',
    roomName: 'Deluxe',
    name: 'Guest',
    email: '',
    phone: '',
    specialRequests: '',
    status: 'confirmed',
    notes: [],
    payment,
    createdAt: '2026-10-10T00:00:00Z',
    updatedAt: '2026-10-10T00:00:00Z',
  }) as Booking

describe('booking payment status', () => {
  it('a fully discounted stay is paid, with nothing outstanding', () => {
    const fin = computeBookingFinancials(booking({ amount: 4000, status: 'pending', transactions: [], discount: { type: 'amount', value: 4000 } }))
    expect(fin.status).toBe('paid')
    expect(fin.outstanding).toBe(0)
  })

  it('a 100% discount is paid too', () => {
    const fin = computeBookingFinancials(booking({ amount: 4000, status: 'pending', transactions: [], discount: { type: 'percent', value: 100 } }))
    expect(fin.status).toBe('paid')
  })

  it('a booking with no price set yet stays pending', () => {
    expect(computeBookingFinancials(booking({ amount: 0, status: 'pending', transactions: [] })).status).toBe('pending')
  })

  it('a partly discounted unpaid stay stays pending', () => {
    const fin = computeBookingFinancials(booking({ amount: 4000, status: 'pending', transactions: [], discount: { type: 'amount', value: 1000 } }))
    expect(fin.status).toBe('pending')
    expect(fin.outstanding).toBe(3000)
  })
})
