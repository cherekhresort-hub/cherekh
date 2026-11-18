import { describe, expect, it } from 'vitest'
import {
  foodServiceBounds,
  isFoodOnlyBooking,
  getGuestDetailSlotCount,
  getBookingDurationCount,
} from '../bookingHelpers'
import { stayServiceDates } from '../foodBill'
import {
  bookingSkipsInventory,
  normalizeBookingInput,
  type Booking,
} from '../bookings'

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: '100001',
  checkIn: '2026-11-18',
  checkOut: '2026-11-19',
  adults: 0,
  children: 0,
  totalGuests: 1,
  roomType: '',
  roomName: 'Walk-in',
  rooms: [],
  name: 'Walk-in Guest',
  email: '',
  phone: '01777000888',
  specialRequests: '',
  status: 'confirmed',
  notes: [],
  payment: { amount: 0, status: 'pending' },
  createdAt: '2026-11-18T00:00:00Z',
  updatedAt: '2026-11-18T00:00:00Z',
  ...overrides,
})

describe('isFoodOnlyBooking', () => {
  it('recognizes bookingKind food', () => {
    expect(isFoodOnlyBooking(booking({ bookingKind: 'food' }))).toBe(true)
  })

  it('does not treat stay bookings as food-only even with empty rooms', () => {
    expect(isFoodOnlyBooking(booking({ bookingKind: 'stay', rooms: [], roomType: '', roomName: '' }))).toBe(
      false
    )
  })

  it('infers legacy walk-in rows without bookingKind', () => {
    expect(isFoodOnlyBooking(booking({ bookingKind: undefined, roomName: 'Walk-in', rooms: [] }))).toBe(true)
  })

  it('does not infer food-only from incomplete stay fixtures', () => {
    expect(isFoodOnlyBooking({ checkIn: '2026-10-17', checkOut: '2026-10-19' } as never)).toBe(false)
  })

  it('never treats room bookings as food-only without bookingKind food', () => {
    expect(
      isFoodOnlyBooking(
        booking({
          bookingKind: undefined,
          roomType: '205',
          rooms: [{ roomType: '205', roomName: 'Room 205', adults: 2, children: 0, totalGuests: 2 }],
        })
      )
    ).toBe(false)
  })
})

describe('foodServiceBounds and stayServiceDates', () => {
  it('stores checkOut as the day after the service day', () => {
    expect(foodServiceBounds('2026-11-18')).toEqual({ checkIn: '2026-11-18', checkOut: '2026-11-19' })
  })

  it('bills food only on the service day, not through check-out', () => {
    expect(
      stayServiceDates(booking({ bookingKind: 'food', checkIn: '2026-11-18', checkOut: '2026-11-19' }))
    ).toEqual(['2026-11-18'])
  })

  it('keeps inclusive stay days for normal bookings', () => {
    expect(
      stayServiceDates(
        booking({
          bookingKind: 'stay',
          checkIn: '2026-11-18',
          checkOut: '2026-11-20',
          roomType: '205',
          roomName: 'Room 205',
          rooms: [{ roomType: '205', roomName: 'Room 205', adults: 2, children: 0, totalGuests: 2 }],
        })
      )
    ).toEqual(['2026-11-18', '2026-11-19', '2026-11-20'])
  })
})

describe('food-only guest and duration helpers', () => {
  it('offers one guest ID slot and one service day', () => {
    const food = booking({ bookingKind: 'food' })
    expect(getGuestDetailSlotCount(food)).toBe(1)
    expect(getBookingDurationCount(food)).toBe(1)
  })
})

describe('food-only create payload', () => {
  it('normalizes empty rooms, Walk-in label, and zero guest counts', () => {
    expect(
      normalizeBookingInput({
        bookingKind: 'food',
        checkIn: '2026-11-18',
        checkOut: '2026-11-19',
        name: 'Walk-in Guest',
        email: '',
        phone: '01777000888',
        specialRequests: '',
        rooms: [],
      })
    ).toMatchObject({
      bookingKind: 'food',
      checkIn: '2026-11-18',
      checkOut: '2026-11-19',
      rooms: [],
      roomType: '',
      roomName: 'Walk-in',
      adults: 0,
      children: 0,
      totalGuests: 1,
    })
  })

  it('skips inventory holds when there are no room types', () => {
    expect(bookingSkipsInventory(booking({ bookingKind: 'food' }))).toBe(true)
    expect(
      bookingSkipsInventory(
        booking({
          bookingKind: 'stay',
          roomType: '205',
          roomName: 'Room 205',
          rooms: [{ roomType: '205', roomName: 'Room 205', adults: 2, children: 0, totalGuests: 2 }],
        })
      )
    ).toBe(false)
  })
})
