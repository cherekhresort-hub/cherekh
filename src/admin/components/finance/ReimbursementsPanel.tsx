import { Fragment, useMemo, useState } from 'react'
import { reimbursementsOwed, type ExpenseIndex, type ReimbursementOwed } from '../../../lib/finance/reporting'
import type { ExportColumn } from '../../../utils/reportExport'
import { EmptyRow, ExportButtons, ReimbursementBadge, SectionTitle, Stat, TableShell, Td, Th } from './shared'
import { formatDay, money } from './financeHelpers'

export const ReimbursementsPanel = ({
  index,
  staffNames,
  onOpenExpense,
}: {
  index: ExpenseIndex
  staffNames: Map<string, string>
  onOpenExpense: (id: string) => void
}) => {
  const [showSettled, setShowSettled] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const all = useMemo(() => reimbursementsOwed(staffNames, index), [staffNames, index])
  const rows = all.filter((r) => showSettled || r.owed > 0.005)
  const owed = all.reduce((s, r) => s + r.owed, 0)

  const columns: ExportColumn<ReimbursementOwed>[] = [
    { header: 'Employee', value: (r) => r.name, width: 26 },
    { header: 'Expenses', value: (r) => r.expenses.length, total: true },
    { header: 'Paid personally (BDT)', value: (r) => r.total, total: true },
    { header: 'Reimbursed (BDT)', value: (r) => r.reimbursed, total: true },
    { header: 'Still owed (BDT)', value: (r) => r.owed, total: true },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Owed to employees" value={money(owed)} tone={owed > 0 ? 'bad' : 'muted'} />
        <Stat label="Employees owed" value={all.filter((r) => r.owed > 0.005).length} />
      </div>
      <SectionTitle
        title="Employee reimbursements"
        description="Purchases staff paid for with their own money. The expense counts when it was incurred; reimbursing it is a separate cash payment, not a second expense."
        actions={
          <>
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={showSettled} onChange={(e) => setShowSettled(e.target.checked)} /> Show fully reimbursed
            </label>
            <ExportButtons options={{ title: 'Employee reimbursements', filenameBase: 'cherekh-reimbursements' }} sheets={[{ name: 'Reimbursements', columns, rows }]} disabled={rows.length === 0} />
          </>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Employee</Th>
            <Th right>Paid personally</Th>
            <Th right>Reimbursed</Th>
            <Th right>Still owed</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.length === 0 ? (
            <EmptyRow colSpan={4}>Nobody is owed a reimbursement.</EmptyRow>
          ) : (
            rows.map((r) => (
              <Fragment key={r.key}>
                <tr className="hover:bg-cream/50 cursor-pointer" onClick={() => setExpanded(expanded === r.key ? null : r.key)}>
                  <Td>
                    <p className="font-medium text-forest-700">{r.name}</p>
                    <p className="text-xs text-stone-500">
                      {r.expenses.length} expense{r.expenses.length === 1 ? '' : 's'}
                    </p>
                  </Td>
                  <Td right>{money(r.total)}</Td>
                  <Td right>{money(r.reimbursed)}</Td>
                  <Td right className={r.owed > 0.005 ? 'text-red-700 font-medium' : 'text-stone-400'}>
                    {money(r.owed)}
                  </Td>
                </tr>
                {expanded === r.key && (
                  <tr className="bg-stone-50/60">
                    <td colSpan={4} className="px-4 py-2">
                      <ul className="text-sm space-y-1">
                        {r.expenses
                          .filter((f) => showSettled || f.reimbursementOutstanding > 0.005)
                          .map((f) => (
                            <li key={f.expense.id} className="flex items-center justify-between gap-3">
                              <button type="button" className="text-left text-forest-700 hover:underline" onClick={() => onOpenExpense(f.expense.id)}>
                                <span className="font-mono text-xs text-stone-500">{f.expense.code}</span> {f.expense.title}{' '}
                                <span className="text-xs text-stone-500">· {formatDay(f.expense.txnDate)}</span>
                              </button>
                              <span className="flex items-center gap-2">
                                <ReimbursementBadge status={f.reimbursementStatus} />
                                <span className="tabular-nums">{money(f.reimbursementOutstanding)}</span>
                              </span>
                            </li>
                          ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </TableShell>
      <p className="text-xs text-stone-500">Open an expense to record a reimbursement payment against it.</p>
    </div>
  )
}
