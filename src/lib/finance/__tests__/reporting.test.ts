import { describe, expect, it } from 'vitest'
import {
  accountBalances,
  assetDepreciation,
  assetsHeldAsOf,
  buildExpenseFigures,
  capitalEntries,
  capitalSummary,
  capitalTotals,
  cashFlow,
  depositPositions,
  expensesIncurred,
  profitAndLoss,
  reimbursementsOwed,
  reversedEntryIds,
  statementPeriod,
  supplierPayables,
  withdrawableCapital,
} from '../reporting'
import { MAIN_FUND_ACCOUNT_ID } from '../types'
import { account, asset, booking, entry, expense, financeData, reversal } from './fixtures'

const MARCH = { from: '2026-03-01', to: '2026-03-31' }
const TODAY = '2026-03-31'

const roomBooking = booking({ nights: ['2026-03-05', '2026-03-06'], total: 6000, cash: [{ amount: 6000, isRefund: false, day: '2026-03-05', method: 'cash' }] })

const totalBalance = (data: ReturnType<typeof financeData>, bookings = [roomBooking]) =>
  accountBalances(bookings, data, TODAY).reduce((s, b) => s + b.balance, 0)

const withMainFund = (parts: Parameters<typeof financeData>[0]) =>
  financeData({ accounts: [account(MAIN_FUND_ACCOUNT_ID, []), account('acc-cash', ['cash']), account('acc-bank', ['bank-transfer', 'card'])], ...parts })

