import { useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field, Input, Select } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { settleDeposit } from '../../../lib/finance/financeDb'
import { isStaffAdvance, staffAdvanceBalances, type DepositPosition, type ExpenseFigures, type ExpenseIndex, type StaffAdvanceBalance } from '../../../lib/finance/reporting'
import { useStaffData } from '../../hooks/useStaffData'
import type { FinanceData } from '../../../lib/finance/types'
import type { ExportColumn } from '../../../utils/reportExport'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import { EmptyRow, ExportButtons, FinanceNotice, MoneyFieldsForm, SectionTitle, Stat, TableShell, Td, Th } from './shared'
import {
  emptyMoneyFields,
  errorMessage,
  formatDay,
  money,
  parseAmount,
  validateMoney,
  type FinanceLookups,
  type MoneyFields,
} from './financeHelpers'

type SettleKind = 'refund_received' | 'applied' | 'written_off'

/** H · Salaries, Wages and Human Resources (subcategories are `cat-h-…`). */
const SALARY_CATEGORY_ID = 'cat-h'

export const DepositsPanel = ({
  data,
  index,
  deposits,
  lookups,
  onOpenExpense,
}: {
  data: FinanceData
  index: ExpenseIndex
  deposits: DepositPosition[]
  lookups: FinanceLookups
  onOpenExpense: (id: string) => void
}) => {
  const { isAdmin } = useAuth()
  const { staff } = useStaffData()
  const [showSettled, setShowSettled] = useState(false)
  const [settling, setSettling] = useState<{ position: DepositPosition; kind: SettleKind } | null>(null)

  const staffNames = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff])
  const rows = useMemo(() => deposits.filter((d) => showSettled || d.outstanding > 0.005), [deposits, showSettled])
  const staffRows = useMemo(
    () => staffAdvanceBalances(deposits, staffNames).filter((r) => showSettled || r.outstanding > 0.005),
    [deposits, staffNames, showSettled]
  )
  const outstanding = deposits.reduce((s, d) => s + d.outstanding, 0)
  const staffOutstanding = staffRows.reduce((s, r) => s + r.outstanding, 0)

  const heldBy = (d: DepositPosition) => {
    const e = d.figures.expense
    if (isStaffAdvance(d.figures)) return (e.employeeStaffId && staffNames.get(e.employeeStaffId)) || e.employeeName || e.payeeName || 'Staff member'
    return (e.supplierId && lookups.supplier.get(e.supplierId)) || e.payeeName || ''
  }

  const columns: ExportColumn<DepositPosition>[] = [
    { header: 'Expense ID', value: (d) => d.figures.expense.code },
    { header: 'Date', value: (d) => d.figures.expense.txnDate },
    { header: 'Title', value: (d) => d.figures.expense.title, width: 30 },
    { header: 'Type', value: (d) => (isStaffAdvance(d.figures) ? 'Staff advance / loan' : 'Deposit / advance') },
    { header: 'Held by', value: heldBy },
    { header: 'Paid (BDT)', value: (d) => d.base, total: true },
    { header: 'Refunded (BDT)', value: (d) => d.refunded, total: true },
    { header: 'Applied (BDT)', value: (d) => d.applied, total: true },
    { header: 'Written off (BDT)', value: (d) => d.writtenOff, total: true },
    { header: 'Outstanding (BDT)', value: (d) => d.outstanding, total: true },
  ]

  const staffColumns: ExportColumn<StaffAdvanceBalance>[] = [
    { header: 'Staff member', value: (r) => r.name, width: 24 },
    { header: 'Lent (BDT)', value: (r) => r.lent, total: true },
    { header: 'Repaid (BDT)', value: (r) => r.repaid, total: true },
    { header: 'Deducted from salary/bills (BDT)', value: (r) => r.deducted, total: true },
    { header: 'Forgiven (BDT)', value: (r) => r.writtenOff, total: true },
    { header: 'Still owes (BDT)', value: (r) => r.outstanding, total: true },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Deposits & advances held" value={money(outstanding)} hint="Money the resort expects back or to use later" />
        <Stat label="Open items" value={deposits.filter((d) => d.outstanding > 0.005).length} />
        <Stat label="Owed by staff" value={money(staffOutstanding)} hint="Staff advances and loans not yet repaid (included above)" />
      </div>

      <SectionTitle
        title="Staff advances & loans"
        description="Money lent to staff. Record it as an expense in “Refundable Deposits and Advances → Staff advance / loan”; record repayments, salary deductions or forgiving it in the table below."
        actions={
          <ExportButtons
            options={{ title: 'Staff advances & loans', filenameBase: 'cherekh-staff-advances' }}
            sheets={[{ name: 'Staff advances', columns: staffColumns, rows: staffRows }]}
            disabled={staffRows.length === 0}
          />
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Staff member</Th>
            <Th right>Lent</Th>
            <Th right className="hidden md:table-cell">Repaid</Th>
            <Th right className="hidden md:table-cell">Deducted</Th>
            <Th right className="hidden lg:table-cell">Forgiven</Th>
            <Th right>Still owes</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {staffRows.length === 0 ? (
            <EmptyRow colSpan={6}>No staff member owes money right now.</EmptyRow>
          ) : (
            staffRows.map((r) => (
              <tr key={r.key}>
                <Td>
                  <span className="font-medium text-forest-700">{r.name}</span>
                  <p className="text-xs text-stone-500">
                    {r.positions.length} {r.positions.length === 1 ? 'advance' : 'advances'}
                  </p>
                </Td>
                <Td right>{money(r.lent)}</Td>
                <Td right className="hidden md:table-cell">{money(r.repaid)}</Td>
                <Td right className="hidden md:table-cell">{money(r.deducted)}</Td>
                <Td right className="hidden lg:table-cell">{money(r.writtenOff)}</Td>
                <Td right className={r.outstanding > 0.005 ? 'font-medium text-red-700' : 'font-medium'}>{money(r.outstanding)}</Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>

      <SectionTitle
        title="Deposits & advances"
        description="Security deposits and advance payments are assets until refunded, applied to a later bill, or written off. They are not operating expenses."
        actions={
          <>
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={showSettled} onChange={(e) => setShowSettled(e.target.checked)} /> Show settled
            </label>
            <ExportButtons options={{ title: 'Deposits & advances', filenameBase: 'cherekh-deposits' }} sheets={[{ name: 'Deposits', columns, rows }]} disabled={rows.length === 0} />
          </>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Expense</Th>
            <Th className="hidden md:table-cell">Held by</Th>
            <Th right>Paid</Th>
            <Th right className="hidden lg:table-cell">Refunded</Th>
            <Th right className="hidden lg:table-cell">Applied</Th>
            <Th right className="hidden lg:table-cell">Written off</Th>
            <Th right>Outstanding</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.length === 0 ? (
            <EmptyRow colSpan={8}>No open deposits or advances. Record one as an expense line classified “Deposit / advance”.</EmptyRow>
          ) : (
            rows.map((d) => {
              const e = d.figures.expense
              const staffAdvance = isStaffAdvance(d.figures)
              return (
                <tr key={e.id}>
                  <Td>
                    <button type="button" className="text-left hover:underline" onClick={() => onOpenExpense(e.id)}>
                      <span className="font-mono text-xs text-stone-500">{e.code}</span>{' '}
                      <span className="font-medium text-forest-700">{e.title}</span>
                    </button>
                    <p className="text-xs text-stone-500">
                      {formatDay(e.txnDate)}
                      {staffAdvance && ' · Staff advance / loan'}
                    </p>
                  </Td>
                  <Td className="hidden md:table-cell text-stone-600">{heldBy(d) || '—'}</Td>
                  <Td right>{money(d.base)}</Td>
                  <Td right className="hidden lg:table-cell">{money(d.refunded)}</Td>
                  <Td right className="hidden lg:table-cell">{money(d.applied)}</Td>
                  <Td right className="hidden lg:table-cell">{money(d.writtenOff)}</Td>
                  <Td right className="font-medium">{money(d.outstanding)}</Td>
                  <Td right>
                    {d.outstanding > 0.005 && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setSettling({ position: d, kind: 'refund_received' })}>
                          {staffAdvance ? 'Repaid' : 'Refund'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSettling({ position: d, kind: 'applied' })}>
                          {staffAdvance ? 'Deduct' : 'Apply'}
                        </Button>
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => setSettling({ position: d, kind: 'written_off' })}>
                            {staffAdvance ? 'Forgive' : 'Write off'}
                          </Button>
                        )}
                      </div>
                    )}
                  </Td>
                </tr>
              )
            })
          )}
        </tbody>
      </TableShell>
      {hasUnpaidDeposits(deposits) && (
        <p className="text-xs text-stone-500">Only the paid portion of a deposit counts as held. Unpaid deposits show as supplier payables instead.</p>
      )}
      <SettleModal state={settling} data={data} index={index} onClose={() => setSettling(null)} />
    </div>
  )
}

