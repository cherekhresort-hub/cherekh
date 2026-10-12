import { useMemo, type ReactNode } from 'react'
import { Card, CardDescription, CardTitle } from '../ui/Card'
import { ExportButtons, FinanceNotice, SectionTitle, Stat } from '../finance/shared'
import { money, useFinanceLookups } from '../finance/financeHelpers'
import { businessToday, type DateRange } from '../../../lib/finance/dates'
import type { RevenueBooking } from '../../../lib/finance/revenue'
import {
  accountBalances,
  accumulatedDepreciation,
  assetsHeldAsOf,
  buildExpenseFigures,
  cashFlow,
  investmentSummary,
  profitAndLoss,
  statementPeriod,
} from '../../../lib/finance/reporting'
import type { FinanceData } from '../../../lib/finance/types'
import type { ExportSheet } from '../../../utils/reportExport'
import { cn } from '../../utils/cn'

interface Props {
  data: FinanceData
  revenueBookings: RevenueBooking[]
  range: DateRange | null
  rangeLabel: string
}

interface StatementLine {
  section: string
  label: string
  amount: number | null
  emphasis?: boolean
  note?: string
}

export const FinancialStatementsReport = ({ data, revenueBookings, range, rangeLabel }: Props) => {
  const lookups = useFinanceLookups(data)
  const today = businessToday()
  const period = useMemo(() => statementPeriod(range, today), [range, today])
  const asOf = period.to
  const periodLabel = !range || range.to > today ? `${rangeLabel}, up to ${asOf}` : rangeLabel
  const index = useMemo(() => buildExpenseFigures(data), [data])
  const pnl = useMemo(() => profitAndLoss(revenueBookings, data, index, period, today), [revenueBookings, data, index, period, today])
  const cash = useMemo(() => cashFlow(revenueBookings, data, index, period), [revenueBookings, data, index, period])
  const balances = useMemo(() => accountBalances(revenueBookings, data, asOf), [revenueBookings, data, asOf])
  const summary = useMemo(() => investmentSummary(revenueBookings, data, index, asOf), [revenueBookings, data, index, asOf])
  const rec = summary.position
  const assets = useMemo(() => {
    const held = assetsHeldAsOf(data.assets, index, asOf)
    const cost = held.reduce((s, a) => s + a.cost, 0)
    const dep = held.reduce((s, a) => s + accumulatedDepreciation(a, asOf), 0)
    return { cost, dep, count: held.length }
  }, [data.assets, index, asOf])
  const optional = (section: string, label: string, amount: number, note?: string): StatementLine[] =>
    Math.abs(amount) >= 0.5 ? [{ section, label, amount, note }] : []
  const isProfit = summary.profit >= 0

  // --- Investment summary (since the start) --------------------------------
  const capitalLines: StatementLine[] = [
    { section: 'Investment', label: 'Investment added', amount: summary.added },
    { section: 'Investment', label: 'Less: investment withdrawn', amount: -summary.withdrawn },
    { section: 'Investment', label: 'Net investment', amount: summary.netInvestment, emphasis: true },
    { section: 'Result', label: isProfit ? 'Add: profit to date (before tax)' : 'Less: loss to date (before tax)', amount: summary.profit },
    ...optional('Other items', 'Opening balances entered on accounts', rec.openingBalances),
    ...optional('Other items', 'Money kept on cancelled bookings', rec.cancelledKept, 'Not revenue until reviewed'),
    ...optional('Other items', 'Balance adjustments', rec.adjustments),
    ...optional('Other items', 'Assets entered without a recorded purchase', rec.assetsWithoutPurchase),
    ...optional('Other items', 'Capital purchases not matching the asset register', rec.capitalRegisterGap, 'Register cost − capital lines on expenses'),
    ...optional('Other items', 'Disposed / written-off assets (loss not recorded)', rec.disposedAssets),
    ...optional('Other items', 'Unpaid deposits (owed, not yet held)', rec.unpaidDeposits),
    ...optional('Other items', 'Not explained by the records', rec.unexplained, 'Check dates and entries'),
    { section: 'Closing capital', label: 'Closing capital (= total remaining)', amount: summary.closingCapital, emphasis: true },
  ]
  const costLines: StatementLine[] = [
    ...summary.costs.operatingByCategory.map((c) => ({ section: 'Operating costs', label: lookups.topCategoryName(c.key), amount: c.amount })),
    { section: 'Operating costs', label: 'Total operating costs', amount: summary.costs.operating, emphasis: true },
    { section: 'Finance costs', label: 'Interest & bank charges', amount: summary.costs.financing },
    { section: 'Capital assets', label: 'Fixed assets purchased (building, furniture, equipment…)', amount: summary.costs.capitalPurchases },
    { section: 'Total', label: 'Total costs', amount: summary.costs.total, emphasis: true },
    { section: 'Not a cost', label: 'Deposits & advances placed (refundable)', amount: summary.depositsPlaced, note: 'Held as an asset until refunded or used' },
    { section: 'Payment status (all expenses recorded)', label: 'Paid', amount: summary.expensesPaid },
    { section: 'Payment status (all expenses recorded)', label: 'Still owed', amount: summary.expensesOwed },
  ]
  const profitLines: StatementLine[] = [
    { section: 'Income', label: 'Room revenue', amount: summary.revenue.rooms },
    { section: 'Income', label: 'Food (booking extras)', amount: summary.revenue.food },
    { section: 'Income', label: 'Other booking extras', amount: summary.revenue.other },
    { section: 'Income', label: 'Total revenue', amount: summary.revenue.total, emphasis: true },
    { section: 'Expenses', label: 'Less: operating costs', amount: -summary.costs.operating },
    { section: 'Expenses', label: 'Less: depreciation (wear of fixed assets)', amount: -summary.depreciation },
    { section: 'Expenses', label: 'Less: interest & bank charges', amount: -summary.costs.financing },
    { section: 'Result', label: isProfit ? 'Profit before tax' : 'Loss before tax', amount: summary.profit, emphasis: true },
  ]
  const remainingLines: StatementLine[] = [
    ...balances.map((b) => ({ section: 'The business has', label: `Cash & bank: ${b.name}`, amount: b.balance })),
    { section: 'The business has', label: `Fixed assets at cost (${assets.count})`, amount: assets.cost },
    { section: 'The business has', label: 'Less: accumulated depreciation', amount: -assets.dep },
    { section: 'The business has', label: 'Deposits & advances held by others', amount: rec.depositsHeld, note: 'Current figure' },
    { section: 'The business has', label: 'Guest balances still to collect', amount: rec.receivables },
    { section: 'The business has', label: 'Total the business has', amount: rec.has, emphasis: true },
    { section: 'Less: the business owes', label: 'Owed to suppliers', amount: -rec.payables, note: 'Current figure' },
    { section: 'Less: the business owes', label: 'Owed to employees (reimbursements)', amount: -rec.staffOwed, note: 'Current figure' },
    { section: 'Less: the business owes', label: 'Guest advance payments for future stays', amount: -rec.guestAdvances },
    { section: 'Less: the business owes', label: 'Total owed', amount: -rec.owes, emphasis: true },
    { section: 'Total remaining', label: 'Total remaining (net assets)', amount: rec.netWorth, emphasis: true },
  ]

  // --- Selected period ------------------------------------------------------
  const pnlLines: StatementLine[] = [
    { section: 'Revenue', label: 'Room revenue', amount: pnl.revenue.rooms },
    { section: 'Revenue', label: 'Food (booking extras)', amount: pnl.revenue.food },
    { section: 'Revenue', label: 'Other booking extras', amount: pnl.revenue.other },
    { section: 'Revenue', label: 'Total revenue', amount: pnl.revenue.total, emphasis: true },
    ...pnl.operatingByCategory.map((c) => ({ section: 'Operating expenses', label: lookups.topCategoryName(c.key), amount: -c.amount })),
    { section: 'Operating expenses', label: 'Total operating expenses', amount: -pnl.operatingExpenses, emphasis: true },
    { section: 'Result', label: 'Operating result', amount: pnl.operatingResult, emphasis: true },
    { section: 'Result', label: 'Depreciation (configured assets only)', amount: -pnl.depreciation },
    { section: 'Result', label: 'Financing costs (interest, bank charges)', amount: -pnl.financingCosts },
    { section: 'Result', label: 'Result before tax (incomplete, see notes)', amount: pnl.resultBeforeTax, emphasis: true },
    { section: 'Not in P&L', label: 'Capital asset purchases', amount: pnl.capitalSpend },
    { section: 'Not in P&L', label: 'Deposits & advances placed', amount: pnl.depositsPlaced },
  ]
  const cashLines: StatementLine[] = [
    ...cash.operating.lines.map((l) => ({ section: 'Operating activities', label: l.label, amount: l.amount })),
    { section: 'Operating activities', label: 'Net cash from operations', amount: cash.operating.net, emphasis: true },
    ...cash.investing.lines.map((l) => ({ section: 'Investing activities', label: l.label, amount: l.amount })),
    { section: 'Investing activities', label: 'Net cash from investing', amount: cash.investing.net, emphasis: true },
    ...cash.financing.lines.map((l) => ({ section: 'Financing activities', label: l.label, amount: l.amount })),
    { section: 'Financing activities', label: 'Net cash from financing', amount: cash.financing.net, emphasis: true },
    { section: 'Other', label: 'Balance adjustments', amount: cash.adjustments },
    { section: 'Other', label: 'Net change in cash', amount: cash.netChange, emphasis: true },
    { section: 'Other', label: 'Transfers between accounts (excluded)', amount: cash.transfersExcluded, note: 'Moves money between accounts; no net effect' },
  ]

  const columns = [
    { header: 'Section', value: (l: StatementLine) => l.section, width: 24 },
    { header: 'Line', value: (l: StatementLine) => l.label, width: 54 },
    { header: 'Amount (BDT)', value: (l: StatementLine) => (l.amount === null ? '' : Math.round(l.amount * 100) / 100) },
    { header: 'Note', value: (l: StatementLine) => l.note ?? '', width: 30 },
  ]
  const prefixed = (statement: string, lines: StatementLine[]) => lines.map((l) => ({ ...l, section: `${statement} · ${l.section}` }))
  const sheets: ExportSheet<StatementLine>[] = [
    {
      name: `Investment summary ${asOf}`,
      columns,
      rows: [
        ...prefixed('Capital account', capitalLines),
        ...prefixed('Total costs', costLines),
        ...prefixed('Profit or loss', profitLines),
        ...prefixed('What remains', remainingLines),
      ],
    },
    { name: 'Profit and loss', columns, rows: [...pnlLines, ...pnl.notes.map((n) => ({ section: 'Notes', label: n, amount: null }))] },
    { name: 'Cash flow', columns, rows: cashLines },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Financial statements"
        description={`Investment summary since the start, up to ${asOf} · period statements: ${periodLabel}`}
        actions={<ExportButtons options={{ title: 'Financial statements', filenameBase: 'cherekh-financial-statements', period: periodLabel }} sheets={sheets} />}
      />
      <FinanceNotice title="These statements are management figures, not audited accounts" tone="sky">
        Revenue comes from bookings only (restaurant walk-in sales aren’t recorded yet), inventory is expensed when bought, and income tax isn’t calculated, so the bottom line is shown as
        profit or loss before tax.
      </FinanceNotice>

      <Card padded={false} className="p-6 space-y-5">
        <div>
          <CardTitle>Investment summary</CardTitle>
          <CardDescription>Everything since the business started, up to {asOf}. Does not change with the period filter.</CardDescription>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Total investment" value={money(summary.netInvestment)} hint={`Added ${money(summary.added)} · withdrawn ${money(summary.withdrawn)}`} />
          <Stat
            label="Total costs"
            value={money(summary.costs.total)}
            hint={`Operating ${money(summary.costs.operating)} · fixed assets ${money(summary.costs.capitalPurchases)}`}
          />
          <Stat label="Total remaining" value={money(rec.netWorth)} hint={`Cash ${money(rec.cash)} · fixed assets ${money(rec.fixedAssets)}`} />
          <Stat
            label={isProfit ? 'Profit (before tax)' : 'Loss (before tax)'}
            value={money(summary.profit)}
            tone={isProfit ? 'good' : 'bad'}
            hint={`Revenue ${money(summary.revenue.total)} − costs & depreciation`}
          />
        </div>
        <p className="text-sm text-stone-600 rounded-xl bg-stone-50 px-3 py-2">
          Net investment <strong>{money(summary.netInvestment)}</strong> {isProfit ? '+ profit' : '− loss'} <strong>{money(Math.abs(summary.profit))}</strong>
          {Math.abs(summary.otherItems) >= 0.5 && (
            <>
              {' '}
              {summary.otherItems < 0 ? '−' : '+'} other items <strong>{money(Math.abs(summary.otherItems))}</strong>
            </>
          )}{' '}
          = total remaining <strong>{money(rec.netWorth)}</strong>. Fixed assets are part of what remains, not money lost: only their yearly depreciation counts against profit.
        </p>
        {Math.abs(rec.unexplained) >= 1 && (
          <FinanceNotice title={`${money(rec.unexplained)} isn’t explained by the records`} tone="amber">
            Usually an expense or payment dated after today, a payment recorded before an account’s opening date, or an expense paid more than its total.
          </FinanceNotice>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Statement title="1. Capital account" description="What was invested and how it stands today" lines={capitalLines} />
          <Statement title="2. Total costs" description="Everything the business has spent or owes for" lines={costLines} />
          <Statement title="3. Profit or loss" description="Income minus the costs that belong to it" lines={profitLines} />
          <Statement title="4. What remains" description="What the business has minus what it owes" lines={remainingLines} />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Statement title="Profit & loss" description={`Accrual basis · ${periodLabel}`} lines={pnlLines}>
          <ul className="mt-4 space-y-1 text-xs text-stone-500 list-disc pl-4">
            {pnl.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Statement>
        <Statement title="Cash flow" description={`Money actually received and paid · ${periodLabel}`} lines={cashLines} />
      </div>
    </div>
  )
}

const Statement = ({ title, description, lines, children }: { title: string; description: string; lines: StatementLine[]; children?: ReactNode }) => {
  const sections = [...new Set(lines.map((l) => l.section))]
  return (
    <Card padded={false} className="p-6">
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mb-4">{description}</CardDescription>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section}>
            <p className="text-[11px] uppercase tracking-wide text-stone-500 font-medium mb-1">{section}</p>
            <table className="w-full text-sm">
              <tbody>
                {lines
                  .filter((l) => l.section === section)
                  .map((l, i) => (
                    <tr key={`${l.label}-${i}`} className={cn(l.emphasis && 'border-t border-stone-200 font-medium text-forest-700')}>
                      <td className="py-1 pr-3">
                        {l.label}
                        {l.note && <span className="ml-1 text-[11px] text-stone-400">({l.note})</span>}
                      </td>
                      <td className={cn('py-1 text-right tabular-nums whitespace-nowrap', (l.amount ?? 0) < 0 && 'text-red-700')}>{l.amount === null ? '' : money(l.amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {children}
    </Card>
  )
}
