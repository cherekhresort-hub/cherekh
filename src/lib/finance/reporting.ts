/**
 * Centralized financial calculations. Every finance page and report reads
 * from here so figures agree everywhere. Pure functions only (unit-tested).
 *
 * Policies (see docs/FINANCE.md):
 * - Revenue is earned across stay nights (confirmed + checked-out bookings);
 *   cash received is reported separately and never substituted for revenue.
 * - Expenses are recognized on their transaction date (accrual). Payments are
 *   cash movements against the expense, never a second expense.
 * - Inventory purchases use the periodic method (expensed when purchased).
 * - Capital assets stay off the P&L; only configured depreciation is expensed.
 * - Deposits/advances are balances until refunded, applied or written off.
 * - Investment added / withdrawn and transfers are never revenue or expense.
 */
import { CAPITAL_KINDS, PNL_FINANCING_CLASSES, PNL_OPERATING_CLASSES, cashEffect, kindSign } from './classification'
import { addDays, addMonths, businessToday, dayInRange, diffDays, monthKey, type DateRange } from './dates'
import { cashReceived, guestBalancesAsOf, revenueEarned, type RevenueBooking } from './revenue'
import {
  MAIN_FUND_ACCOUNT_ID,
  type Classification,
  type FinAccount,
  type FinAsset,
  type FinCategory,
  type FinExpense,
  type FinExpenseLine,
  type FinLedgerEntry,
  type FinanceData,
} from './types'

const EPS = 0.005
const CLASSES: Classification[] = [
  'operating_expense',
  'inventory',
  'capital_asset',
  'deposit_advance',
  'financing_cost',
  'other',
]

const emptyClassTotals = (): Record<Classification, number> =>
  Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<Classification, number>

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

// ---------------------------------------------------------------------------
// Ledger helpers
// ---------------------------------------------------------------------------

/** IDs of entries that have been reversed (the reversal row itself has reversalOf set). */
export const reversedEntryIds = (ledger: FinLedgerEntry[]): Set<string> =>
  new Set(ledger.filter((e) => e.reversalOf).map((e) => e.reversalOf as string))

/** Signed sum in the kinds' natural direction (reversals subtract). */
export const sumKinds = (entries: FinLedgerEntry[], kinds: FinLedgerEntry['kind'][]): number =>
  entries.filter((e) => kinds.includes(e.kind)).reduce((s, e) => s + kindSign(e.kind, e.direction) * e.amount, 0)

// ---------------------------------------------------------------------------
// Expense figures
// ---------------------------------------------------------------------------

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded' | 'void'
export type ReimbursementStatus = 'not_applicable' | 'owed' | 'partial' | 'reimbursed'

export interface ExpenseFigures {
  expense: FinExpense
  lines: FinExpenseLine[]
  /** Expense total split by line classification (discount/tax/charges allocated pro-rata). */
  classTotals: Record<Classification, number>
  /** Cash paid to the supplier minus supplier refunds. */
  cashPaidNet: number
  refunds: number
  /** Deposits / advances applied as payment (non-cash). */
  advancesApplied: number
  /** Settled toward the supplier (company-paid): cash net + advances applied. */
  netPaid: number
  /** Supplier balance still owed (company-paid only). */
  outstanding: number
  reimbursed: number
  reimbursementOutstanding: number
  paymentStatus: PaymentStatus
  reimbursementStatus: ReimbursementStatus
  /** Counts in reports (active and not rejected). */
  recognized: boolean
}

export const lineShare = (expense: FinExpense, line: FinExpenseLine): number =>
  expense.subtotal > 0 ? (line.lineTotal / expense.subtotal) * expense.total : 0

