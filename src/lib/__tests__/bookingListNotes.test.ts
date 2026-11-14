import { describe, expect, it } from 'vitest'
import { bookingFromListRow, type BookingListRow } from '../bookingList'
import { internalNotesSummary } from '../../utils/bookings'
import { toPersistedBooking } from '../bookingsDb'

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

describe('internal notes on list rows', () => {
  it('reads the latest note and count from the list row', () => {
    const booking = bookingFromListRow(
      row({
        notes_count: 3,
        latest_note: { id: 'n3', note: 'Needs early check-in', createdBy: 'desk@cherekh.com', createdAt: '2026-10-03T00:00:00Z' },
      })
    )
    const summary = internalNotesSummary(booking)
    expect(summary.count).toBe(3)
    expect(summary.latest?.note).toBe('Needs early check-in')
  })

  it('shows nothing when the view has no note columns yet', () => {
    const booking = bookingFromListRow(row())
    expect(booking.listNotesCount).toBeUndefined()
    expect(internalNotesSummary(booking)).toEqual({ latest: undefined, count: 0 })
  })

  it('prefers loaded notes and picks the newest', () => {
    const summary = internalNotesSummary({
      notes: [
        { id: 'a', note: 'old', createdBy: 'x', createdAt: '2026-10-01T00:00:00Z' },
        { id: 'b', note: 'new', createdBy: 'y', createdAt: '2026-10-05T00:00:00Z' },
      ],
      listNotesCount: 1,
      listLatestNote: { id: 'a', note: 'old', createdBy: 'x', createdAt: '2026-10-01T00:00:00Z' },
    })
    expect(summary).toMatchObject({ count: 2, latest: { note: 'new' } })
  })

  it('never persists the list-only note fields', () => {
    const booking = bookingFromListRow(
      row({ notes_count: 1, latest_note: { id: 'n1', note: 'x', createdBy: 'a', createdAt: '' } })
    )
    const persisted = toPersistedBooking(booking)
    expect(persisted).not.toHaveProperty('listNotesCount')
    expect(persisted).not.toHaveProperty('listLatestNote')
  })
})