describe('accounting invariants', () => {
  it('1. investment added is not revenue', () => {
    const data = withMainFund({ ledger: [entry({ kind: 'owner_contribution', amount: 500000, accountId: MAIN_FUND_ACCOUNT_ID })] })
    const index = buildExpenseFigures(data)
    const pnl = profitAndLoss([roomBooking], data, index, MARCH, TODAY)
    expect(pnl.revenue.total).toBe(6000)
    expect(pnl.resultBeforeTax).toBe(6000)
    const cf = cashFlow([roomBooking], data, index, MARCH)
    expect(cf.operating.net).toBe(6000)
    expect(cf.financing.net).toBe(500000)
    expect(cf.financing.lines).toEqual([
      { label: 'Investment added', amount: 500000 },
      { label: 'Investment withdrawn', amount: 0 },
    ])
  })

  it('2. an investment withdrawal is not an expense', () => {
    const data = withMainFund({
      ledger: [
        entry({ kind: 'owner_contribution', amount: 100000, accountId: MAIN_FUND_ACCOUNT_ID, date: '2026-02-01' }),
        entry({ kind: 'capital_withdrawal', amount: 30000, accountId: MAIN_FUND_ACCOUNT_ID }),
      ],
    })
    const index = buildExpenseFigures(data)
    const pnl = profitAndLoss([], data, index, MARCH, TODAY)
    expect(pnl.operatingExpenses).toBe(0)
    expect(pnl.resultBeforeTax).toBe(0)
    const cf = cashFlow([], data, index, MARCH)
    expect(cf.operating.net).toBe(0)
    expect(cf.financing.net).toBe(-30000)
    expect(capitalTotals(data.ledger, null)).toEqual({ added: 100000, withdrawn: 30000, net: 70000 })
  })

  it('3. financing costs come from expenses classified as financing cost', () => {
    const e = expense({ id: 'fc', lines: [{ classification: 'financing_cost', amount: 1500 }] })
    const data = financeData({ built: [e], ledger: [entry({ kind: 'expense_payment', amount: 1500, expenseId: 'fc' })] })
    const index = buildExpenseFigures(data)
    const pnl = profitAndLoss([], data, index, MARCH, TODAY)
    expect(pnl.operatingExpenses).toBe(0)
    expect(pnl.financingCosts).toBe(1500)
    expect(pnl.resultBeforeTax).toBe(-1500)
  })

  it('4. transfers between accounts are cash-neutral', () => {
    const out = entry({ kind: 'transfer_out', amount: 3000, accountId: 'acc-cash', transferGroupId: 'g1' })
    const inn = entry({ kind: 'transfer_in', amount: 3000, accountId: 'acc-bank', transferGroupId: 'g1' })
    const before = financeData({})
    const after = financeData({ ledger: [out, inn] })
    expect(totalBalance(after)).toBe(totalBalance(before))
    const balances = accountBalances([roomBooking], after, TODAY)
    expect(balances.find((b) => b.accountId === 'acc-cash')!.balance).toBe(3000)
    expect(balances.find((b) => b.accountId === 'acc-bank')!.balance).toBe(3000)
    const cf = cashFlow([roomBooking], after, buildExpenseFigures(after), MARCH)
    expect(cf.netChange).toBe(6000)
    expect(cf.transfersExcluded).toBe(3000)
    expect(profitAndLoss([roomBooking], after, buildExpenseFigures(after), MARCH, TODAY).operatingExpenses).toBe(0)
  })

  it('5. paying an expense does not create a second expense', () => {
    const e = expense({ id: 'e5', lines: [{ classification: 'operating_expense', amount: 1000 }] })
    const data = financeData({
      built: [e],
      ledger: [entry({ kind: 'expense_payment', amount: 400, expenseId: 'e5' }), entry({ kind: 'expense_payment', amount: 600, expenseId: 'e5', date: '2026-03-20' })],
    })
    const index = buildExpenseFigures(data)
    expect(expensesIncurred(data, index, MARCH).total).toBe(1000)
    expect(profitAndLoss([], data, index, MARCH, TODAY).operatingExpenses).toBe(1000)
    expect(index.get('e5')!.paymentStatus).toBe('paid')
    expect(cashFlow([], data, index, MARCH).operating.net).toBe(-1000)
  })

  it('6. capital purchases are not operating expenses', () => {
    const e = expense({ id: 'e6', lines: [{ classification: 'capital_asset', amount: 120000 }, { classification: 'operating_expense', amount: 5000 }] })
    const data = financeData({ built: [e], ledger: [entry({ kind: 'expense_payment', amount: 125000, expenseId: 'e6' })] })
    const index = buildExpenseFigures(data)
    const pnl = profitAndLoss([], data, index, MARCH, TODAY)
    expect(pnl.operatingExpenses).toBe(5000)
    expect(pnl.capitalSpend).toBe(120000)
    expect(pnl.depreciation).toBe(0)
    const cf = cashFlow([], data, index, MARCH)
    expect(cf.investing.net).toBe(-120000)
    expect(cf.operating.net).toBe(-5000)
  })

  it('7. inventory is counted once (periodic method) and not again when paid', () => {
    const e = expense({ id: 'e7', lines: [{ classification: 'inventory', amount: 8000 }] })
    const data = financeData({ built: [e], ledger: [entry({ kind: 'expense_payment', amount: 8000, expenseId: 'e7' })] })
    const index = buildExpenseFigures(data)
    const pnl = profitAndLoss([], data, index, MARCH, TODAY)
    expect(pnl.operatingExpenses).toBe(8000)
    expect(pnl.capitalSpend).toBe(0)
    expect(data.assets).toHaveLength(0)
    expect(cashFlow([], data, index, MARCH).operating.net).toBe(-8000)
  })

  it('8. moving money out of the Main fund is cash-neutral', () => {
    const invest = entry({ kind: 'owner_contribution', amount: 200000, accountId: MAIN_FUND_ACCOUNT_ID })
    const before = withMainFund({ ledger: [invest] })
    const after = withMainFund({
      ledger: [
        invest,
        entry({ kind: 'transfer_out', amount: 50000, accountId: MAIN_FUND_ACCOUNT_ID, transferGroupId: 'g8' }),
        entry({ kind: 'transfer_in', amount: 50000, accountId: 'acc-cash', transferGroupId: 'g8' }),
      ],
    })
    expect(totalBalance(after, [])).toBe(totalBalance(before, []))
    const balances = accountBalances([], after, TODAY)
    expect(balances.find((b) => b.accountId === MAIN_FUND_ACCOUNT_ID)!.balance).toBe(150000)
    expect(balances.find((b) => b.accountId === 'acc-cash')!.balance).toBe(50000)
    expect(cashFlow([], after, buildExpenseFigures(after), MARCH).netChange).toBe(200000)
  })

  it('9. a partial payment is not "paid"', () => {
    const e = expense({ id: 'e9', lines: [{ classification: 'operating_expense', amount: 1000 }] })
    const data = financeData({ built: [e], ledger: [entry({ kind: 'expense_payment', amount: 250, expenseId: 'e9' })] })
    const f = buildExpenseFigures(data).get('e9')!
    expect(f.paymentStatus).toBe('partial')
    expect(f.outstanding).toBe(750)
    expect(supplierPayables(data, buildExpenseFigures(data))[0].outstanding).toBe(750)
  })

  it('10. voided expenses stay auditable through reversals and drop out of totals', () => {
    const e = expense({ id: 'e10', status: 'void', lines: [{ classification: 'operating_expense', amount: 900 }] })
    const pay = entry({ kind: 'expense_payment', amount: 900, expenseId: 'e10' })
    const rev = reversal(pay)
    const data = financeData({ built: [e], ledger: [pay, rev] })
    const index = buildExpenseFigures(data)
    const f = index.get('e10')!
    expect(f.recognized).toBe(false)
    expect(f.paymentStatus).toBe('void')
    expect(f.cashPaidNet).toBe(0)
    expect(data.ledger).toHaveLength(2)
    expect(reversedEntryIds(data.ledger).has(pay.id)).toBe(true)
    expect(profitAndLoss([], data, index, MARCH, TODAY).operatingExpenses).toBe(0)
    expect(totalBalance(data, [])).toBe(0)
    expect(cashFlow([], data, index, MARCH).netChange).toBe(0)
  })
})