export const buildExpenseFigures = (data: Pick<FinanceData, 'expenses' | 'lines' | 'ledger' | 'settlements'>) => {
  const linesByExpense = new Map<string, FinExpenseLine[]>()
  data.lines.forEach((l) => {
    const list = linesByExpense.get(l.expenseId) ?? []
    list.push(l)
    linesByExpense.set(l.expenseId, list)
  })
  const ledgerByExpense = new Map<string, FinLedgerEntry[]>()
  data.ledger.forEach((e) => {
    if (!e.expenseId) return
    const list = ledgerByExpense.get(e.expenseId) ?? []
    list.push(e)
    ledgerByExpense.set(e.expenseId, list)
  })
  const expenseById = new Map(data.expenses.map((e) => [e.id, e]))
  const appliedTo = new Map<string, number>()
  data.settlements.forEach((s) => {
    if (s.kind !== 'applied' || !s.appliedExpenseId) return
    if (expenseById.get(s.expenseId)?.status !== 'active') return
    appliedTo.set(s.appliedExpenseId, (appliedTo.get(s.appliedExpenseId) ?? 0) + s.amount)
  })

  const index = new Map<string, ExpenseFigures>()
  data.expenses.forEach((expense) => {
    const lines = (linesByExpense.get(expense.id) ?? []).sort((a, b) => a.lineNo - b.lineNo)
    const ledger = ledgerByExpense.get(expense.id) ?? []
    const classTotals = emptyClassTotals()
    lines.forEach((line) => {
      classTotals[line.classification] += lineShare(expense, line)
    })
    const payments = sumKinds(ledger, ['expense_payment'])
    const refunds = sumKinds(ledger, ['expense_refund'])
    const cashPaidNet = payments - refunds
    const advancesApplied = appliedTo.get(expense.id) ?? 0
    const reimbursed = sumKinds(ledger, ['reimbursement'])
    const isEmployee = expense.paidByType === 'employee'
    const netPaid = isEmployee ? expense.total : cashPaidNet + advancesApplied
    const outstanding = isEmployee ? 0 : Math.max(0, expense.total - netPaid)
    const reimbursementOutstanding = isEmployee ? Math.max(0, expense.total - reimbursed) : 0

    let paymentStatus: PaymentStatus
    if (expense.status === 'void') paymentStatus = 'void'
    else if (isEmployee) paymentStatus = 'paid'
    else if (payments > EPS && cashPaidNet + advancesApplied <= EPS && refunds > EPS) paymentStatus = 'refunded'
    else if (netPaid >= expense.total - EPS) paymentStatus = 'paid'
    else if (netPaid > EPS) paymentStatus = 'partial'
    else paymentStatus = 'unpaid'

    let reimbursementStatus: ReimbursementStatus = 'not_applicable'
    if (isEmployee) {
      if (reimbursed >= expense.total - EPS) reimbursementStatus = 'reimbursed'
      else if (reimbursed > EPS) reimbursementStatus = 'partial'
      else reimbursementStatus = 'owed'
    }

    index.set(expense.id, {
      expense,
      lines,
      classTotals,
      cashPaidNet,
      refunds,
      advancesApplied,
      netPaid,
      outstanding,
      reimbursed,
      reimbursementOutstanding,
      paymentStatus,
      reimbursementStatus,
      recognized: expense.status === 'active' && expense.approvalStatus !== 'rejected',
    })
  })
  return index
}

export type ExpenseIndex = ReturnType<typeof buildExpenseFigures>

/** Amount actually spent (cash out or employee money) vs still committed (owed) for an expense. */
export const spentAndCommitted = (f: ExpenseFigures): { spent: number; committed: number } => {
  if (!f.recognized) return { spent: 0, committed: 0 }
  if (f.expense.paidByType === 'employee') {
    return { spent: f.reimbursed, committed: f.reimbursementOutstanding }
  }
  return { spent: f.netPaid, committed: f.outstanding }
}

// ---------------------------------------------------------------------------
// Expense lines in a period (for analytics)
// ---------------------------------------------------------------------------

export interface ExpenseLineAmount {
  expense: FinExpense
  line: FinExpenseLine
  /** Line's share of the expense total. */
  amount: number
  classification: Classification
  categoryId: string
  topCategoryId: string
}

export const topCategoryId = (categories: FinCategory[], categoryId: string): string => {
  const cat = categories.find((c) => c.id === categoryId)
  return cat?.parentId ?? categoryId
}

export const expenseLineAmounts = (
  data: Pick<FinanceData, 'categories'>,
  index: ExpenseIndex,
  range: DateRange | null
): ExpenseLineAmount[] => {
  const parentOf = new Map(data.categories.map((c) => [c.id, c.parentId ?? c.id]))
  const rows: ExpenseLineAmount[] = []
  index.forEach((f) => {
    if (!f.recognized || !dayInRange(f.expense.txnDate, range)) return
    f.lines.forEach((line) =>
      rows.push({
        expense: f.expense,
        line,
        amount: lineShare(f.expense, line),
        classification: line.classification,
        categoryId: line.categoryId,
        topCategoryId: parentOf.get(line.categoryId) ?? line.categoryId,
      })
    )
  })
  return rows
}

