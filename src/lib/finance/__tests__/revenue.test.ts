import { describe, expect, it } from 'vitest'
import { cashReceived, earnedByDay, guestBalancesAsOf, revenueEarned } from '../revenue'
import { addDays, addMonths, eachDay, presetRange, toBusinessDay } from '../dates'
import { booking } from './fixtures'

describe('revenue earned (accrual)', () => {
  it('spreads booking value evenly across stay nights and clips to the range', () => {
    const b = booking({ nights: ['2026-03-30', '2026-03-31', '2026-04-01'], total: 9000, roomNet: 7500, food: 1500, guestRooms: 2 })
    const march = revenueEarned([b], { from: '2026-03-01', to: '2026-03-31' })
    expect(march.total).toBe(6000)
    expect(march.rooms).toBe(5000)
    expect(march.food).toBe(1000)
    expect(march.roomNights).toBe(4)
    expect(revenueEarned([b], { from: '2026-04-01', to: '2026-04-30' }).total).toBe(3000)
  })

  it('only confirmed and checked-out bookings earn revenue', () => {
    const nights = ['2026-03-10']
    const list = [
      booking({ nights, total: 100, status: 'confirmed' }),
      booking({ nights, total: 200, status: 'checked-out' }),
      booking({ nights, total: 400, status: 'pending' }),
      booking({ nights, total: 800, status: 'cancelled' }),
    ]
    expect(revenueEarned(list, null).total).toBe(300)
    expect(earnedByDay(list, nights).get('2026-03-10')!.total).toBe(300)
  })
})

describe('cash received', () => {
  it('counts payments and refunds by business day for every status', () => {
    const b = booking({
      nights: ['2026-04-02'],
      status: 'cancelled',
      cash: [
        { amount: 5000, isRefund: false, day: '2026-03-31', method: 'bkash' },
        { amount: 2000, isRefund: true, day: '2026-04-01', method: 'bkash' },
      ],
    })
    const march = cashReceived([b], { from: '2026-03-01', to: '2026-03-31' })
    expect(march.received).toBe(5000)
    expect(march.refunded).toBe(0)
    expect(march.byMethod.bkash.received).toBe(5000)
    expect(cashReceived([b], null).net).toBe(3000)
  })
})

describe('guest balances', () => {
  it('splits advances (paid before earned) from receivables (earned, unpaid)', () => {
    const future = booking({ nights: ['2026-05-01', '2026-05-02'], total: 4000, cash: [{ amount: 1000, isRefund: false, day: '2026-03-20' }] })
    const past = booking({ nights: ['2026-03-01', '2026-03-02'], total: 4000, cash: [{ amount: 1500, isRefund: false, day: '2026-03-01' }] })
    const cancelled = booking({ nights: ['2026-03-05'], status: 'cancelled', total: 2000, cash: [{ amount: 500, isRefund: false, day: '2026-03-01' }] })
    const balances = guestBalancesAsOf([future, past, cancelled], '2026-03-31')
    expect(balances.advances).toBe(1000)
    expect(balances.receivables).toBe(2500)
    expect(balances.cancelledRetained).toBe(500)
  })
})

describe('business timezone (Asia/Dhaka)', () => {
  it('maps late-evening UTC timestamps to the next Dhaka day', () => {
    expect(toBusinessDay('2026-03-31T18:30:00Z')).toBe('2026-04-01')
    expect(toBusinessDay('2026-03-31T17:59:00Z')).toBe('2026-03-31')
    expect(toBusinessDay('2026-03-31')).toBe('2026-03-31')
  })

  it('a payment recorded just after Dhaka midnight belongs to the new month', () => {
    const day = toBusinessDay('2026-03-31T18:05:00Z')
    const b = booking({ nights: ['2026-04-01'], cash: [{ amount: 700, isRefund: false, day }] })
    expect(cashReceived([b], { from: '2026-03-01', to: '2026-03-31' }).received).toBe(0)
    expect(cashReceived([b], { from: '2026-04-01', to: '2026-04-30' }).received).toBe(700)
  })
})

describe('date helpers', () => {
  it('adds days and months across boundaries', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(eachDay('2026-03-30', '2026-04-02')).toEqual(['2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02'])
  })

  it('presets: weeks start Monday, quarters and years are calendar based', () => {
    expect(presetRange('this_week', '2026-09-26')).toEqual({ from: '2026-09-21', to: '2026-09-27' })
    expect(presetRange('last_week', '2026-09-21')).toEqual({ from: '2026-09-14', to: '2026-09-20' })
    expect(presetRange('last_month', '2026-03-15')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(presetRange('this_quarter', '2026-08-10')).toEqual({ from: '2026-07-01', to: '2026-09-30' })
    expect(presetRange('last_quarter', '2026-02-10')).toEqual({ from: '2025-10-01', to: '2025-12-31' })
    expect(presetRange('last_year', '2026-02-10')).toEqual({ from: '2025-01-01', to: '2025-12-31' })
  })
})