describe('payments, refunds and reimbursements', () => {
  it('supplier refund reduces net paid and reopens the balance', () => {
    const e = expense({ id: 'r1', lines: [{ classification: 'operating_expense', amount: 1000 }] })
    const data = financeData({
      built: [e],
      ledger: [entry({ kind: 'expense_payment', amount: 1000, expenseId: 'r1' }), entry({ kind: 'expense_refund', amount: 200, expenseId: 'r1' })],
    })
    const f = buildExpenseFigures(data).get('r1')!
    expect(f.cashPaidNet).toBe(800)
    expect(f.outstanding).toBe(200)
    expect(f.paymentStatus).toBe('partial')
  })

  it('fully refunded purchases show as refunded', () => {
    const e = expense({ id: 'r2', lines: [{ classification: 'operating_expense', amount: 500 }] })
    const data = financeData({
      built: [e],
      ledger: [entry({ kind: 'expense_payment', amount: 500, expenseId: 'r2' }), entry({ kind: 'expense_refund', amount: 500, expenseId: 'r2' })],
    })
    expect(buildExpenseFigures(data).get('r2')!.paymentStatus).toBe('refunded')
  })

  it('employee-paid expense counts once; reimbursement is cash out without a second expense', () => {
    const e = expense({ id: 'emp', paidBy: 'employee', lines: [{ classification: 'operating_expense', amount: 1200 }] })
    const data = financeData({ built: [e], ledger: [entry({ kind: 'reimbursement', amount: 700, expenseId: 'emp' })] })
    const index = buildExpenseFigures(data)
    const f = index.get('emp')!
    expect(f.outstanding).toBe(0)
    expect(f.reimbursementOutstanding).toBe(500)
    expect(f.reimbursementStatus).toBe('partial')
    expect(expensesIncurred(data, index, MARCH).total).toBe(1200)
    expect(reimbursementsOwed(new Map(), index)[0].owed).toBe(500)
    expect(supplierPayables(data, index)).toHaveLength(0)
    expect(cashFlow([], data, index, MARCH).operating.net).toBe(-700)
  })

  it('reversed payment no longer counts', () => {
    const e = expense({ id: 'rv', lines: [{ classification: 'operating_expense', amount: 300 }] })
    const pay = entry({ kind: 'expense_payment', amount: 300, expenseId: 'rv' })
    const data = financeData({ built: [e], ledger: [pay, reversal(pay)] })
    const f = buildExpenseFigures(data).get('rv')!
    expect(f.paymentStatus).toBe('unpaid')
    expect(f.outstanding).toBe(300)
  })

  it('discounts and tax are spread across lines pro-rata', () => {
    const e = expense({ id: 'pr', discount: 100, tax: 50, lines: [{ classification: 'operating_expense', amount: 600 }, { classification: 'capital_asset', amount: 400 }] })
    const data = financeData({ built: [e] })
    const f = buildExpenseFigures(data).get('pr')!
    expect(f.expense.total).toBe(950)
    expect(f.classTotals.operating_expense).toBeCloseTo(570)
    expect(f.classTotals.capital_asset).toBeCloseTo(380)
  })

  it('rejected and void expenses are excluded; pending ones are included and flagged', () => {
    const data = financeData({
      built: [
        expense({ id: 'ok', lines: [{ classification: 'operating_expense', amount: 100 }] }),
        expense({ id: 'pend', approval: 'pending', lines: [{ classification: 'operating_expense', amount: 200 }] }),
        expense({ id: 'rej', approval: 'rejected', lines: [{ classification: 'operating_expense', amount: 400 }] }),
        expense({ id: 'void', status: 'void', lines: [{ classification: 'operating_expense', amount: 800 }] }),
      ],
    })
    const inc = expensesIncurred(data, buildExpenseFigures(data), MARCH)
    expect(inc.operating).toBe(300)
    expect(inc.pendingApprovalCount).toBe(1)
    expect(inc.pendingApprovalAmount).toBe(200)
  })
})