export const sumBy = <T>(rows: T[], key: (row: T) => string, value: (row: T) => number) => {
  const map = new Map<string, number>()
  rows.forEach((r) => map.set(key(r), (map.get(key(r)) ?? 0) + value(r)))
  return [...map.entries()].map(([k, v]) => ({ key: k, amount: v })).sort((a, b) => b.amount - a.amount)
}

export interface ExpensesIncurred {
  byClass: Record<Classification, number>
  /** Operating + inventory + other (+ deposit write-offs). */
  operating: number
  financing: number
  capex: number
  deposits: number
  depositWriteOffs: number
  total: number
  count: number
  pendingApprovalCount: number
  pendingApprovalAmount: number
  unclassifiedAmount: number
}

export const expensesIncurred = (
  data: Pick<FinanceData, 'settlements' | 'expenses'>,
  index: ExpenseIndex,
  range: DateRange | null
): ExpensesIncurred => {
  const byClass = emptyClassTotals()
  let count = 0
  let pendingApprovalCount = 0
  let pendingApprovalAmount = 0
  index.forEach((f) => {
    if (!f.recognized || !dayInRange(f.expense.txnDate, range)) return
    count += 1
    CLASSES.forEach((c) => {
      byClass[c] += f.classTotals[c]
    })
    if (f.expense.approvalStatus === 'pending') {
      pendingApprovalCount += 1
      pendingApprovalAmount += f.expense.total
    }
  })
  const activeIds = new Set(data.expenses.filter((e) => e.status === 'active').map((e) => e.id))
  const depositWriteOffs = data.settlements
    .filter((s) => s.kind === 'written_off' && activeIds.has(s.expenseId) && dayInRange(s.settlementDate, range))
    .reduce((s, r) => s + r.amount, 0)
  const operating = PNL_OPERATING_CLASSES.reduce((s, c) => s + byClass[c], 0) + depositWriteOffs
  const financing = PNL_FINANCING_CLASSES.reduce((s, c) => s + byClass[c], 0)
  return {
    byClass,
    operating,
    financing,
    capex: byClass.capital_asset,
    deposits: byClass.deposit_advance,
    depositWriteOffs,
    total: CLASSES.reduce((s, c) => s + byClass[c], 0),
    count,
    pendingApprovalCount,
    pendingApprovalAmount,
    unclassifiedAmount: byClass.other,
  }
}

// ---------------------------------------------------------------------------
// Depreciation (straight-line, only when useful life is configured)
// ---------------------------------------------------------------------------

export const assetDepreciation = (asset: FinAsset, range: DateRange | null, today = businessToday()): number => {
  if (!asset.usefulLifeMonths || asset.status === 'void') return 0
  const base = Math.max(0, asset.cost - (asset.salvageValue || 0))
  if (base <= 0) return 0
  // Day-based straight line; end dates are exclusive.
  const lifeEnd = addMonths(asset.purchaseDate, asset.usefulLifeMonths)
  const lifeDays = Math.max(1, diffDays(asset.purchaseDate, lifeEnd))
  const stop = asset.disposalDate && asset.disposalDate < lifeEnd ? asset.disposalDate : lifeEnd
  const periodStart = range && range.from > asset.purchaseDate ? range.from : asset.purchaseDate
  const periodEnd = addDays(range ? range.to : today, 1)
  const end = periodEnd < stop ? periodEnd : stop
  const days = Math.max(0, diffDays(periodStart, end))
  return (base * days) / lifeDays
}

export const depreciationForRange = (assets: FinAsset[], range: DateRange | null, today = businessToday()): number =>
  assets.reduce((s, a) => s + assetDepreciation(a, range, today), 0)

export const accumulatedDepreciation = (asset: FinAsset, asOf: string): number =>
  assetDepreciation(asset, { from: asset.purchaseDate, to: asOf }, asOf)

/** Assets that count in reports: not void, and not bought on a rejected or voided expense. */
export const reportableAssets = (assets: FinAsset[], index: ExpenseIndex): FinAsset[] =>
  assets.filter((a) => a.status !== 'void' && (!a.expenseId || index.get(a.expenseId)?.recognized !== false))

