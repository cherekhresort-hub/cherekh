import { describe, expect, it } from 'vitest'
import { calculateBookingTotal, diffBookingRooms, suggestRoomChangeAmount } from '../bookingHelpers'
import type { BookingRoomLine } from '../bookings'

const line = (roomType: string, adults = 2, children = 0): BookingRoomLine => ({
  roomType,
  roomName: `Room ${roomType}`,
  adults,
  children,
  totalGuests: adults + children,
})

const stay = { checkIn: '2026-12-01', checkOut: '2026-12-03' }

const rateCard = (rooms: BookingRoomLine[]) =>
  calculateBookingTotal({
    ...stay,
    rooms,
    roomType: rooms[0].roomType,
    adults: 0,
    children: 0,
    totalGuests: 0,
  })

describe('diffBookingRooms', () => {
  it('lists added and removed rooms', () => {
    expect(diffBookingRooms([line('103'), line('104')], [line('104'), line('205')])).toEqual({
      added: ['205'],
      removed: ['103'],
    })
  })
})

describe('suggestRoomChangeAmount', () => {
  it('adds the new room at the rate card for every night', () => {
    const before = [line('103')]
    const after = [line('103'), line('205')]
    const current = rateCard(before)
    const amount = suggestRoomChangeAmount(
      { ...stay, payment: { amount: current, status: 'pending' } },
      before,
      after
    )
    expect(amount).toBe(rateCard(after))
    expect(amount).toBeGreaterThan(current)
  })

  it('keeps a custom price for the rooms that stay', () => {
    const before = [line('103'), line('205')]
    const after = [line('103')]
    const custom = 5000
    const amount = suggestRoomChangeAmount(
      { ...stay, payment: { amount: custom, status: 'pending' } },
      before,
      after
    )
    expect(amount).toBe(Math.max(0, custom - rateCard([line('205')])))
  })

  it('never goes below zero', () => {
    expect(
      suggestRoomChangeAmount(
        { ...stay, payment: { amount: 100, status: 'pending' } },
        [line('103'), line('205')],
        [line('103')]
      )
    ).toBe(0)
  })
})
