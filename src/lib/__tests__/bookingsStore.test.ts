import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Booking } from '../../utils/bookings'

const listRows: Booking[] = []

vi.mock('../supabase', () => ({
  getSupabase: () => null,
  isSupabaseConfigured: () => true,
}))

vi.mock('../availabilityCache', () => ({ invalidateAvailabilityCache: () => {} }))

vi.mock('../bookingsDb', () => ({
  deleteBookingRemote: vi.fn(),
  fetchBookingById: vi.fn(async () => null),
  fetchBookingsList: vi.fn(async () => ({ bookings: listRows, fullPayload: false })),
  insertBookingIfAvailable: vi.fn(),
  loadBookingsFromLocal: () => [],
  migrateLocalBookingsToRemote: vi.fn(),
  saveBookingsToLocal: () => {},
  toPersistedBooking: (b: Booking) => b,
  upsertBookingIfAvailable: vi.fn(),
}))

const base = (overrides: Partial<Booking> = {}): Booking => ({
  id: 'B1',
  checkIn: '2026-10-20',
  checkOut: '2026-10-22',
  adults: 2,
  children: 0,
  totalGuests: 2,
  roomType: 'deluxe',
  roomName: '101',
  name: 'Guest',
  email: '',
  phone: '',
  specialRequests: '',
  status: 'confirmed',
  notes: [],
  payment: { amount: 5000, status: 'partial' },
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
})

const detail = base({
  notes: [{ id: 'n1', note: 'VIP', createdBy: 'Staff', createdAt: '2026-10-01T00:00:00Z' }],
  payment: {
    amount: 5000,
    status: 'partial',
    transactions: [{ id: 't1', type: 'payment', amount: 2000, recordedAt: '2026-10-01T00:00:00Z' }],
  },
})

describe('refreshBookingsList', () => {
  beforeEach(() => {
    vi.resetModules()
    listRows.length = 0
  })

  it('keeps the cached detail when the server row matches it', async () => {
    const store = await import('../bookingsStore')
    store.applyBookingToCache(detail)
    listRows.push(base({ payment: { amount: 5000, status: 'partial', listNetPaid: 2000, listTxCount: 1 } }))

    const [merged] = await store.refreshBookingsList()
    expect(merged.payment.transactions).toHaveLength(1)
    expect(merged.notes).toHaveLength(1)
    expect(store.isBookingDetailLoaded('B1')).toBe(true)
  })

  it('drops the cached ledger when another device added a payment', async () => {
    const store = await import('../bookingsStore')
    store.applyBookingToCache(detail)
    listRows.push(base({ payment: { amount: 5000, status: 'paid', listNetPaid: 5000, listTxCount: 2 } }))

    const [merged] = await store.refreshBookingsList()
    expect(merged.payment.transactions).toBeUndefined()
    expect(merged.payment.listNetPaid).toBe(5000)
    expect(store.isBookingDetailLoaded('B1')).toBe(false)
  })

  it('drops the cached detail when the room rent changed elsewhere', async () => {
    const store = await import('../bookingsStore')
    store.applyBookingToCache(detail)
    listRows.push(base({ payment: { amount: 6000, status: 'partial', listNetPaid: 2000, listTxCount: 1 } }))

    await store.refreshBookingsList()
    expect(store.isBookingDetailLoaded('B1')).toBe(false)
  })
})