/** Assets held on `asOf`: bought by then and not yet disposed of or written off. */
export const assetsHeldAsOf = (assets: FinAsset[], index: ExpenseIndex, asOf: string): FinAsset[] =>
  reportableAssets(assets, index).filter(
    (a) => a.purchaseDate <= asOf && (a.status === 'active' || (a.disposalDate !== null && a.disposalDate > asOf))
  )

/** Statement period cut off at today, so future stays, expenses and depreciation aren't counted yet. */
export const statementPeriod = (range: DateRange | null, today = businessToday()): DateRange => ({
  from: range?.from ?? '0000-01-01',
  to: range && range.to < today ? range.to : today,
})

// ---------------------------------------------------------------------------
// Profit & loss
// ---------------------------------------------------------------------------

export interface ProfitAndLoss {
  revenue: { rooms: number; food: number; other: number; total: number }
  operatingExpenses: number
  operatingByCategory: { key: string; amount: number }[]
  depositWriteOffs: number
  operatingResult: number
  depreciation: number
  financingCosts: number
  resultBeforeTax: number
  /** Excluded from the P&L but shown for context. */
  capitalSpend: number
  depositsPlaced: number
  pendingApprovalAmount: number
  notes: string[]
}

export const profitAndLoss = (
  revenueBookings: RevenueBooking[],
  data: FinanceData,
  index: ExpenseIndex,
  range: DateRange | null,
  today = businessToday()
): ProfitAndLoss => {
  const earned = revenueEarned(revenueBookings, range)
  const incurred = expensesIncurred(data, index, range)
  const lines = expenseLineAmounts(data, index, range).filter((r) => PNL_OPERATING_CLASSES.includes(r.classification))
  const operatingByCategory = sumBy(lines, (r) => r.topCategoryId, (r) => r.amount)
  if (incurred.depositWriteOffs > 0) operatingByCategory.push({ key: 'deposit_write_offs', amount: incurred.depositWriteOffs })
  const depreciation = depreciationForRange(reportableAssets(data.assets, index), range, today)
  const financingCosts = incurred.financing
  const operatingResult = earned.total - incurred.operating
  const notes: string[] = [
    'Revenue covers room bookings (rooms, booking food extras, other extras). Restaurant walk-in sales are not recorded in the system.',
    'Inventory purchases are expensed when bought (periodic method); stock on hand is not tracked.',
    'Depreciation includes only assets with a useful life entered in the asset register.',
    'Result before tax excludes income tax, which is not calculated.',
  ]
  if (incurred.pendingApprovalCount > 0) {
    notes.push(`${incurred.pendingApprovalCount} expense(s) pending approval are included.`)
  }
  return {
    revenue: { rooms: earned.rooms, food: earned.food, other: earned.other, total: earned.total },
    operatingExpenses: incurred.operating,
    operatingByCategory,
    depositWriteOffs: incurred.depositWriteOffs,
    operatingResult,
    depreciation,
    financingCosts,
    resultBeforeTax: operatingResult - depreciation - financingCosts,
    capitalSpend: incurred.capex,
    depositsPlaced: incurred.deposits,
    pendingApprovalAmount: incurred.pendingApprovalAmount,
    notes,
  }
}

// ---------------------------------------------------------------------------
// Cash flow (direct method)
// ---------------------------------------------------------------------------

export interface CashFlowSection {
  lines: { label: string; amount: number }[]
  net: number
}

export interface CashFlow {
  operating: CashFlowSection
  investing: CashFlowSection
  financing: CashFlowSection
  adjustments: number
  transfersExcluded: number
  netChange: number
}

