import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, HandCoins, RotateCcw, Undo2, Wallet, XCircle } from 'lucide-react'
import { Drawer } from '../ui/Drawer'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { AttachmentsSection } from './AttachmentsSection'
import { ApprovalBadge, FinanceNotice, MoneyFieldsForm, PaymentStatusBadge, ReimbursementBadge } from './shared'
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
import {
  CLASSIFICATION_LABELS,
  LEDGER_KIND_LABELS,
  PHASE_LABELS,
  finMethodLabel,
} from '../../../lib/finance/classification'
import {
  recordExpensePayment,
  recordReimbursement,
  reverseLedgerEntry,
  setExpenseApproval,
  settleDeposit,
  voidExpense,
} from '../../../lib/finance/financeDb'
import { businessToday } from '../../../lib/finance/dates'
import { reversedEntryIds, type DepositPosition, type ExpenseFigures } from '../../../lib/finance/reporting'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import type { FinanceData, FinLedgerEntry } from '../../../lib/finance/types'
import { cn } from '../../utils/cn'

type Action =
  | { type: 'payment' }
  | { type: 'refund' }
  | { type: 'reimburse' }
  | { type: 'apply_advance' }
  | { type: 'approve' }
  | { type: 'reject' }
  | { type: 'void' }
  | { type: 'reverse'; entry: FinLedgerEntry }

interface ExpenseDrawerProps {
  figures: ExpenseFigures | null
  data: FinanceData
  lookups: FinanceLookups
  deposits: DepositPosition[]
  onClose: () => void
}

