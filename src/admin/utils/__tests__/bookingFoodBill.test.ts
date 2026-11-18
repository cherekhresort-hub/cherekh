import { describe, expect, it } from 'vitest'
import { foodBillFileName, guestsForFoodBill } from '../bookingInvoicePdf'
import type { Booking } from '../../../utils/bookings'

const booking = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'CC-100001',
  checkIn: '2026-11-14',
  checkOut: '2026-11-16',
  adults: 2,
  children: 0,
  totalGuests: 2,
  roomType: '205',
  roomName: 'Room 205',
  name: 'Prince Mahmud',
  email: 'prince@example.com',
  phone: '01777000888',
  specialRequests: '',
  status: 'confirmed',
  notes: [],
  payment: { amount: 5000, status: 'pending' },
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  ...overrides,
})

describe('guestsForFoodBill', () => {
  it('falls back to the booker when no guest details were recorded', () => {
    expect(guestsForFoodBill(booking())).toEqual([{ name: 'Prince Mahmud' }])
  })

  it('returns every filled guest record and fills the booker name on guest 1', () => {
    expect(
      guestsForFoodBill(
        booking({
          guests: [
            { name: '', idType: 'nid', idNumber: '1990123456789', nationality: 'Bangladeshi' },
            { name: 'Karim Uddin', idType: 'passport', idNumber: 'BX0123456' },
            { name: '', idNumber: '' },
          ],
        })
      )
    ).toEqual([
      {
        name: 'Prince Mahmud',
        idType: 'nid',
        idNumber: '1990123456789',
        nationality: 'Bangladeshi',
      },
      { name: 'Karim Uddin', idType: 'passport', idNumber: 'BX0123456' },
    ])
  })
})

describe('foodBillFileName', () => {
  it('names the download after the booking and guest', () => {
    expect(foodBillFileName(booking())).toBe('Cherekh-FoodBill-100001-Prince-Mahmud.pdf')
  })
})