export const cashFlow = (
  revenueBookings: RevenueBooking[],
  data: FinanceData,
  index: ExpenseIndex,
  range: DateRange | null
): CashFlow => {
  const guest = cashReceived(revenueBookings, range)
  let supplierOperating = 0
  let supplierInvesting = 0
  let depositRefunds = 0
  let adjustments = 0
  let transfersExcluded = 0
  let invested = 0
  let withdrawn = 0

  data.ledger.forEach((e) => {
    if (!dayInRange(e.entryDate, range)) return
    const effect = cashEffect(e)
    if (e.kind === 'owner_contribution') {
      invested += effect
      return
    }
    if (e.kind === 'capital_withdrawal') {
      withdrawn += effect
      return
    }
    if (e.kind === 'transfer_in' || e.kind === 'transfer_out') {
      transfersExcluded += Math.abs(effect)
      return
    }
    if (e.kind === 'adjustment') {
      adjustments += effect
      return
    }
    if (e.kind === 'deposit_refund') {
      depositRefunds += effect
      return
    }
    // expense_payment / expense_refund / reimbursement: split by expense classification
    const f = e.expenseId ? index.get(e.expenseId) : undefined
    const total = f ? CLASSES.reduce((s, c) => s + f.classTotals[c], 0) : 0
    const investingShare = f && total > 0 ? (f.classTotals.capital_asset + f.classTotals.deposit_advance) / total : 0
    supplierInvesting += effect * investingShare
    supplierOperating += effect * (1 - investingShare)
  })

  const operatingLines = [
    { label: 'Guest payments received', amount: guest.received },
    { label: 'Guest refunds paid', amount: -guest.refunded },
    { label: 'Operating expenses paid (incl. reimbursements)', amount: supplierOperating },
  ]
  const investingLines = [
    { label: 'Capital assets & deposits paid', amount: supplierInvesting },
    { label: 'Deposits refunded to us', amount: depositRefunds },
  ]
  const financingLines = [
    { label: 'Investment added', amount: invested },
    { label: 'Investment withdrawn', amount: withdrawn },
  ]
  ;[operatingLines, investingLines, financingLines].forEach((lines) =>
    lines.forEach((l) => {
      l.amount = round2(l.amount)
    })
  )
  const sum = (lines: { amount: number }[]) => round2(lines.reduce((s, l) => s + l.amount, 0))
  const operating = { lines: operatingLines, net: sum(operatingLines) }
  const investing = { lines: investingLines, net: sum(investingLines) }
  const financingSection = { lines: financingLines, net: sum(financingLines) }
  return {
    operating,
    investing,
    financing: financingSection,
    adjustments: round2(adjustments),
    transfersExcluded: round2(transfersExcluded / 2),
    netChange: round2(operating.net + investing.net + financingSection.net + adjustments),
  }
}

// ---------------------------------------------------------------------------
// Account balances
// ---------------------------------------------------------------------------

export interface AccountBalance {
  account: FinAccount | null
  accountId: string
  name: string
  opening: number
  guestReceipts: number
  ledgerIn: number
  ledgerOut: number
  balance: number
}

export const UNASSIGNED_ACCOUNT = 'unassigned'

export const accountForMethod = (accounts: FinAccount[], method: string | undefined): string => {
  if (!method) return UNASSIGNED_ACCOUNT
  return accounts.find((a) => a.active && a.defaultMethods.includes(method))?.id ?? UNASSIGNED_ACCOUNT
}

export const accountBalances = (
  revenueBookings: RevenueBooking[],
  data: Pick<FinanceData, 'accounts' | 'ledger'>,
  asOf: string
): AccountBalance[] => {
  const rows = new Map<string, AccountBalance>()
  data.accounts.forEach((account) => {
    rows.set(account.id, {
      account,
      accountId: account.id,
      name: account.name,
      opening: !account.openingDate || account.openingDate <= asOf ? account.openingBalance : 0,
      guestReceipts: 0,
      ledgerIn: 0,
      ledgerOut: 0,
      balance: 0,
    })
  })
  const unassigned: AccountBalance = {
    account: null,
    accountId: UNASSIGNED_ACCOUNT,
    name: 'Unassigned guest payments',
    opening: 0,
    guestReceipts: 0,
    ledgerIn: 0,
    ledgerOut: 0,
    balance: 0,
  }
  const counts = (row: AccountBalance, day: string) =>
    day <= asOf && (!row.account?.openingDate || day >= row.account.openingDate)

  revenueBookings.forEach((b) =>
    b.cash.forEach((move) => {
      const row = rows.get(accountForMethod(data.accounts, move.method)) ?? unassigned
      if (!counts(row, move.day)) return
      row.guestReceipts += move.isRefund ? -move.amount : move.amount
    })
  )
  data.ledger.forEach((e) => {
    const row = rows.get(e.accountId)
    if (!row || !counts(row, e.entryDate)) return
    if (e.direction === 'in') row.ledgerIn += e.amount
    else row.ledgerOut += e.amount
  })
  const list = [...rows.values()]
  if (unassigned.guestReceipts !== 0) list.push(unassigned)
  list.forEach((r) => {
    r.balance = r.opening + r.guestReceipts + r.ledgerIn - r.ledgerOut
  })
  return list
}