export const ExpenseDrawer = ({ figures, data, lookups, deposits, onClose }: ExpenseDrawerProps) => {
  const { isAdmin } = useAuth()
  const [action, setAction] = useState<Action | null>(null)
  const f = figures
  const e = f?.expense

  const entries = useMemo(
    () => (e ? data.ledger.filter((l) => l.expenseId === e.id).sort((a, b) => a.entryDate.localeCompare(b.entryDate) || a.createdAt.localeCompare(b.createdAt)) : []),
    [data.ledger, e]
  )
  const reversed = useMemo(() => reversedEntryIds(data.ledger), [data.ledger])
  const appliedIn = useMemo(
    () => (e ? data.settlements.filter((s) => s.kind === 'applied' && s.appliedExpenseId === e.id) : []),
    [data.settlements, e]
  )
  const settlementsOut = useMemo(() => (e ? data.settlements.filter((s) => s.expenseId === e.id) : []), [data.settlements, e])
  const assets = useMemo(() => (e ? data.assets.filter((a) => a.expenseId === e.id) : []), [data.assets, e])
  const depositPosition = e ? deposits.find((d) => d.figures.expense.id === e.id) : undefined
  const availableAdvances = deposits.filter((d) => d.outstanding > 0.005 && d.figures.expense.id !== e?.id)

  if (!f || !e) return <Drawer open={false} onClose={onClose}>{null}</Drawer>

  const isVoid = e.status === 'void'
  const isRejected = e.approvalStatus === 'rejected'
  const canPay = !isVoid && !isRejected && e.paidByType === 'company' && f.outstanding > 0.005
  const canRefund = !isVoid && e.paidByType === 'company' && f.cashPaidNet > 0.005
  const canReimburse = !isVoid && !isRejected && e.paidByType === 'employee' && f.reimbursementOutstanding > 0.005
  const supplierName = (e.supplierId && lookups.supplier.get(e.supplierId)) || e.payeeName || '—'

  return (
    <>
      <Drawer
        open={!!f}
        onClose={onClose}
        width="lg"
        title={
          <span className="flex items-center gap-2">
            <span className="font-mono text-sm text-stone-500">{e.code}</span>
            <span>{e.title}</span>
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5 mt-1">
            <PaymentStatusBadge status={f.paymentStatus} />
            <ReimbursementBadge status={f.reimbursementStatus} />
            <ApprovalBadge status={e.approvalStatus} />
            <Badge tone="neutral">{PHASE_LABELS[e.phase]}</Badge>
          </span>
        }
        footer={
          isVoid ? undefined : (
            <div className="flex flex-wrap gap-2">
              {canPay && (
                <Button size="sm" leftIcon={<Wallet className="w-4 h-4" />} onClick={() => setAction({ type: 'payment' })}>
                  Record payment
                </Button>
              )}
              {canPay && availableAdvances.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setAction({ type: 'apply_advance' })}>
                  Pay with advance
                </Button>
              )}
              {canReimburse && (
                <Button size="sm" leftIcon={<HandCoins className="w-4 h-4" />} onClick={() => setAction({ type: 'reimburse' })}>
                  Reimburse employee
                </Button>
              )}
              {canRefund && (
                <Button size="sm" variant="outline" leftIcon={<Undo2 className="w-4 h-4" />} onClick={() => setAction({ type: 'refund' })}>
                  Supplier refund
                </Button>
              )}
              {isAdmin && e.approvalStatus === 'pending' && (
                <>
                  <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setAction({ type: 'approve' })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" leftIcon={<XCircle className="w-4 h-4" />} onClick={() => setAction({ type: 'reject' })}>
                    Reject
                  </Button>
                </>
              )}
              {isAdmin && (
                <Button size="sm" variant="danger" leftIcon={<Ban className="w-4 h-4" />} onClick={() => setAction({ type: 'void' })} className="ml-auto">
                  Void
                </Button>
              )}
            </div>
          )
        }
      >
        <div className="space-y-6">
          {isVoid && (
            <FinanceNotice title="This expense is void" tone="red">
              {e.voidReason} · by {e.voidedBy ?? 'unknown'} on {formatDay(e.voidedAt)}. Its payments were reversed with offsetting entries; the original records are kept for audit.
            </FinanceNotice>
          )}
          {isRejected && <FinanceNotice title={`Rejected: ${e.approvalNote ?? ''}`} tone="red" />}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MoneyCell label="Total" value={e.total} />
            {e.paidByType === 'company' ? (
              <>
                <MoneyCell label="Paid" value={f.netPaid} />
                <MoneyCell label="Outstanding" value={f.outstanding} tone={f.outstanding > 0.005 ? 'bad' : undefined} />
                <MoneyCell label="Refunded" value={f.refunds} muted />
              </>
            ) : (
              <>
                <MoneyCell label="Reimbursed" value={f.reimbursed} />
                <MoneyCell label="Owed to employee" value={f.reimbursementOutstanding} tone={f.reimbursementOutstanding > 0.005 ? 'bad' : undefined} />
                <MoneyCell label="Paid by" value={null} text={e.employeeName ?? 'Employee'} />
              </>
            )}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Transaction date" value={formatDay(e.txnDate)} />
            <Row label="Supplier / recipient" value={supplierName} />
            {e.invoiceDate && <Row label="Invoice date" value={formatDay(e.invoiceDate)} />}
            {e.dueDate && <Row label="Due date" value={formatDay(e.dueDate)} />}
            <Row label="Department" value={(e.departmentId && lookups.department.get(e.departmentId)) || '—'} />
            {e.projectId && <Row label="Project" value={lookups.project.get(e.projectId) ?? '—'} />}
            {e.purchasedBy && <Row label="Purchased by" value={e.purchasedBy} />}
            {e.requestedBy && <Row label="Requested by" value={e.requestedBy} />}
            {e.approvedBy && <Row label={e.approvalStatus === 'rejected' ? 'Rejected by' : 'Approved by'} value={`${e.approvedBy} · ${formatDay(e.approvedAt)}`} />}
            <Row label="Recorded by" value={`${e.createdBy ?? '—'} · ${formatDay(e.createdAt)}`} />
            {e.tags.length > 0 && <Row label="Tags" value={e.tags.join(', ')} />}
          </dl>
          {e.description && <p className="text-sm text-stone-700 whitespace-pre-line">{e.description}</p>}
          {e.notes && <p className="text-xs text-stone-500 whitespace-pre-line">Notes: {e.notes}</p>}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-forest-700">Items</h3>
            <div className="rounded-xl border border-stone-100 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-stone-100">
                  {f.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">
                        <p className="text-stone-800">{l.description}</p>
                        <p className="text-xs text-stone-500">
                          {lookups.categoryLabel(l.categoryId)} · {CLASSIFICATION_LABELS[l.classification]}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-stone-500 whitespace-nowrap">
                        {l.quantity} {l.unit ?? ''} × {money(l.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{money(l.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-stone-50 text-xs text-stone-600">
                  {(e.discount > 0 || e.tax > 0 || e.additionalCharges > 0) && (
                    <tr>
                      <td className="px-3 py-1.5" colSpan={2}>
                        Subtotal {money(e.subtotal)}
                        {e.discount > 0 && ` − discount ${money(e.discount)}`}
                        {e.tax > 0 && ` + tax ${money(e.tax)}`}
                        {e.additionalCharges > 0 && ` + charges ${money(e.additionalCharges)}`}
                      </td>
                      <td />
                    </tr>
                  )}
                  <tr className="font-medium text-forest-700">
                    <td className="px-3 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(e.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {assets.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-forest-700">Asset register</h3>
              <ul className="text-sm space-y-1">
                {assets.map((a) => (
                  <li key={a.id} className="flex justify-between gap-2">
                    <span>
                      <span className="font-mono text-xs text-stone-500">{a.code}</span> {a.name}
                      {a.status !== 'active' && <Badge tone="neutral" className="ml-2">{a.status}</Badge>}
                    </span>
                    <span className="tabular-nums">{money(a.cost)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {depositPosition && (
            <section className="space-y-1 text-sm">
              <h3 className="text-sm font-semibold text-forest-700">Deposit position</h3>
              <p className="text-stone-600">
                Paid {money(depositPosition.base)} · refunded {money(depositPosition.refunded)} · applied {money(depositPosition.applied)} · written off{' '}
                {money(depositPosition.writtenOff)} · <strong>outstanding {money(depositPosition.outstanding)}</strong>
              </p>
              {settlementsOut.length > 0 && (
                <ul className="text-xs text-stone-500">
                  {settlementsOut.map((s) => (
                    <li key={s.id}>
                      {formatDay(s.settlementDate)} · {s.kind.replace('_', ' ')} {money(s.amount)}
                      {s.appliedExpenseId && ` → ${data.expenses.find((x) => x.id === s.appliedExpenseId)?.code ?? ''}`}
                      {s.ledgerEntryId && reversed.has(s.ledgerEntryId) && ' (reversed)'}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-forest-700">Payment history</h3>
            {entries.length === 0 && appliedIn.length === 0 ? (
              <p className="text-xs text-stone-500">No payments recorded.</p>
            ) : (
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-100">
                {entries.map((l) => {
                  const isReversal = !!l.reversalOf
                  const wasReversed = reversed.has(l.id)
                  return (
                    <li key={l.id} className={cn('px-3 py-2 text-sm flex items-start gap-3', (isReversal || wasReversed) && 'bg-stone-50')}>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-stone-800', wasReversed && 'line-through text-stone-500')}>
                          {isReversal ? 'Reversal of ' : ''}
                          {LEDGER_KIND_LABELS[l.kind]} · {lookups.account.get(l.accountId) ?? l.accountId} · {finMethodLabel(l.method)}
                        </p>
                        <p className="text-xs text-stone-500">
                          {formatDay(l.entryDate)}
                          {l.reference ? ` · Ref ${l.reference}` : ''}
                          {l.createdBy ? ` · ${l.createdBy}` : ''}
                          {l.notes ? ` · ${l.notes}` : ''}
                        </p>
                      </div>
                      <span className={cn('tabular-nums whitespace-nowrap', l.direction === 'in' ? 'text-forest-700' : 'text-stone-800')}>
                        {l.direction === 'in' ? '+' : '−'}
                        {money(l.amount)}
                      </span>
                      {isAdmin && !isReversal && !wasReversed && !isVoid && (
                        <button
                          type="button"
                          className="text-stone-400 hover:text-red-600"
                          title="Reverse this entry"
                          onClick={() => setAction({ type: 'reverse', entry: l })}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </li>
                  )
                })}
                {appliedIn.map((s) => (
                  <li key={s.id} className="px-3 py-2 text-sm flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-stone-800">Advance applied from {data.expenses.find((x) => x.id === s.expenseId)?.code ?? 'deposit'}</p>
                      <p className="text-xs text-stone-500">{formatDay(s.settlementDate)} · non-cash</p>
                    </div>
                    <span className="tabular-nums">{money(s.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <AttachmentsSection
            ownerType="expense"
            ownerId={e.id}
            docTypes={['receipt', 'invoice', 'purchase_order', 'warranty', 'contract', 'payment_confirmation', 'approval', 'other']}
            canUpload={!isVoid}
          />
        </div>
      </Drawer>

      <ExpenseActionModal
        action={action}
        figures={f}
        data={data}
        availableAdvances={availableAdvances}
        onClose={() => setAction(null)}
      />
    </>
  )
}

const MoneyCell = ({ label, value, text, tone, muted }: { label: string; value: number | null; text?: string; tone?: 'bad'; muted?: boolean }) => (
  <div className="rounded-xl bg-stone-50 px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-stone-500">{label}</p>
    <p className={cn('font-medium tabular-nums truncate', tone === 'bad' ? 'text-red-700' : muted ? 'text-stone-500' : 'text-forest-700')}>
      {value === null ? text : money(value)}
    </p>
  </div>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-3 border-b border-stone-50 py-1">
    <dt className="text-stone-500">{label}</dt>
    <dd className="text-stone-800 text-right">{value}</dd>
  </div>
)

// ---------------------------------------------------------------------------

const ExpenseActionModal = ({
  action,
  figures,
  data,
  availableAdvances,
  onClose,
}: {
  action: Action | null
  figures: ExpenseFigures
  data: FinanceData
  availableAdvances: DepositPosition[]
  onClose: () => void
}) => {
  const toast = useToast()
  const e = figures.expense
  const [money_, setMoney] = useState<MoneyFields>(() => emptyMoneyFields(data.accounts))
  const [reason, setReason] = useState('')
  const [advanceId, setAdvanceId] = useState('')
  const [advanceAmount, setAdvanceAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openedFor, setOpenedFor] = useState<Action | null>(null)

  if (action !== openedFor) {
    setOpenedFor(action)
    if (action) {
      const suggested =
        action.type === 'payment'
          ? figures.outstanding
          : action.type === 'reimburse'
            ? figures.reimbursementOutstanding
            : action.type === 'refund'
              ? 0
              : 0
      setMoney(emptyMoneyFields(data.accounts, suggested > 0 ? String(Math.round(suggested * 100) / 100) : ''))
      setReason('')
      setAdvanceId(availableAdvances[0]?.figures.expense.id ?? '')
      setAdvanceAmount('')
      setError(null)
    }
  }

  if (!action) return null

  const titles: Record<Action['type'], string> = {
    payment: `Record payment · ${e.code}`,
    refund: `Supplier refund · ${e.code}`,
    reimburse: `Reimburse employee · ${e.code}`,
    apply_advance: `Pay with an advance · ${e.code}`,
    approve: `Approve ${e.code}`,
    reject: `Reject ${e.code}`,
    void: `Void ${e.code}`,
    reverse: 'Reverse ledger entry',
  }

  const log = (actionKey: string, title: string, message: string) =>
    void logStaffActivity({ category: 'finance', action: actionKey, title, message, entityId: e.id, metadata: { code: e.code } })

  const run = async () => {
    setError(null)
    setSaving(true)
    try {
      switch (action.type) {
        case 'payment':
        case 'refund':
        case 'reimburse': {
          const max = action.type === 'payment' ? figures.outstanding : action.type === 'reimburse' ? figures.reimbursementOutstanding : figures.cashPaidNet
          const problem = validateMoney(money_, max)
          if (problem) throw new Error(problem)
          const input = {
            amount: parseAmount(money_.amount),
            accountId: money_.accountId,
            method: money_.method,
            reference: money_.reference.trim() || undefined,
            date: money_.date,
            notes: money_.notes.trim() || undefined,
          }
          if (action.type === 'reimburse') await recordReimbursement(e.id, input)
          else await recordExpensePayment(e.id, input, action.type === 'refund' ? 'expense_refund' : 'expense_payment')
          log(action.type, `${titles[action.type]}`, `${money(input.amount)} via ${money_.method}`)
          toast.success('Saved')
          break
        }
        case 'apply_advance': {
          const adv = availableAdvances.find((d) => d.figures.expense.id === advanceId)
          const amount = parseAmount(advanceAmount)
          if (!adv) throw new Error('Choose the advance to apply.')
          if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter the amount to apply.')
          if (amount > Math.min(adv.outstanding, figures.outstanding) + 0.005) throw new Error('Amount exceeds what is available or owed.')
          await settleDeposit({ expenseId: adv.figures.expense.id, kind: 'applied', amount, appliedExpenseId: e.id, date: businessToday(), notes: reason.trim() || undefined })
          log('advance_applied', `Advance applied to ${e.code}`, money(amount))
          toast.success('Advance applied')
          break
        }
        case 'approve':
          await setExpenseApproval(e.id, 'approved', reason.trim() || undefined)
          log('expense_approved', `${e.code} approved`, e.title)
          toast.success('Approved')
          break
        case 'reject':
          if (!reason.trim()) throw new Error('Give a reason for rejecting.')
          await setExpenseApproval(e.id, 'rejected', reason.trim())
          log('expense_rejected', `${e.code} rejected`, reason.trim())
          toast.success('Rejected')
          break
        case 'void': {
          if (!reason.trim()) throw new Error('A reason is required.')
          const count = await voidExpense(e.id, reason.trim())
          log('expense_voided', `${e.code} voided`, reason.trim())
          toast.success('Expense voided', count > 0 ? `${count} payment entr${count === 1 ? 'y' : 'ies'} reversed.` : undefined)
          break
        }
        case 'reverse':
          if (!reason.trim()) throw new Error('A reason is required.')
          await reverseLedgerEntry(action.entry.id, reason.trim())
          log('ledger_reversed', `Entry reversed on ${e.code}`, reason.trim())
          toast.success('Entry reversed')
          break
      }
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const needsMoney = action.type === 'payment' || action.type === 'refund' || action.type === 'reimburse'
  const needsReason = action.type === 'reject' || action.type === 'void' || action.type === 'reverse'

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={titles[action.type]}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant={action.type === 'void' || action.type === 'reverse' || action.type === 'reject' ? 'danger' : 'primary'} onClick={() => void run()} loading={saving}>
            Confirm
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <FinanceNotice title={error} tone="red" />}
        {action.type === 'payment' && <p className="text-sm text-stone-600">Outstanding: <strong>{money(figures.outstanding)}</strong>. This is linked to the original expense; it does not create a new expense.</p>}
        {action.type === 'reimburse' && <p className="text-sm text-stone-600">Owed to {e.employeeName ?? 'employee'}: <strong>{money(figures.reimbursementOutstanding)}</strong>.</p>}
        {action.type === 'refund' && <p className="text-sm text-stone-600">Money returned by the supplier. Up to {money(figures.cashPaidNet)}.</p>}
        {action.type === 'void' && (
          <FinanceNotice title="Voiding keeps the record for audit" tone="amber">
            The expense is marked void, every payment on it gets a reversing entry, and linked assets are marked void. Nothing is deleted.
          </FinanceNotice>
        )}
        {action.type === 'reverse' && (
          <p className="text-sm text-stone-600">
            Adds an opposite entry for {LEDGER_KIND_LABELS[action.entry.kind]} of {money(action.entry.amount)} on {formatDay(action.entry.entryDate)}. The original stays visible.
          </p>
        )}
        {needsMoney && (
          <MoneyFieldsForm
            value={money_}
            onChange={setMoney}
            accounts={data.accounts}
            accountLabel={action.type === 'refund' ? 'Received into account' : 'Paid from account'}
          />
        )}
        {action.type === 'apply_advance' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Advance / deposit" required className="sm:col-span-2">
              <Select value={advanceId} onChange={(ev) => setAdvanceId(ev.target.value)}>
                {availableAdvances.map((d) => (
                  <option key={d.figures.expense.id} value={d.figures.expense.id}>
                    {d.figures.expense.code} · {d.figures.expense.title} · available {money(d.outstanding)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Amount to apply" required>
              <Input type="number" min="0" step="0.01" value={advanceAmount} onChange={(ev) => setAdvanceAmount(ev.target.value)} />
            </Field>
            <Field label="Note">
              <Input value={reason} onChange={(ev) => setReason(ev.target.value)} />
            </Field>
          </div>
        )}
        {(needsReason || action.type === 'approve') && (
          <Field label={action.type === 'approve' ? 'Note (optional)' : 'Reason'} required={needsReason}>
            <Textarea rows={3} value={reason} onChange={(ev) => setReason(ev.target.value)} />
          </Field>
        )}
      </div>
    </Modal>
  )
}
