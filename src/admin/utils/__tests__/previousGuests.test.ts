import { describe, expect, it } from 'vitest'
import { findPreviousGuests, phoneDigits } from '../previousGuests'
import type { Booking } from '../../../utils/bookings'

const booking = (overrides: Partial<Booking>): Booking => ({
  id: 'B',
  checkIn: '2026-10-20',
  checkOut: '2026-10-22',
  adults: 2,
  children: 0,
  totalGuests: 2,
  roomType: 'deluxe',
  roomName: '205',
  name: 'Guest',
  email: '',
  phone: '',
  specialRequests: '',
  status: 'checked-out',
  notes: [],
  payment: { amount: 0, status: 'pending' },
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
})

const bookings = [
  booking({ id: '1', name: 'Rahim', email: 'old@x.com', phone: '+880 1711-223344', createdAt: '2026-01-01T00:00:00Z' }),
  booking({ id: '2', name: 'Rahim Uddin', email: 'rahim@x.com', phone: '01711223344', createdAt: '2026-06-01T00:00:00Z', checkIn: '2026-06-10' }),
  booking({ id: '3', name: 'Karim', email: 'karim@x.com', phone: '01822334455', createdAt: '2026-03-01T00:00:00Z' }),
  booking({ id: '4', name: 'Hidden guest', phone: '', guestHidden: true }),
]

describe('previous guest lookup by phone', () => {
  it('treats +880 and local 0 numbers as the same', () => {
    expect(phoneDigits('+880 1711-223344')).toBe('01711223344')
    expect(phoneDigits('01711 223344')).toBe('01711223344')
  })

  it('needs at least four digits', () => {
    expect(findPreviousGuests(bookings, '017')).toEqual([])
  })

  it('merges a guest’s bookings and uses the latest name and email', () => {
    const [match, ...rest] = findPreviousGuests(bookings, '1711223')
    expect(rest).toEqual([])
    expect(match).toMatchObject({ name: 'Rahim Uddin', email: 'rahim@x.com', stays: 2, lastCheckIn: '2026-06-10' })
  })

  it('matches typed digits anywhere and lists newest first', () => {
    expect(findPreviousGuests(bookings, '3344').map((g) => g.name)).toEqual(['Rahim Uddin', 'Karim'])
  })

  it('never suggests guests withheld from the viewer', () => {
    expect(findPreviousGuests(bookings, '0000').length).toBe(0)
    expect(findPreviousGuests(bookings, '01').length).toBe(0)
  })
})