// ---------------------------------------------------------------------------
// Payables, reimbursements, deposits
// ---------------------------------------------------------------------------

export interface SupplierPayable {
  key: string
  supplierId: string | null
  name: string
  billed: number
  paid: number
  outstanding: number
  openCount: number
}

export const supplierPayables = (data: Pick<FinanceData, 'suppliers'>, index: ExpenseIndex): SupplierPayable[] => {
  const names = new Map(data.suppliers.map((s) => [s.id, s.name]))
  const map = new Map<string, SupplierPayable>()
  index.forEach((f) => {
    if (!f.recognized || f.expense.paidByType === 'employee') return
    const key = f.expense.supplierId ?? `payee:${(f.expense.payeeName ?? 'No supplier').toLowerCase()}`
    const row = map.get(key) ?? {
      key,
      supplierId: f.expense.supplierId,
      name: (f.expense.supplierId && names.get(f.expense.supplierId)) || f.expense.payeeName || 'No supplier',
      billed: 0,
      paid: 0,
      outstanding: 0,
      openCount: 0,
    }
    row.billed += f.expense.total
    row.paid += f.netPaid
    row.outstanding += f.outstanding
    if (f.outstanding > EPS) row.openCount += 1
    map.set(key, row)
  })
  return [...map.values()].sort((a, b) => b.outstanding - a.outstanding || b.billed - a.billed)
}

export interface ReimbursementOwed {
  key: string
  name: string
  total: number
  reimbursed: number
  owed: number
  expenses: ExpenseFigures[]
}

export const reimbursementsOwed = (
  staffNames: Map<string, string>,
  index: ExpenseIndex
): ReimbursementOwed[] => {
  const map = new Map<string, ReimbursementOwed>()
  index.forEach((f) => {
    if (!f.recognized || f.expense.paidByType !== 'employee') return
    const key = f.expense.employeeStaffId ?? `name:${(f.expense.employeeName ?? '').toLowerCase()}`
    const row = map.get(key) ?? {
      key,
      name: (f.expense.employeeStaffId && staffNames.get(f.expense.employeeStaffId)) || f.expense.employeeName || 'Employee',
      total: 0,
      reimbursed: 0,
      owed: 0,
      expenses: [],
    }
    row.total += f.expense.total
    row.reimbursed += f.reimbursed
    row.owed += f.reimbursementOutstanding
    row.expenses.push(f)
    map.set(key, row)
  })
  return [...map.values()].sort((a, b) => b.owed - a.owed)
}

export interface DepositPosition {
  figures: ExpenseFigures
  /** Deposit portion actually paid (or paid by an employee). */
  base: number
  refunded: number
  applied: number
  writtenOff: number
  outstanding: number
}

/** Mirrors private.fin_deposit_outstanding. */
export const depositPositions = (data: Pick<FinanceData, 'settlements' | 'ledger'>, index: ExpenseIndex): DepositPosition[] => {
  const reversed = reversedEntryIds(data.ledger)
  const rows: DepositPosition[] = []
  index.forEach((f) => {
    if (f.expense.status !== 'active' || f.classTotals.deposit_advance <= EPS) return
    const depositLines = f.lines.filter((l) => l.classification === 'deposit_advance').reduce((s, l) => s + l.lineTotal, 0)
    const share = f.expense.subtotal > 0 ? depositLines / f.expense.subtotal : 0
    const paidBase = f.expense.paidByType === 'employee' ? f.expense.total : f.netPaid
    const base = paidBase * share
    let refunded = 0
    let applied = 0
    let writtenOff = 0
    data.settlements
      .filter((s) => s.expenseId === f.expense.id)
      .forEach((s) => {
        if (s.ledgerEntryId && reversed.has(s.ledgerEntryId)) return
        if (s.kind === 'applied') {
          const target = s.appliedExpenseId ? index.get(s.appliedExpenseId) : undefined
          if (target?.expense.status !== 'active') return
          applied += s.amount
        } else if (s.kind === 'refund_received') refunded += s.amount
        else writtenOff += s.amount
      })
    rows.push({
      figures: f,
      base,
      refunded,
      applied,
      writtenOff,
      outstanding: Math.max(0, round2(base - refunded - applied - writtenOff)),
    })
  })
  return rows.sort((a, b) => b.outstanding - a.outstanding)
}

