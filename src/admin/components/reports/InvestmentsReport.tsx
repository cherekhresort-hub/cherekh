import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { EmptyRow, ExportButtons, FinanceNotice, SectionTitle, Stat, TableShell, Td, Th } from '../finance/shared'
import { formatDay, money } from '../finance/financeHelpers'
import { LEDGER_KIND_LABELS, finMethodLabel } from '../../../lib/finance/classification'
import { businessToday, type DateRange } from '../../../lib/finance/dates'
import { capitalEntries, capitalTotals, type CapitalEntryRow } from '../../../lib/finance/reporting'
import type { FinanceData } from '../../../lib/finance/types'
import type { ExportColumn, ExportSheet } from '../../../utils/reportExport'

interface Props {
  data: FinanceData
  range: DateRange | null
  rangeLabel: string
}

interface SummaryLine {
  label: string
  amount: number
}

export const InvestmentsReport = ({ data, range, rangeLabel }: Props) => {
  const today = businessToday()
  const asOf = range && range.to < today ? range.to : today
  const period = useMemo(() => capitalTotals(data.ledger, range), [data.ledger, range])
  const toDate = useMemo(() => capitalTotals(data.ledger, { from: '0000-01-01', to: asOf }), [data.ledger, asOf])
  const rows = useMemo(() => capitalEntries(data.ledger, range), [data.ledger, range])
  const accountName = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? id

  const summaryLines: SummaryLine[] = [
    { label: `Investment added (${rangeLabel})`, amount: period.added },
    { label: `Investment withdrawn (${rangeLabel})`, amount: -period.withdrawn },
    { label: `Net investment (${rangeLabel})`, amount: period.net },
    { label: `Total invested as of ${asOf}`, amount: toDate.net },
  ]
  const summaryColumns: ExportColumn<SummaryLine>[] = [
    { header: 'Line', value: (l) => l.label, width: 44 },
    { header: 'Amount (BDT)', value: (l) => l.amount },
  ]
  const entryColumns: ExportColumn<CapitalEntryRow>[] = [
    { header: 'Date', value: (r) => r.entry.entryDate },
    { header: 'Type', value: (r) => LEDGER_KIND_LABELS[r.entry.kind] },
    { header: 'Amount (BDT)', value: (r) => (r.entry.kind === 'capital_withdrawal' ? -r.entry.amount : r.entry.amount), total: true },
    { header: 'Account', value: (r) => accountName(r.entry.accountId) },
    { header: 'Invested by / paid to', value: (r) => r.entry.counterparty ?? '' },
    { header: 'Method', value: (r) => finMethodLabel(r.entry.method) },
    { header: 'Reference', value: (r) => r.entry.reference ?? '' },
    { header: 'Reversed', value: (r) => (r.reversed ? 'yes' : '') },
    { header: 'Notes', value: (r) => r.entry.notes ?? '', width: 30 },
  ]
  const sheets: [ExportSheet<SummaryLine>, ExportSheet<CapitalEntryRow>] = [
    { name: 'Summary', columns: summaryColumns, rows: summaryLines },
    { name: 'Entries', columns: entryColumns, rows },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Investment"
        description={`${rangeLabel} · total as of ${asOf}`}
        actions={<ExportButtons options={{ title: 'Investment report', filenameBase: 'cherekh-investment', period: rangeLabel }} sheets={sheets} />}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Added" value={money(period.added)} hint={rangeLabel} />
        <Stat label="Withdrawn" value={money(period.withdrawn)} hint={rangeLabel} tone={period.withdrawn > 0 ? 'bad' : 'muted'} />
        <Stat label="Net in period" value={money(period.net)} />
        <Stat label="Total invested" value={money(toDate.net)} hint={`As of ${asOf}`} />
      </div>
      <FinanceNotice tone="sky" title="Investment is capital, not income">
        It never appears in revenue or the profit & loss; it shows under financing in the cash flow. Reversed entries are crossed out and their reversals are counted on the reversal date.
        Record new money on the <Link to="/admin/investments" className="underline">Investment page</Link>.
      </FinanceNotice>
      <TableShell>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Entry</Th>
            <Th className="hidden md:table-cell">Account</Th>
            <Th right>Amount</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.length === 0 ? (
            <EmptyRow colSpan={4}>No investment entries in this period.</EmptyRow>
          ) : (
            rows.map(({ entry: e, reversed }) => (
              <tr key={e.id} className={reversed ? 'bg-stone-50/70' : undefined}>
                <Td className="whitespace-nowrap">{formatDay(e.entryDate)}</Td>
                <Td>
                  <span className={reversed ? 'line-through text-stone-500' : 'text-stone-800'}>
                    {LEDGER_KIND_LABELS[e.kind]}
                    {e.counterparty && <span className="text-stone-500"> · {e.counterparty}</span>}
                  </span>
                  {reversed && (
                    <Badge tone="neutral" className="ml-2">
                      Reversed
                    </Badge>
                  )}
                  {e.reference && <p className="text-xs text-stone-500">Ref {e.reference}</p>}
                </Td>
                <Td className="hidden md:table-cell text-stone-600">{accountName(e.accountId)}</Td>
                <Td right className={e.kind === 'owner_contribution' ? 'text-forest-700' : 'text-red-700'}>
                  {e.kind === 'owner_contribution' ? '+' : '−'}
                  {money(e.amount)}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
    </div>
  )
}
