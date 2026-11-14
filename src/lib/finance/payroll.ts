import { businessToday, monthKey } from './dates'
import { round2, type ExpenseIndex, type PaymentStatus } from './reporting'
import type { FinPayroll, PayrollDeduction, PayrollEarning, PayrollEarningType, StaffSalary } from './types'

export const PAYROLL_EARNING_LABELS: Record<PayrollEarningType, string> = {
  allowance: 'Allowance',
  overtime: 'Overtime',
  bonus: 'Bonus',
  other: 'Other addition',
}

export const PAYROLL_DEDUCTION_PRESETS = ['Absence', 'Late arrival', 'Penalty', 'Damage or loss', 'Other'] as const

export const currentPayrollPeriod = (today: string = businessToday()): string => monthKey(today)

export const shiftPeriod = (period: string, months: number): string => {
  const [y, m] = period.split('-').map(Number)
  const index = y * 12 + (m - 1) + months
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}

export const periodLabel = (period: string): string => {
  const [y, m] = period.split('-').map(Number)
  if (!y || !m) return period
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export interface PayrollTotals {
  gross: number
  deductions: number
  advanceRecovered: number
  /** Cash to pay after deductions and advance recovery. */
  netPay: number
}

export const computePayrollTotals = (input: {
  baseSalary: number
  earnings: Pick<PayrollEarning, 'amount'>[]
  deductions: Pick<PayrollDeduction, 'amount'>[]
  advanceRecovered: number
}): PayrollTotals => {
  const gross = round2(input.baseSalary + input.earnings.reduce((s, e) => s + e.amount, 0))
  const deductions = round2(input.deductions.reduce((s, d) => s + d.amount, 0))
  const advanceRecovered = round2(input.advanceRecovered)
  return { gross, deductions, advanceRecovered, netPay: round2(gross - deductions - advanceRecovered) }
}

export type PayrollRowStatus = 'not_processed' | PaymentStatus

export interface PayrollRow {
  staffId: string
  name: string
  role: string
  monthlySalary: number | null
  /** Active (not void) payroll for the period. */
  payroll: FinPayroll | null
  /** Voided payrolls for the period, kept for history. */
  voided: FinPayroll[]
  status: PayrollRowStatus
  /** Cash paid against the salary so far. */
  paid: number
  /** Still to pay in cash. */
  outstanding: number
}

/** One row per staff member for the period, plus rows for people paid that month who have since left. */
export const payrollRowsForPeriod = (
  staff: { id: string; name: string; role: string; terminatedOn?: string }[],
  salaries: StaffSalary[],
  payrolls: FinPayroll[],
  index: ExpenseIndex,
  period: string
): PayrollRow[] => {
  const salaryById = new Map(salaries.map((s) => [s.id, s.monthlySalary]))
  const forPeriod = payrolls.filter((p) => p.period === period)
  const isActive = (p: FinPayroll) => index.get(p.expenseId)?.expense.status === 'active'

  const build = (staffId: string, name: string, role: string, mine: FinPayroll[]): PayrollRow => {
    const payroll = mine.find(isActive) ?? null
    const figures = payroll ? index.get(payroll.expenseId) : undefined
    return {
      staffId,
      name,
      role,
      monthlySalary: salaryById.get(staffId) ?? null,
      payroll,
      voided: mine.filter((p) => !isActive(p)),
      status: figures ? figures.paymentStatus : 'not_processed',
      paid: figures ? round2(figures.cashPaidNet) : 0,
      outstanding: figures ? round2(figures.outstanding) : 0,
    }
  }

  const known = new Set(staff.map((s) => s.id))
  const firstDay = `${period}-01`
  const rows = staff
    .map((s) => ({ s, mine: forPeriod.filter((p) => p.staffId === s.id) }))
    .filter(({ s, mine }) => !s.terminatedOn || s.terminatedOn >= firstDay || mine.length > 0)
    .map(({ s, mine }) => build(s.id, s.name, s.terminatedOn ? `${s.role} · fired ${s.terminatedOn}` : s.role, mine))
  forPeriod
    .filter((p) => isActive(p) && (!p.staffId || !known.has(p.staffId)))
    .forEach((p) => rows.push(build(`former:${p.id}`, p.staffName, 'Former staff', [p])))
  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export interface PayrollPeriodSummary {
  processed: number
  gross: number
  deductions: number
  advanceRecovered: number
  netPay: number
  paid: number
  outstanding: number
}

export const summarizePayrollRows = (rows: PayrollRow[]): PayrollPeriodSummary =>
  rows.reduce<PayrollPeriodSummary>(
    (s, r) => {
      if (!r.payroll) return s
      return {
        processed: s.processed + 1,
        gross: round2(s.gross + r.payroll.gross),
        deductions: round2(s.deductions + r.payroll.totalDeductions),
        advanceRecovered: round2(s.advanceRecovered + r.payroll.advanceRecovered),
        netPay: round2(s.netPay + r.payroll.netPay),
        paid: round2(s.paid + r.paid),
        outstanding: round2(s.outstanding + r.outstanding),
      }
    },
    { processed: 0, gross: 0, deductions: 0, advanceRecovered: 0, netPay: 0, paid: 0, outstanding: 0 }
  )