// ---------------------------------------------------------------------------
// Investment (Main fund)
// ---------------------------------------------------------------------------

export interface CapitalTotals {
  /** Investment added, net of reversals. */
  added: number
  /** Investment withdrawn, net of reversals. */
  withdrawn: number
  net: number
}

/** Entries dated in the range; a reversal counts on its own date. */
export const capitalTotals = (ledger: FinLedgerEntry[], range: DateRange | null): CapitalTotals => {
  const entries = ledger.filter((e) => dayInRange(e.entryDate, range))
  const added = round2(sumKinds(entries, ['owner_contribution']))
  const withdrawn = round2(sumKinds(entries, ['capital_withdrawal']))
  return { added, withdrawn, net: round2(added - withdrawn) }
}

/** Mirrors the limit in private.fin_record_capital (for form previews). */
export const withdrawableCapital = (ledger: FinLedgerEntry[]): number => Math.max(0, capitalTotals(ledger, null).net)

export interface CapitalEntryRow {
  entry: FinLedgerEntry
  reversed: boolean
}

/** Original capital entries (newest first); reversal rows are folded into `reversed`. */
export const capitalEntries = (ledger: FinLedgerEntry[], range: DateRange | null): CapitalEntryRow[] => {
  const reversed = reversedEntryIds(ledger)
  return ledger
    .filter((e) => CAPITAL_KINDS.includes(e.kind) && !e.reversalOf && dayInRange(e.entryDate, range))
    .map((entry) => ({ entry, reversed: reversed.has(entry.id) }))
    .sort((a, b) => b.entry.entryDate.localeCompare(a.entry.entryDate) || b.entry.createdAt.localeCompare(a.entry.createdAt))
}

export interface CapitalSummary extends CapitalTotals {
  mainFundBalance: number
  /** Cash paid for expenses and reimbursements, net of supplier and deposit refunds. */
  spent: number
  /** Guest payments received, net of guest refunds. */
  guestReceived: number
  /** Every account, including the Main fund and unassigned guest payments. */
  cashOnHand: number
}

/** All-time position up to `asOf`: where the invested money stands. */
export const capitalSummary = (revenueBookings: RevenueBooking[], data: Pick<FinanceData, 'accounts' | 'ledger'>, asOf: string): CapitalSummary => {
  const upTo: DateRange = { from: '0000-01-01', to: asOf }
  const balances = accountBalances(revenueBookings, data, asOf)
  const spent = -data.ledger
    .filter((e) => dayInRange(e.entryDate, upTo) && ['expense_payment', 'expense_refund', 'reimbursement', 'deposit_refund'].includes(e.kind))
    .reduce((s, e) => s + cashEffect(e), 0)
  return {
    ...capitalTotals(data.ledger, upTo),
    mainFundBalance: round2(balances.find((b) => b.accountId === MAIN_FUND_ACCOUNT_ID)?.balance ?? 0),
    spent: round2(spent),
    guestReceived: round2(cashReceived(revenueBookings, upTo).net),
    cashOnHand: round2(balances.reduce((s, b) => s + b.balance, 0)),
  }
}

// ---------------------------------------------------------------------------
// Expense trend
// ---------------------------------------------------------------------------

export interface MonthlyExpenseRow {
  month: string
  incurred: number
  paid: number
}

/** Incurred (recognized, accrual) vs paid (cash out for expenses, net of refunds) per month. */
export const monthlyExpenseTrend = (data: FinanceData, index: ExpenseIndex, range: DateRange | null): MonthlyExpenseRow[] => {
  const map = new Map<string, MonthlyExpenseRow>()
  const row = (m: string) => {
    const r = map.get(m) ?? { month: m, incurred: 0, paid: 0 }
    map.set(m, r)
    return r
  }
  index.forEach((f) => {
    if (!f.recognized || !dayInRange(f.expense.txnDate, range)) return
    row(monthKey(f.expense.txnDate)).incurred += f.expense.total
  })
  data.ledger.forEach((e) => {
    if (!e.expenseId || !dayInRange(e.entryDate, range)) return
    if (!['expense_payment', 'expense_refund', 'reimbursement'].includes(e.kind)) return
    row(monthKey(e.entryDate)).paid += -cashEffect(e)
  })
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month))
}

export { cashReceived, guestBalancesAsOf, revenueEarned }
