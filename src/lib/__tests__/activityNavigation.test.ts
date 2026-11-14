import { describe, expect, it } from 'vitest'
import { getActivityDestination, getActivityDestinationLabel } from '../activityNavigation'
import type { StaffActivityEntry } from '../staffActivityLog'

const entry = (overrides: Partial<StaffActivityEntry>): StaffActivityEntry => ({
  id: 'a1',
  actorEmail: 'manager@example.com',
  actorRole: 'manager',
  category: 'booking',
  action: 'booking.status',
  title: '',
  message: '',
  metadata: {},
  createdAt: '2026-11-09T00:00:00Z',
  read: false,
  ...overrides,
})

const query = (url: string | null) => Object.fromEntries(new URL(url ?? '', 'http://x').searchParams)

describe('getActivityDestination', () => {
  it('opens the booking status on the overview tab', () => {
    const url = getActivityDestination(entry({ entityId: 'CC-1' }))
    expect(url?.startsWith('/admin/bookings?')).toBe(true)
    expect(query(url)).toEqual({ id: 'CC-1', highlight: 'booking-status' })
  })

  it('opens the payment tab on the recorded transaction', () => {
    const url = getActivityDestination(
      entry({ action: 'booking.payment', entityId: 'CC-1', metadata: { transactionId: 'txn-9' } })
    )
    expect(query(url)).toEqual({ id: 'CC-1', tab: 'payment', highlight: 'txn-9' })
  })

  it('falls back to the transactions list for older payment entries', () => {
    const url = getActivityDestination(entry({ action: 'booking.payment', entityId: 'CC-1' }))
    expect(query(url)).toEqual({ id: 'CC-1', tab: 'payment', highlight: 'booking-transactions' })
  })

  it('opens the rooms card after a room change', () => {
    const url = getActivityDestination(entry({ action: 'booking.rooms_changed', entityId: 'CC-1' }))
    expect(query(url)).toEqual({ id: 'CC-1', highlight: 'booking-rooms' })
  })

  it('opens the bills tab on the billed food lines', () => {
    const url = getActivityDestination(
      entry({ action: 'booking.extra_added', entityId: 'CC-1', metadata: { extraIds: ['x1', 'x2'] } })
    )
    expect(query(url)).toEqual({ id: 'CC-1', tab: 'bills', highlight: 'x1,x2' })
    expect(getActivityDestinationLabel(entry({ action: 'booking.extra_added', entityId: 'CC-1' }))).toBe('View bill')
  })

  it('opens the notes tab for a deleted note', () => {
    const url = getActivityDestination(entry({ action: 'booking.note_deleted', entityId: 'CC-1' }))
    expect(query(url)).toEqual({ id: 'CC-1', tab: 'notes', highlight: 'booking-notes' })
  })

  it('sends deleted bookings to the list', () => {
    expect(getActivityDestination(entry({ action: 'booking.deleted', entityId: 'CC-1' }))).toBe('/admin/bookings')
  })

  it('routes menu, housekeeping, team and finance entries', () => {
    expect(
      getActivityDestination(
        entry({ category: 'settings', action: 'menu.updated', metadata: { changedItemIds: ['a', 'b'] } })
      )
    ).toBe('/admin/menu?highlight=a%2Cb')
    expect(
      getActivityDestination(entry({ category: 'housekeeping', action: 'housekeeping.status', entityId: 't1' }))
    ).toBe('/admin/housekeeping?highlight=t1')
    expect(
      getActivityDestination(entry({ category: 'team', action: 'team.member_updated', entityId: 'a@b.com' }))
    ).toBe('/admin/team-access?highlight=a%40b.com')
    expect(
      getActivityDestination(entry({ category: 'team', action: 'team.member_deleted', entityId: 'a@b.com' }))
    ).toBe('/admin/team-access')
    expect(getActivityDestination(entry({ category: 'finance', action: 'transfer' }))).toBe(
      '/admin/expenses?tab=settings'
    )
    expect(
      getActivityDestination(
        entry({ category: 'finance', action: 'ledger_reversed', metadata: { kind: 'owner_contribution' } })
      )
    ).toBe('/admin/investments')
  })

  it('has no destination for sign-ins', () => {
    expect(getActivityDestination(entry({ category: 'staff', action: 'staff.login' }))).toBeNull()
  })
})
