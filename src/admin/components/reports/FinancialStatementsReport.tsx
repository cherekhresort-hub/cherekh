import { useMemo, type ReactNode } from 'react'
import { Card, CardDescription, CardTitle } from '../ui/Card'
import { ExportButtons, FinanceNotice, SectionTitle } from '../finance/shared'
import { money, useFinanceLookups } from '../finance/financeHelpers'
import { businessToday, type DateRange } from '../../../lib/finance/dates'
import type { RevenueBooking } from '../../../lib/finance/revenue'
import {
  accountBalances,
  accumulatedDepreciation,
  assetsHeldAsOf,
  buildExpenseFigures,
  capitalTotals,
  cashFlow,
  depositPositions,
  guestBalancesAsOf,
  profitAndLoss,
  reimbursementsOwed,
  statementPeriod,
  supplierPayables,
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
  const guest = useMemo(() => guestBalancesAsOf(revenueBookings, asOf), [revenueBookings, asOf])
  const capital = useMemo(() => capitalTotals(data.ledger, { from: '0000-01-01', to: asOf }), [data.ledger, asOf])
  const payables = useMemo(() => supplierPayables(data, index).reduce((s, p) => s + p.outstanding, 0), [data, index])
  const staffOwed = useMemo(() => reimbursementsOwed(new Map(), index).reduce((s, r) => s + r.owed, 0), [index])
  const deposits = useMemo(() => depositPositions(data, index).reduce((s, d) => s + d.outstanding, 0), [data, index])
  const assets = useMemo(() => {
    const held = assetsHeldAsOf(data.assets, index, asOf)
    const cost = held.reduce((s, a) => s + a.cost, 0)
    const dep = held.reduce((s, a) => s + accumulatedDepreciation(a, asOf), 0)
    return { cost, dep, count: held.length }
  }, [data.assets, index, asOf])
  const cashTotal = balances.reduce((s, b) => s + b.balance, 0)

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
  const positionLines: StatementLine[] = [
    ...balances.map((b) => ({ section: 'What the business has', label: `Cash & bank: ${b.name}`, amount: b.balance })),
    { section: 'What the business has', label: 'Guest balances still to collect (stays already earned)', amount: guest.receivables },
    { section: 'What the business has', label: 'Deposits & advances held by others', amount: deposits, note: 'Current figure' },
    { section: 'What the business has', label: `Fixed assets at cost (${assets.count})`, amount: assets.cost },
    { section: 'What the business has', label: 'Less accumulated depreciation (configured assets only)', amount: -assets.dep },
    { section: 'What the business owes', label: 'Guest advance payments for future stays', amount: guest.advances },
    { section: 'What the business owes', label: 'Owed to suppliers', amount: payables, note: 'Current figure' },
    { section: 'What the business owes', label: 'Owed to employees (reimbursements)', amount: staffOwed, note: 'Current figure' },
    { section: 'Capital', label: 'Investment (added − withdrawn)', amount: capital.net },
    { section: 'Unclassified', label: 'Money kept on cancelled bookings', amount: guest.cancelledRetained, note: 'Not revenue until reviewed' },
  ]

  const columns = [
    { header: 'Section', value: (l: StatementLine) => l.section, width: 24 },
    { header: 'Line', value: (l: StatementLine) => l.label, width: 54 },
    { header: 'Amount (BDT)', value: (l: StatementLine) => (l.amount === null ? '' : Math.round(l.amount * 100) / 100) },
    { header: 'Note', value: (l: StatementLine) => l.note ?? '', width: 30 },
  ]
  const sheets: ExportSheet<StatementLine>[] = [
    { name: 'Profit and loss', columns, rows: [...pnlLines, ...pnl.notes.map((n) => ({ section: 'Notes', label: n, amount: null }))] },
    { name: 'Cash flow', columns, rows: cashLines },
    { name: `Position ${asOf}`, columns, rows: positionLines },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Financial statements"
        description={`${periodLabel} · position as of ${asOf}`}
        actions={<ExportButtons options={{ title: 'Financial statements', filenameBase: 'cherekh-financial-statements', period: periodLabel }} sheets={sheets} />}
      />
      <FinanceNotice title="These statements are management figures, not audited accounts" tone="sky">
        Revenue comes from bookings only (restaurant walk-in sales aren’t recorded yet), inventory is expensed when bought, and income tax isn’t calculated, so the bottom line is shown as
        “result before tax”, not net profit.
      </FinanceNotice>
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

      <Statement
        title="Financial position (partial)"
        description={`As of ${asOf}. Lines marked “current figure” reflect today’s records rather than the as-of date.`}
        lines={positionLines}
        footer={
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <Summary label="Cash & bank total" value={cashTotal} />
            <Summary label="Owed by the business" value={guest.advances + payables + staffOwed} />
            <Summary label="Fixed assets (book value)" value={assets.cost - assets.dep} />
          </div>
        }
      />
    </div>
  )
}

const Statement = ({ title, description, lines, children, footer }: { title: string; description: string; lines: StatementLine[]; children?: ReactNode; footer?: ReactNode }) => {
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
      {footer}
    </Card>
  )
}

const Summary = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl bg-stone-50 px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p>
    <p className="font-medium tabular-nums text-forest-700">{money(value)}</p>
  </div>
)