const hasUnpaidDeposits = (deposits: DepositPosition[]) => deposits.some((d) => d.base + 0.005 < d.figures.classTotals.deposit_advance)

const SettleModal = ({
  state,
  data,
  index,
  onClose,
}: {
  state: { position: DepositPosition; kind: SettleKind } | null
  data: FinanceData
  index: ExpenseIndex
  onClose: () => void
}) => {
  const toast = useToast()
  const [money_, setMoney] = useState<MoneyFields>(() => emptyMoneyFields(data.accounts))
  const [targetId, setTargetId] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openedFor, setOpenedFor] = useState<typeof state>(null)

  const targets = useMemo(() => {
    if (!state) return []
    const salaryFirst = isStaffAdvance(state.position.figures)
    const isSalary = (f: ExpenseFigures) => f.lines.some((l) => l.categoryId === SALARY_CATEGORY_ID || l.categoryId.startsWith(`${SALARY_CATEGORY_ID}-`))
    const first = (f: ExpenseFigures) => (salaryFirst && isSalary(f) ? 0 : 1)
    return [...index.values()]
      .filter((f) => f.recognized && f.expense.paidByType === 'company' && f.outstanding > 0.005 && f.expense.id !== state.position.figures.expense.id)
      .sort((a, b) => first(a) - first(b) || b.expense.txnDate.localeCompare(a.expense.txnDate))
      .map((f) => ({ expense: f.expense, outstanding: f.outstanding }))
  }, [state, index])

  if (state !== openedFor) {
    setOpenedFor(state)
    if (state) {
      setMoney(emptyMoneyFields(data.accounts, String(state.position.outstanding)))
      setTargetId('')
      setNotes('')
      setError(null)
    }
  }
  if (!state) return null

  const { position, kind } = state
  const staffAdvance = isStaffAdvance(position.figures)
  const target = targets.find((t) => t.expense.id === targetId)
  const max = kind === 'applied' && target ? Math.min(position.outstanding, target.outstanding) : position.outstanding

  const save = async () => {
    setError(null)
    const problem = kind === 'refund_received' ? validateMoney(money_, max) : null
    const amount = parseAmount(money_.amount)
    if (problem) return setError(problem)
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount.')
    if (amount > max + 0.005) return setError(`Amount cannot exceed ${money(max)}.`)
    if (kind === 'applied' && !target) return setError(staffAdvance ? 'Choose the salary or bill to deduct from.' : 'Choose the bill this advance pays.')
    if (kind === 'written_off' && !notes.trim()) return setError(staffAdvance ? 'Explain why the advance is forgiven.' : 'Explain why the deposit is written off.')
    setSaving(true)
    try {
      await settleDeposit({
        expenseId: position.figures.expense.id,
        kind,
        amount,
        date: money_.date,
        accountId: kind === 'refund_received' ? money_.accountId : undefined,
        method: kind === 'refund_received' ? money_.method : undefined,
        reference: kind === 'refund_received' ? money_.reference.trim() || undefined : undefined,
        appliedExpenseId: kind === 'applied' ? targetId : undefined,
        notes: (kind === 'refund_received' ? money_.notes : notes).trim() || undefined,
      })
      void logStaffActivity({
        category: 'finance',
        action: `deposit_${kind}`,
        title: `Deposit ${kind.replace('_', ' ')} · ${position.figures.expense.code}`,
        message: money(amount),
        entityId: position.figures.expense.id,
      })
      toast.success('Saved')
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const title = staffAdvance
    ? kind === 'refund_received'
      ? 'Staff repayment received'
      : kind === 'applied'
        ? 'Deduct from salary or a bill'
        : 'Forgive staff advance'
    : kind === 'refund_received'
      ? 'Deposit refund received'
      : kind === 'applied'
        ? 'Apply advance to a bill'
        : 'Write off deposit'
  const borrowerName = staffAdvance ? position.figures.expense.employeeName || position.figures.expense.payeeName : null

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={`${title} · ${position.figures.expense.code}`}
      description={borrowerName ? `${borrowerName} still owes ${money(position.outstanding)}` : `Outstanding ${money(position.outstanding)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={kind === 'written_off' ? 'danger' : 'primary'} onClick={() => void save()} loading={saving}>
            Confirm
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <FinanceNotice title={error} tone="red" />}
        {kind === 'refund_received' && <MoneyFieldsForm value={money_} onChange={setMoney} accounts={data.accounts} accountLabel="Received into account" />}
        {kind === 'refund_received' && staffAdvance && (
          <p className="text-xs text-stone-500">For money the staff member paid back in cash or by transfer. If it was taken out of their salary, use Deduct instead.</p>
        )}
        {kind === 'applied' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <p className="sm:col-span-2 text-sm text-stone-600">
              {staffAdvance
                ? 'Deducts the advance from an unpaid bill the resort owes, usually this person’s salary. Record the salary as an expense (not paid yet) first. No cash moves; the salary’s outstanding amount goes down.'
                : 'Uses the advance as payment for a later bill. No cash moves; the bill’s outstanding amount goes down.'}
            </p>
            <Field label={staffAdvance ? 'Salary or bill to deduct from' : 'Bill to pay'} required className="sm:col-span-2">
              <Select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Choose a bill…</option>
                {targets.map((t) => (
                  <option key={t.expense.id} value={t.expense.id}>
                    {t.expense.code} · {t.expense.title} · owes {money(t.outstanding)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount" required>
              <Input type="number" min="0" step="0.01" value={money_.amount} onChange={(e) => setMoney({ ...money_, amount: e.target.value })} />
            </Field>
            <Field label="Date" required>
              <Input type="date" value={money_.date} onChange={(e) => setMoney({ ...money_, date: e.target.value })} />
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        )}
        {kind === 'written_off' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <p className="sm:col-span-2 text-sm text-stone-600">
              {staffAdvance ? 'The forgiven amount' : 'The written-off amount'} is reported as an operating expense in the period it is written off.
            </p>
            <Field label="Amount" required>
              <Input type="number" min="0" step="0.01" value={money_.amount} onChange={(e) => setMoney({ ...money_, amount: e.target.value })} />
            </Field>
            <Field label="Date" required>
              <Input type="date" value={money_.date} onChange={(e) => setMoney({ ...money_, date: e.target.value })} />
            </Field>
            <Field label="Reason" required className="sm:col-span-2">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  )
}
