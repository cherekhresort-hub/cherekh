import { describe, expect, it } from 'vitest'
import { buildExpenseFigures } from '../reporting'
import {
  computePayrollTotals,
  payrollRowsForPeriod,
  periodLabel,
  shiftPeriod,
  summarizePayrollRows,
} from '../payroll'
import type { FinPayroll } from '../types'
import { entry, expense, financeData } from './fixtures'

const payroll = (spec: Partial<FinPayroll> & { expenseId: string; staffId: string | null }): FinPayroll => ({
  id: `pr-${spec.expenseId}`,
  staffName: 'Staff',
  period: '2026-11',
  baseSalary: 15000,
  earnings: [],
  deductions: [],
  gross: 15000,
  totalDeductions: 0,
  advanceRecovered: 0,
  netPay: 15000,
  notes: null,
  createdBy: null,
  createdAt: '2026-11-30T10:00:00Z',
  ...spec,
})

describe('payroll periods', () => {
  it('moves across year boundaries', () => {
    expect(shiftPeriod('2026-12', 1)).toBe('2027-01')
    expect(shiftPeriod('2026-01', -1)).toBe('2025-12')
    expect(shiftPeriod('2026-11', 0)).toBe('2026-11')
  })

  it('labels a month', () => {
    expect(periodLabel('2026-11')).toBe('November 2026')
  })
})

describe('payroll totals', () => {
  it('nets deductions and advance recovery from gross pay', () => {
    expect(
      computePayrollTotals({
        baseSalary: 15000,
        earnings: [{ amount: 2000 }, { amount: 500.5 }],
        deductions: [{ amount: 1000 }],
        advanceRecovered: 3000,
      })
    ).toEqual({ gross: 17500.5, deductions: 1000, advanceRecovered: 3000, netPay: 13500.5 })
  })
})

describe('payroll rows', () => {
  const staff = [
    { id: 's1', name: 'Rahim', role: 'Cook' },
    { id: 's2', name: 'Karim', role: 'Guard' },
  ]

  it('shows paid, unpaid and voided payrolls for the month', () => {
    const salary = expense({ id: 'sal-1', date: '2026-11-30', lines: [{ classification: 'operating_expense', amount: 15000 }], staffId: 's1' })
    const voided = expense({ id: 'sal-0', date: '2026-11-30', lines: [{ classification: 'operating_expense', amount: 14000 }], staffId: 's1', status: 'void' })
    const data = financeData({
      built: [salary, voided],
      ledger: [entry({ kind: 'expense_payment', amount: 10000, expenseId: 'sal-1' })],
    })
    const index = buildExpenseFigures(data)
    const rows = payrollRowsForPeriod(
      staff,
      [{ id: 's1', monthlySalary: 15000, updatedBy: null, updatedAt: '' }],
      [payroll({ expenseId: 'sal-1', staffId: 's1' }), payroll({ expenseId: 'sal-0', staffId: 's1', gross: 14000, netPay: 14000 })],
      index,
      '2026-11'
    )

    const rahim = rows.find((r) => r.staffId === 's1')!
    expect(rahim.payroll?.expenseId).toBe('sal-1')
    expect(rahim.voided).toHaveLength(1)
    expect(rahim.status).toBe('partial')
    expect(rahim.paid).toBe(10000)
    expect(rahim.outstanding).toBe(5000)
    expect(rahim.monthlySalary).toBe(15000)

    const karim = rows.find((r) => r.staffId === 's2')!
    expect(karim.payroll).toBeNull()
    expect(karim.status).toBe('not_processed')
    expect(karim.monthlySalary).toBeNull()

    expect(summarizePayrollRows(rows)).toEqual({
      processed: 1,
      gross: 15000,
      deductions: 0,
      advanceRecovered: 0,
      netPay: 15000,
      paid: 10000,
      outstanding: 5000,
    })
  })

  it('includes fired staff only up to the month they left', () => {
    const index = buildExpenseFigures(financeData({}))
    const fired = [...staff, { id: 's3', name: 'Jamal', role: 'Waiter', terminatedOn: '2026-11-10' }]
    const nov = payrollRowsForPeriod(fired, [], [], index, '2026-11').find((r) => r.staffId === 's3')
    expect(nov?.role).toBe('Waiter · fired 2026-11-10')
    expect(payrollRowsForPeriod(fired, [], [], index, '2026-12').some((r) => r.staffId === 's3')).toBe(false)
  })

  it('keeps payrolls of staff who have since been removed', () => {
    const salary = expense({ id: 'sal-x', date: '2026-11-30', lines: [{ classification: 'operating_expense', amount: 9000 }] })
    const index = buildExpenseFigures(financeData({ built: [salary] }))
    const rows = payrollRowsForPeriod(staff, [], [payroll({ expenseId: 'sal-x', staffId: null, staffName: 'Former cook' })], index, '2026-11')
    const former = rows.find((r) => r.name === 'Former cook')!
    expect(former.role).toBe('Former staff')
    expect(former.status).toBe('unpaid')
    expect(former.outstanding).toBe(9000)
  })
})