describe('deposits and advances', () => {
  it('deposits stay off the P&L until written off, and applied advances settle another bill', () => {
    const dep = expense({ id: 'dep', lines: [{ classification: 'deposit_advance', amount: 10000 }] })
    const bill = expense({ id: 'bill', lines: [{ classification: 'operating_expense', amount: 6000 }] })
    const data = financeData({
      built: [dep, bill],
      ledger: [entry({ kind: 'expense_payment', amount: 10000, expenseId: 'dep' })],
      settlements: [
        { id: 's1', expenseId: 'dep', settlementDate: '2026-03-15', amount: 6000, kind: 'applied', ledgerEntryId: null, appliedExpenseId: 'bill', notes: null, createdBy: null, createdAt: '' },
        { id: 's2', expenseId: 'dep', settlementDate: '2026-03-20', amount: 1000, kind: 'written_off', ledgerEntryId: null, appliedExpenseId: null, notes: 'lost', createdBy: null, createdAt: '' },
      ],
    })
    const index = buildExpenseFigures(data)
    expect(index.get('bill')!.paymentStatus).toBe('paid')
    const pos = depositPositions(data, index).find((d) => d.figures.expense.id === 'dep')!
    expect(pos.outstanding).toBe(3000)
    const pnl = profitAndLoss([], data, index, MARCH, TODAY)
    expect(pnl.operatingExpenses).toBe(7000)
    expect(pnl.depositsPlaced).toBe(10000)
    // Only the deposit payment moved cash; applying it to the bill did not.
    expect(cashFlow([], data, index, MARCH).netChange).toBe(-10000)
  })
})

