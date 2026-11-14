import { describe, expect, it } from 'vitest'
import {
  exportableBookings,
  GUEST_PROFILE_HEADERS,
  GUEST_REGISTER_HEADERS,
  GUEST_SHEET_HEADERS,
  toGuestProfileRow,
  toGuestRegisterRow,
  toGuestRows,
} from '../exportExcel'
import type { Booking } from '../bookings'
import { formatBookingId } from '../bookingId'

const booking: Booking = {
  id: 'CC-123456',
  checkIn: '2026-11-20',
  checkOut: '2026-11-22',
  adults: 3,
  children: 1,
  totalGuests: 4,
  roomType: 'deluxe',
  roomName: '205',
  rooms: [
    { roomType: 'deluxe', roomName: '205', adults: 2, children: 1, totalGuests: 3 },
    { roomType: 'deluxe', roomName: '206', adults: 1, children: 0, totalGuests: 1 },
  ],
  name: 'Rahim Uddin',
  email: 'rahim@example.com',
  phone: '+8801700000000',
  specialRequests: 'Late check-in',
  status: 'confirmed',
  notes: [{ id: 'n1', note: 'VIP', createdBy: 'Staff', createdAt: '2026-11-01T00:00:00Z' }],
  payment: { amount: 10000, status: 'partial' },
  createdAt: '2026-11-01T08:30:00Z',
  updatedAt: '2026-11-01T08:30:00Z',
}

describe('guest register export', () => {
  it('has exactly the report columns', () => {
    expect([...GUEST_REGISTER_HEADERS]).toEqual([
      'Booking ID', 'Booking Date', 'Booking Time', 'Guest Name', 'Email', 'Phone', 'Rooms',
      'Rooms Booked', 'Expected Arrival', 'Check-in Date', 'Check-out Date', 'Adults', 'Children',
      'Total Guests',
    ])
  })

  it('fills guest and stay details without money or notes', () => {
    const row = toGuestRegisterRow(booking)
    expect(row).toHaveLength(GUEST_REGISTER_HEADERS.length)
    const cell = (header: (typeof GUEST_REGISTER_HEADERS)[number]) => row[GUEST_REGISTER_HEADERS.indexOf(header)]
    expect(cell('Guest Name')).toBe('Rahim Uddin')
    expect(cell('Rooms')).toBe('205, 206')
    expect(cell('Rooms Booked')).toBe(2)
    expect(cell('Check-in Date')).toBe('2026-11-20')
    expect(cell('Total Guests')).toBe(4)
    expect(row).not.toContain(10000)
    expect(row).not.toContain('VIP')
  })

  it('lists every recorded guest with their ID on the Guests sheet', () => {
    const rows = toGuestRows({
      ...booking,
      guests: [
        { name: '', idType: 'nid', idNumber: '1990123456789', nationality: 'Bangladeshi', city: 'Dhaka' },
        { name: 'Karim Uddin', idType: 'passport', idNumber: 'BX0123456', nationality: 'Bangladeshi' },
        { name: '', idType: 'nid', idNumber: '' },
      ],
    })
    expect(rows).toHaveLength(2)
    const col = (header: (typeof GUEST_SHEET_HEADERS)[number]) => GUEST_SHEET_HEADERS.indexOf(header)
    expect(rows[0][col('Guest Name')]).toBe('Rahim Uddin')
    expect(rows[0][col('ID Type')]).toBe('National ID (NID)')
    expect(rows[0][col('ID Number')]).toBe('1990123456789')
    expect(rows[1][col('Guest No.')]).toBe(2)
    expect(rows[1][col('Guest Name')]).toBe('Karim Uddin')
    expect(rows[1][col('ID Type')]).toBe('Passport')
    expect(rows[1][col('Rooms')]).toBe('205, 206')
  })

  it('leaves cancelled bookings out of exports', () => {
    const kept = exportableBookings([
      booking,
      { ...booking, id: 'CC-2', status: 'cancelled' },
      { ...booking, id: 'CC-3', status: 'checked-out' },
    ])
    expect(kept.map((b) => b.id)).toEqual(['CC-123456', 'CC-3'])
  })

  it('falls back to the booker when no guest details were entered', () => {
    const rows = toGuestRows(booking)
    expect(rows).toHaveLength(1)
    expect(rows[0][GUEST_SHEET_HEADERS.indexOf('Guest Name')]).toBe('Rahim Uddin')
    expect(rows[0][GUEST_SHEET_HEADERS.indexOf('ID Number')]).toBe('')
  })
})

describe('guest profile export', () => {
  it('summarises a guest using ID and emergency details from their latest booking', () => {
    const older: Booking = {
      ...booking,
      id: 'CC-100001',
      checkIn: '2026-01-05',
      checkOut: '2026-01-07',
      guests: [{ name: 'Rahim Uddin', idType: 'nid', idNumber: 'OLD-ID', nationality: 'Bangladeshi' }],
      emergencyContact: { name: 'Salma', phone: '01800000000', relation: 'Wife' },
    }
    const newer: Booking = {
      ...booking,
      guests: [{ name: 'Rahim Uddin', idType: 'passport', idNumber: 'BX999', city: 'Chittagong' }],
    }
    const row = toGuestProfileRow({
      name: 'Rahim Uddin',
      email: 'rahim@example.com',
      phone: '+8801700000000',
      tags: ['returning', 'vip'],
      totalStays: 2,
      lastStay: '2026-11-22',
      totalSpent: 25000,
      bookings: [newer, older],
    })
    expect(row).toHaveLength(GUEST_PROFILE_HEADERS.length)
    const cell = (header: (typeof GUEST_PROFILE_HEADERS)[number]) => row[GUEST_PROFILE_HEADERS.indexOf(header)]
    expect(cell('Tags')).toBe('Returning, VIP')
    expect(cell('First Stay')).toBe('2026-01-05')
    expect(cell('Last Stay')).toBe('2026-11-22')
    expect(cell('Total Spent')).toBe(25000)
    expect(cell('ID Type')).toBe('Passport')
    expect(cell('ID Number')).toBe('BX999')
    expect(cell('City')).toBe('Chittagong')
    expect(cell('Emergency Contact')).toBe('Salma')
    expect(cell('Emergency Relation')).toBe('Wife')
    expect(cell('Booking IDs')).toBe(`${formatBookingId('CC-100001')}, ${formatBookingId('CC-123456')}`)
  })
})
