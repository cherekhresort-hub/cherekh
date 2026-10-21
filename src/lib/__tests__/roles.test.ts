import { describe, expect, it } from 'vitest'
import { roleCanManageBills, roleCanModifyBooking } from '../roles'
import { canAccessAdminPath } from '../../admin/utils/navAccess'

const officer = 'officer@example.com'

describe('roleCanModifyBooking', () => {
  it('lets admins and managers change any booking', () => {
    expect(roleCanModifyBooking('admin', 'a@example.com', {})).toBe(true)
    expect(roleCanModifyBooking('manager', 'm@example.com', { bookedBy: { type: 'website' } })).toBe(true)
  })

  it('lets a booking officer change only bookings he created', () => {
    const own = { bookedBy: { type: 'staff' as const, email: 'Officer@Example.com' } }
    const other = { bookedBy: { type: 'staff' as const, email: 'someone@example.com' } }
    expect(roleCanModifyBooking('booking_officer', officer, own)).toBe(true)
    expect(roleCanModifyBooking('booking_officer', officer, other)).toBe(false)
    expect(roleCanModifyBooking('booking_officer', officer, { bookedBy: { type: 'website' } })).toBe(false)
    expect(roleCanModifyBooking('booking_officer', officer, {})).toBe(false)
    expect(roleCanModifyBooking('booking_officer', null, own)).toBe(false)
  })

  it('denies signed-out users', () => {
    expect(roleCanModifyBooking(null, officer, {})).toBe(false)
  })
})

describe('roleCanManageBills', () => {
  it('allows admins and managers only', () => {
    expect(roleCanManageBills('admin')).toBe(true)
    expect(roleCanManageBills('manager')).toBe(true)
    expect(roleCanManageBills('booking_officer')).toBe(false)
    expect(roleCanManageBills(null)).toBe(false)
  })
})

describe('booking officer admin sections', () => {
  it('allows only dashboard, bookings and rooms', () => {
    for (const path of ['/admin', '/admin/', '/admin/bookings', '/admin/rooms']) {
      expect(canAccessAdminPath('booking_officer', path)).toBe(true)
    }
    for (const path of ['/admin/guests', '/admin/inquiries', '/admin/expenses', '/admin/settings']) {
      expect(canAccessAdminPath('booking_officer', path)).toBe(false)
    }
  })
})
