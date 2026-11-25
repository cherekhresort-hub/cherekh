import { describe, expect, it } from 'vitest'
import { formatBookingHoldDates, describeAvailabilityIssues } from '../roomAvailabilityMessage'
import type { Booking } from '../../../utils/bookings'

const booking = (overrides: Partial<Booking>): Booking => ({
  id: 'CC-836446',
  checkIn: '2026-11-14',
  checkOut: '2026-11-16',
  adults: 2,
  children: 0,
  totalGuests: 2,
  roomType: '206',
  roomName: 'Room 206',
  name: 'Prince mahmud',
  email: '',
  phone: '',
  specialRequests: '',
  status: 'confirmed',
  notes: [],
  payment: { amount: 0, status: 'pending' },
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...overrides,
})

describe('formatBookingHoldDates', () => {
  it('shows the stay range for guest rooms', () => {
    expect(formatBookingHoldDates(booking({}))).toBe('14 Nov 2026 – 16 Nov 2026')
  })

  it('shows conference event dates when present', () => {
    expect(
      formatBookingHoldDates(
        booking({
          roomType: 'conference',
          roomName: 'Conference Room',
          eventDates: ['2026-11-20', '2026-11-18'],
        })
      )
    ).toBe('18 Nov 2026, 20 Nov 2026')
  })
})

describe('describeAvailabilityIssues', () => {
  it('falls back when the conflicting booking is not in the local cache', () => {
    expect(
      describeAvailabilityIssues([
        { roomType: '206', reason: 'booked', conflictingBookingIds: ['CC-836446'] },
      ])
    ).toBe('Room 206 is already booked by #836446.')
  })

  it('uses selected-dates wording when there are no conflicting ids', () => {
    expect(
      describeAvailabilityIssues([{ roomType: '206', reason: 'booked', conflictingBookingIds: [] }])
    ).toBe('Room 206 is not available for the selected dates.')
  })

  it('explains renovation / out-of-service rooms', () => {
    expect(
      describeAvailabilityIssues([{ roomType: '206', reason: 'unavailable', conflictingBookingIds: [] }])
    ).toBe('Room 206 is offline for renovation or maintenance and cannot be booked.')
  })
})