describe('account balances', () => {
  it('opening balance + guest receipts by method + ledger, respecting opening date', () => {
    const data = financeData({
      accounts: [account('acc-cash', ['cash'], 5000, '2026-03-01'), account('acc-bank', ['bank-transfer'])],
      ledger: [entry({ kind: 'expense_payment', amount: 1000, accountId: 'acc-cash' }), entry({ kind: 'expense_payment', amount: 99, accountId: 'acc-cash', date: '2026-02-01' })],
    })
    const bookings = [
      booking({ nights: ['2026-03-05'], total: 2000, cash: [{ amount: 2000, isRefund: false, day: '2026-03-05', method: 'cash' }] }),
      booking({ nights: ['2026-03-06'], total: 3000, cash: [{ amount: 3000, isRefund: false, day: '2026-03-06', method: 'bank-transfer' }, { amount: 500, isRefund: true, day: '2026-03-07', method: 'bank-transfer' }] }),
      booking({ nights: ['2026-03-07'], total: 400, cash: [{ amount: 400, isRefund: false, day: '2026-03-07', method: 'bkash' }] }),
    ]
    const balances = accountBalances(bookings, data, TODAY)
    expect(balances.find((b) => b.accountId === 'acc-cash')!.balance).toBe(5000 + 2000 - 1000)
    expect(balances.find((b) => b.accountId === 'acc-bank')!.balance).toBe(2500)
    expect(balances.find((b) => b.accountId === 'unassigned')!.balance).toBe(400)
  })
})

describe('investment (Main fund)', () => {
  it('a reversed investment drops out of the totals and the withdrawal limit', () => {
    const first = entry({ kind: 'owner_contribution', amount: 300000, accountId: MAIN_FUND_ACCOUNT_ID, date: '2026-03-02', counterparty: 'Partner A' })
    const second = entry({ kind: 'owner_contribution', amount: 50000, accountId: MAIN_FUND_ACCOUNT_ID, date: '2026-03-03' })
    const withdrawal = entry({ kind: 'capital_withdrawal', amount: 20000, accountId: MAIN_FUND_ACCOUNT_ID, date: '2026-03-04' })
    const undo = { ...reversal(first), entryDate: '2026-04-02' }
    const ledger = [first, second, withdrawal, undo]

    expect(withdrawableCapital(ledger)).toBe(30000)
    expect(capitalTotals(ledger, null)).toEqual({ added: 50000, withdrawn: 20000, net: 30000 })
    // The reversal counts on its own date, so March still shows the original.
    expect(capitalTotals(ledger, MARCH).added).toBe(350000)

    const rows = capitalEntries(ledger, null)
    expect(rows.map((r) => r.entry.id)).toEqual([withdrawal.id, second.id, first.id])
    expect(rows.find((r) => r.entry.id === first.id)!.reversed).toBe(true)
    expect(rows.some((r) => r.entry.id === undo.id)).toBe(false)
  })

  it('the withdrawal limit never goes below zero', () => {
    expect(withdrawableCapital([entry({ kind: 'capital_withdrawal', amount: 10 })])).toBe(0)
  })

  it('summary shows where the invested money stands', () => {
    const bill = expense({ id: 'm1', lines: [{ classification: 'operating_expense', amount: 30000 }] })
    const data = withMainFund({
      built: [bill],
      ledger: [
        entry({ kind: 'owner_contribution', amount: 500000, accountId: MAIN_FUND_ACCOUNT_ID, date: '2026-03-01' }),
        entry({ kind: 'transfer_out', amount: 100000, accountId: MAIN_FUND_ACCOUNT_ID, transferGroupId: 'gm' }),
        entry({ kind: 'transfer_in', amount: 100000, accountId: 'acc-cash', transferGroupId: 'gm' }),
        entry({ kind: 'expense_payment', amount: 30000, accountId: 'acc-cash', expenseId: 'm1' }),
        entry({ kind: 'expense_refund', amount: 2000, accountId: 'acc-cash', expenseId: 'm1' }),
        entry({ kind: 'owner_contribution', amount: 99999, accountId: MAIN_FUND_ACCOUNT_ID, date: '2026-04-15' }),
      ],
    })
    const s = capitalSummary([roomBooking], data, TODAY)
    expect(s.added).toBe(500000)
    expect(s.net).toBe(500000)
    expect(s.mainFundBalance).toBe(400000)
    expect(s.spent).toBe(28000)
    expect(s.guestReceived).toBe(6000)
    expect(s.cashOnHand).toBe(500000 + 6000 - 28000)
  })
})

