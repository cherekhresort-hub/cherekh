import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardDescription, CardTitle } from '../ui/Card'
import { ExpenseTrendChart } from './charts'
import { EmptyRow, ExportButtons, FinanceNotice, SectionTitle, Stat, TableShell, Td, Th } from '../finance/shared'
import { formatDay, money, useFinanceLookups } from '../finance/financeHelpers'
import { CLASSIFICATION_LABELS } from '../../../lib/finance/classification'
import type { DateRange } from '../../../lib/finance/dates'
import {
  buildExpenseFigures,
  expenseLineAmounts,
  expensesIncurred,
  monthlyExpenseTrend,
  reimbursementsOwed,
  sumBy,
  supplierPayables,
  type ExpenseFigures,
} from '../../../lib/finance/reporting'
import type { Classification, FinanceData } from '../../../lib/finance/types'
import type { ExportColumn, ExportSheet } from '../../../utils/reportExport'

interface Props {
  data: FinanceData
  range: DateRange | null
  rangeLabel: string
}

type Breakdown = { key: string; label: string; amount: number; share: number }

export const ExpensesReport = ({ data, range, rangeLabel }: Props) => {
  const lookups = useFinanceLookups(data)
  const index = useMemo(() => buildExpenseFigures(data), [data])
  const incurred = useMemo(() => expensesIncurred(data, index, range), [data, index, range])
  const lines = useMemo(() => expenseLineAmounts(data, index, range), [data, index, range])
  const trend = useMemo(
    () =>
      monthlyExpenseTrend(data, index, range).map((r) => ({
        ...r,
        label: new Date(`${r.month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      })),
    [data, index, range]
  )
  const paidInPeriod = trend.reduce((s, r) => s + r.paid, 0)
  const payables = useMemo(() => supplierPayables(data, index), [data, index])
  const owedToSuppliers = payables.reduce((s, p) => s + p.outstanding, 0)
  const owedToStaff = useMemo(() => reimbursementsOwed(new Map(), index).reduce((s, r) => s + r.owed, 0), [index])

  const toBreakdown = (rows: { key: string; amount: number }[], label: (key: string) => string): Breakdown[] => {
    const total = rows.reduce((s, r) => s + r.amount, 0) || 1
    return rows.map((r) => ({ key: r.key, label: label(r.key), amount: r.amount, share: r.amount / total }))
  }

  const byCategory = useMemo(() => toBreakdown(sumBy(lines, (l) => l.topCategoryId, (l) => l.amount), lookups.topCategoryName), [lines, lookups])
  const byClass = useMemo(
    () => toBreakdown(sumBy(lines, (l) => l.classification, (l) => l.amount), (k) => CLASSIFICATION_LABELS[k as Classification]),
    [lines]
  )
  const byDepartment = useMemo(
    () => toBreakdown(sumBy(lines, (l) => l.expense.departmentId ?? 'none', (l) => l.amount), (k) => (k === 'none' ? 'No department' : lookups.department.get(k) ?? k)),
    [lines, lookups]
  )
  const bySupplier = useMemo(
    () =>
      toBreakdown(
        sumBy(lines, (l) => l.expense.supplierId ?? `name:${l.expense.payeeName ?? (l.expense.paidByType === 'employee' ? 'Employee purchase' : 'No supplier')}`, (l) => l.amount),
        (k) => (k.startsWith('name:') ? k.slice(5) : lookups.supplier.get(k) ?? k)
      ).slice(0, 15),
    [lines, lookups]
  )
  const largest = useMemo(
    () =>
      [...index.values()]
        .filter((f) => f.recognized && (!range || (f.expense.txnDate >= range.from && f.expense.txnDate <= range.to)))
        .sort((a, b) => b.expense.total - a.expense.total)
        .slice(0, 10),
    [index, range]
  )

  const breakdownColumns: ExportColumn<Breakdown>[] = [
    { header: 'Name', value: (r) => r.label, width: 34 },
    { header: 'Amount (BDT)', value: (r) => r.amount, total: true },
    { header: 'Share %', value: (r) => Math.round(r.share * 1000) / 10 },
  ]
  const largestColumns: ExportColumn<ExpenseFigures>[] = [
    { header: 'Expense ID', value: (f) => f.expense.code },
    { header: 'Date', value: (f) => f.expense.txnDate },
    { header: 'Title', value: (f) => f.expense.title, width: 30 },
    { header: 'Amount (BDT)', value: (f) => f.expense.total, total: true },
    { header: 'Outstanding (BDT)', value: (f) => f.outstanding + f.reimbursementOutstanding, total: true },
  ]
  const summaryRows = [
    { label: 'Total recorded (all classifications)', amount: incurred.total },
    { label: 'Operating expenses (incl. inventory, unclassified, deposit write-offs)', amount: incurred.operating },
    { label: 'Capital asset purchases (not in P&L)', amount: incurred.capex },
    { label: 'Deposits & advances placed (not in P&L)', amount: incurred.deposits },
    { label: 'Financing costs recorded as expenses', amount: incurred.financing },
    { label: 'Paid in period (cash out, net of supplier refunds)', amount: paidInPeriod },
    { label: 'Owed to suppliers now', amount: owedToSuppliers },
    { label: 'Owed to employees now', amount: owedToStaff },
  ]
  const sheets: ExportSheet<any>[] = [
    { name: 'Summary', columns: [{ header: 'Measure', value: (r: { label: string }) => r.label, width: 60 }, { header: 'Amount (BDT)', value: (r: { amount: number }) => r.amount }], rows: summaryRows },
    { name: 'By category', columns: breakdownColumns, rows: byCategory },
    { name: 'By classification', columns: breakdownColumns, rows: byClass },
    { name: 'By department', columns: breakdownColumns, rows: byDepartment },
    { name: 'By supplier', columns: breakdownColumns, rows: bySupplier },
    { name: 'Largest', columns: largestColumns, rows: largest },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Expense analytics"
        description={`${rangeLabel} · expenses by transaction date; void and rejected expenses excluded`}
        actions={<ExportButtons options={{ title: 'Expense analytics', filenameBase: 'cherekh-expense-analytics', period: rangeLabel }} sheets={sheets} />}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Operating expenses" value={money(incurred.operating)} hint={`${incurred.count} expense${incurred.count === 1 ? '' : 's'} recorded`} />
        <Stat label="Capital purchases" value={money(incurred.capex)} hint="Asset register, not P&L" />
        <Stat label="Paid in period" value={money(paidInPeriod)} hint="Cash out for expenses, net of refunds" />
        <Stat label="Owed now" value={money(owedToSuppliers + owedToStaff)} tone={owedToSuppliers + owedToStaff > 0 ? 'bad' : 'muted'} hint={`Suppliers ${money(owedToSuppliers)} · staff ${money(owedToStaff)}`} />
      </div>
      {incurred.pendingApprovalCount > 0 && (
        <FinanceNotice title={`${incurred.pendingApprovalCount} expense(s) totalling ${money(incurred.pendingApprovalAmount)} are pending approval`}>
          They are included in these totals. Approve or reject them on the{' '}
          <Link to="/admin/expenses" className="underline">
            Expenses page
          </Link>
          .
        </FinanceNotice>
      )}
      {incurred.unclassifiedAmount > 0 && (
        <FinanceNotice title={`${money(incurred.unclassifiedAmount)} is recorded as “Other / unclassified”`} tone="sky">
          It is counted as an operating expense. Reclassify it in Finance settings if it belongs elsewhere.
        </FinanceNotice>
      )}

      <Card padded={false} className="p-6">
        <CardTitle>Monthly expenses</CardTitle>
        <CardDescription className="mb-4">Incurred (by transaction date) vs paid (by payment date)</CardDescription>
        {trend.length === 0 ? <p className="text-sm text-stone-500 py-8 text-center">No expenses in this period.</p> : <ExpenseTrendChart data={trend.map((r) => ({ month: r.label, incurred: r.incurred, paid: r.paid }))} />}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BreakdownTable title="By category" rows={byCategory} />
        <BreakdownTable title="By classification" rows={byClass} />
        <BreakdownTable title="By department" rows={byDepartment} />
        <BreakdownTable title="Top suppliers" rows={bySupplier} />
      </div>

      <section className="space-y-2">
        <SectionTitle title="Largest expenses" />
        <TableShell>
          <thead>
            <tr>
              <Th>Expense</Th>
              <Th>Date</Th>
              <Th right>Amount</Th>
              <Th right>Outstanding</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {largest.length === 0 ? (
              <EmptyRow colSpan={4}>No expenses in this period.</EmptyRow>
            ) : (
              largest.map((f) => (
                <tr key={f.expense.id}>
                  <Td>
                    <Link to={`/admin/expenses?id=${f.expense.id}`} className="text-forest-700 hover:underline">
                      <span className="font-mono text-xs text-stone-500">{f.expense.code}</span> {f.expense.title}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDay(f.expense.txnDate)}</Td>
                  <Td right>{money(f.expense.total)}</Td>
                  <Td right>{money(f.outstanding + f.reimbursementOutstanding)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      </section>
    </div>
  )
}

const BreakdownTable = ({ title, rows }: { title: string; rows: Breakdown[] }) => (
  <section className="space-y-2">
    <h3 className="text-sm font-semibold text-forest-700">{title}</h3>
    <TableShell>
      <tbody className="divide-y divide-stone-100">
        {rows.length === 0 ? (
          <EmptyRow colSpan={3}>No data.</EmptyRow>
        ) : (
          rows.map((r) => (
            <tr key={r.key}>
              <Td>
                <p className="text-stone-800">{r.label}</p>
                <div className="mt-1 h-1.5 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full bg-forest-500" style={{ width: `${Math.max(1, Math.round(r.share * 100))}%` }} />
                </div>
              </Td>
              <Td right className="text-xs text-stone-500 w-16">
                {Math.round(r.share * 100)}%
              </Td>
              <Td right className="w-32">
                {money(r.amount)}
              </Td>
            </tr>
          ))
        )}
      </tbody>
    </TableShell>
  </section>
)