describe('depreciation', () => {
  it('is zero without a useful life', () => {
    expect(assetDepreciation(asset(120000, '2026-01-01', null), null, TODAY)).toBe(0)
  })

  it('is straight-line by day and stops at the end of useful life', () => {
    const a = asset(36500, '2026-01-01', 12)
    const year = assetDepreciation(a, { from: '2026-01-01', to: '2026-12-31' }, TODAY)
    expect(year).toBeCloseTo(36500, 0)
    const jan = assetDepreciation(a, { from: '2026-01-01', to: '2026-01-31' }, TODAY)
    expect(jan).toBeCloseTo((36500 * 31) / 365, 2)
    expect(assetDepreciation(a, { from: '2027-02-01', to: '2027-02-28' }, TODAY)).toBe(0)
  })

  it('respects salvage value', () => {
    const a = asset(10000, '2026-01-01', 12, 2000)
    expect(assetDepreciation(a, { from: '2026-01-01', to: '2026-12-31' }, TODAY)).toBeCloseTo(8000, 0)
  })

  it('leaves out assets bought on a rejected expense', () => {
    const rejected = expense({ id: 'exp-rej', date: '2026-01-01', approval: 'rejected', lines: [{ amount: 36500, classification: 'capital_asset' }] })
    const kept = expense({ id: 'exp-ok', date: '2026-01-01', lines: [{ amount: 36500, classification: 'capital_asset' }] })
    const assets = [
      { ...asset(36500, '2026-01-01', 12), expenseId: 'exp-rej' },
      { ...asset(36500, '2026-01-01', 12), expenseId: 'exp-ok' },
    ]
    const data = financeData({ built: [rejected, kept], assets })
    const index = buildExpenseFigures(data)
    expect(profitAndLoss([], data, index, MARCH, TODAY).depreciation).toBeCloseTo((36500 * 31) / 365, 2)
    expect(assetsHeldAsOf(data.assets, index, TODAY).map((a) => a.expenseId)).toEqual(['exp-ok'])
  })

  it('keeps an asset in the position until its disposal date', () => {
    const sold = { ...asset(50000, '2026-01-01', null), status: 'disposed' as const, disposalDate: '2026-03-15' }
    const index = buildExpenseFigures(financeData({}))
    expect(assetsHeldAsOf([sold], index, '2026-03-10')).toHaveLength(1)
    expect(assetsHeldAsOf([sold], index, '2026-03-15')).toHaveLength(0)
  })
})

describe('statement period', () => {
  it('stops at today so future nights and depreciation are not counted yet', () => {
    expect(statementPeriod({ from: '2026-03-01', to: '2026-03-31' }, '2026-03-10')).toEqual({ from: '2026-03-01', to: '2026-03-10' })
    expect(statementPeriod({ from: '2026-02-01', to: '2026-02-28' }, '2026-03-10')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(statementPeriod(null, '2026-03-10')).toEqual({ from: '0000-01-01', to: '2026-03-10' })
  })

  it('leaves future confirmed nights out of revenue', () => {
    const stay = booking({ nights: ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12'], total: 8000 })
    const data = financeData({})
    const pnl = profitAndLoss([stay], data, buildExpenseFigures(data), statementPeriod(MARCH, '2026-03-10'), '2026-03-10')
    expect(pnl.revenue.total).toBe(4000)
  })
})
