import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { createPayroll } from '../../../lib/finance/financeDb'
import { isStaffAdvance, type DepositPosition } from '../../../lib/finance/reporting'
import {
  PAYROLL_DEDUCTION_PRESETS,
  PAYROLL_EARNING_LABELS,
  computePayrollTotals,
  periodLabel,
} from '../../../lib/finance/payroll'
import type { FinanceData, PayrollEarningType } from '../../../lib/finance/types'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import { FinanceNotice, MoneyFieldsForm } from '../finance/shared'
import { emptyMoneyFields, errorMessage, formatDay, money, parseAmount, validateMoney, type MoneyFields } from '../finance/financeHelpers'

export interface PayrollTarget {
  staffId: string
  name: string
  period: string
  monthlySalary: number | null
}

interface EarningDraft {
  type: PayrollEarningType
  label: string
  amount: string
}

interface DeductionDraft {
  label: string
  amount: string
}

const amountOf = (s: string): number => {
  const n = parseAmount(s)
  return Number.isFinite(n) ? n : 0
}

export const PayrollFormModal = ({
  target,
  data,
  deposits,
  onClose,
}: {
  target: PayrollTarget | null
  data: FinanceData
  deposits: DepositPosition[]
  onClose: () => void
}) => {
  const toast = useToast()
  const [openedFor, setOpenedFor] = useState<PayrollTarget | null>(null)
  const [base, setBase] = useState('')
  const [earnings, setEarnings] = useState<EarningDraft[]>([])
  const [deductions, setDeductions] = useState<DeductionDraft[]>([])
  const [recover, setRecover] = useState<Record<string, string>>({})
  const [payNow, setPayNow] = useState(true)
  const [payment, setPayment] = useState<MoneyFields>(() => emptyMoneyFields(data.accounts))
  const [payTouched, setPayTouched] = useState(false)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (target !== openedFor) {
    setOpenedFor(target)
    if (target) {
      setBase(target.monthlySalary ? String(target.monthlySalary) : '')
      setEarnings([])
      setDeductions([])
      setRecover({})
      setPayNow(true)
      setPayment(emptyMoneyFields(data.accounts))
      setPayTouched(false)
      setNotes('')
      setError(null)
    }
  }

  const advances = useMemo(
    () =>
      target
        ? deposits.filter(
            (d) => isStaffAdvance(d.figures) && d.figures.expense.employeeStaffId === target.staffId && d.outstanding > 0.005
          )
        : [],
    [deposits, target]
  )

  const totals = computePayrollTotals({
    baseSalary: amountOf(base),
    earnings: earnings.map((e) => ({ amount: amountOf(e.amount) })),
    deductions: deductions.map((d) => ({ amount: amountOf(d.amount) })),
    advanceRecovered: advances.reduce((s, a) => s + amountOf(recover[a.figures.expense.id] ?? ''), 0),
  })
  const payValue = payTouched ? payment : { ...payment, amount: totals.netPay > 0 ? String(totals.netPay) : '' }

  if (!target) return null

  const recoverAll = () => {
    let left = Math.max(0, totals.gross - totals.deductions)
    const next: Record<string, string> = {}
    advances.forEach((a) => {
      const take = Math.min(a.outstanding, left)
      if (take > 0.005) next[a.figures.expense.id] = String(Math.round(take * 100) / 100)
      left -= take
    })
    setRecover(next)
  }

  const save = async () => {
    setError(null)
    if (!Number.isFinite(parseAmount(base || '0')) || amountOf(base) < 0) return setError('Enter a valid base salary.')
    if (earnings.some((e) => amountOf(e.amount) <= 0)) return setError('Each addition needs an amount, or remove it.')
    if (deductions.some((d) => amountOf(d.amount) <= 0 || !d.label.trim())) return setError('Each deduction needs a reason and an amount.')
    if (totals.gross <= 0) return setError('Enter a salary or an addition to pay.')
    if (totals.deductions > totals.gross + 0.005) return setError('Deductions cannot be more than the gross pay.')
    for (const a of advances) {
      const amt = amountOf(recover[a.figures.expense.id] ?? '')
      if (amt > a.outstanding + 0.005) return setError(`Recovery from ${a.figures.expense.code} cannot exceed ${money(a.outstanding)}.`)
    }
    if (totals.netPay < -0.005) return setError('Advance recovery cannot be more than the pay after deductions.')
    if (payNow && totals.netPay > 0.005) {
      const problem = validateMoney(payValue, totals.netPay)
      if (problem) return setError(problem)
    }

    setSaving(true)
    try {
      const result = await createPayroll({
        staffId: target.staffId,
        period: target.period,
        baseSalary: amountOf(base),
        earnings: earnings.map((e) => ({ type: e.type, label: e.label.trim() || PAYROLL_EARNING_LABELS[e.type], amount: amountOf(e.amount) })),
        deductions: deductions.map((d) => ({ label: d.label.trim(), amount: amountOf(d.amount) })),
        advances: advances
          .map((a) => ({ expenseId: a.figures.expense.id, amount: amountOf(recover[a.figures.expense.id] ?? '') }))
          .filter((a) => a.amount > 0),
        payment:
          payNow && totals.netPay > 0.005
            ? {
                amount: parseAmount(payValue.amount),
                accountId: payValue.accountId,
                method: payValue.method,
                reference: payValue.reference.trim() || undefined,
                date: payValue.date,
                notes: payValue.notes.trim() || undefined,
              }
            : null,
        notes: notes.trim() || undefined,
      })
      void logStaffActivity({
        category: 'finance',
        action: 'payroll_created',
        title: `Payroll · ${target.name} · ${periodLabel(target.period)}`,
        message: `Net ${money(totals.netPay)} · ${result.code}`,
        entityId: result.expense_id,
      })
      toast.success('Payroll saved', `${target.name} · ${periodLabel(target.period)}`)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={`Payroll · ${target.name}`}
      description={periodLabel(target.period)}
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-stone-600">
            Net pay <span className="font-semibold text-forest-700">{money(totals.netPay)}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              Save payroll
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && <FinanceNotice title={error} tone="red" />}

        <Field label="Base salary" hint={target.monthlySalary ? `Monthly salary on file: ${money(target.monthlySalary)}` : 'No monthly salary on file'}>
          <Input type="number" min="0" step="0.01" inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} />
        </Field>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-forest-700">Additions</h3>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setEarnings([...earnings, { type: 'allowance', label: '', amount: '' }])}
            >
              Add
            </Button>
          </div>
          {earnings.length === 0 && <p className="text-xs text-stone-500">Allowance, overtime, bonus or other extra pay.</p>}
          {earnings.map((e, i) => (
            <div key={i} className="grid grid-cols-[8rem_1fr_7rem_auto] gap-2 items-center">
              <Select
                value={e.type}
                onChange={(ev) => setEarnings(earnings.map((x, j) => (j === i ? { ...x, type: ev.target.value as PayrollEarningType } : x)))}
                aria-label="Addition type"
              >
                {(Object.keys(PAYROLL_EARNING_LABELS) as PayrollEarningType[]).map((t) => (
                  <option key={t} value={t}>
                    {PAYROLL_EARNING_LABELS[t]}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Description (optional)"
                value={e.label}
                onChange={(ev) => setEarnings(earnings.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={e.amount}
                onChange={(ev) => setEarnings(earnings.map((x, j) => (j === i ? { ...x, amount: ev.target.value } : x)))}
              />
              <Button size="sm" variant="ghost" aria-label="Remove addition" onClick={() => setEarnings(earnings.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-forest-700">Deductions</h3>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setDeductions([...deductions, { label: PAYROLL_DEDUCTION_PRESETS[0], amount: '' }])}
            >
              Add
            </Button>
          </div>
          {deductions.length === 0 && <p className="text-xs text-stone-500">Absence, late arrival, penalty or other cuts. These lower the salary cost.</p>}
          <datalist id="payroll-deduction-reasons">
            {PAYROLL_DEDUCTION_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          {deductions.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2 items-center">
              <Input
                list="payroll-deduction-reasons"
                placeholder="Reason, e.g. Absence 2 days"
                value={d.label}
                onChange={(ev) => setDeductions(deductions.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))}
              />
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount"
                value={d.amount}
                onChange={(ev) => setDeductions(deductions.map((x, j) => (j === i ? { ...x, amount: ev.target.value } : x)))}
              />
              <Button size="sm" variant="ghost" aria-label="Remove deduction" onClick={() => setDeductions(deductions.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-forest-700">Recover advances</h3>
            {advances.length > 0 && (
              <Button size="sm" variant="outline" onClick={recoverAll}>
                Recover all
              </Button>
            )}
          </div>
          {advances.length === 0 ? (
            <p className="text-xs text-stone-500">{target.name} has no unpaid advances.</p>
          ) : (
            advances.map((a) => (
              <div key={a.figures.expense.id} className="grid grid-cols-[1fr_7rem] gap-2 items-center">
                <p className="text-sm text-stone-700">
                  <span className="font-mono text-xs text-stone-500">{a.figures.expense.code}</span> {a.figures.expense.title}
                  <span className="block text-xs text-stone-500">
                    {formatDay(a.figures.expense.txnDate)} · owes {money(a.outstanding)}
                  </span>
                </p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  aria-label={`Recover from ${a.figures.expense.code}`}
                  value={recover[a.figures.expense.id] ?? ''}
                  onChange={(ev) => setRecover({ ...recover, [a.figures.expense.id]: ev.target.value })}
                />
              </div>
            ))
          )}
        </section>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-2xl bg-stone-50 p-3 text-sm">
          <div>
            <dt className="text-xs text-stone-500">Gross pay</dt>
            <dd className="font-medium text-forest-700">{money(totals.gross)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Deductions</dt>
            <dd className="font-medium text-red-700">−{money(totals.deductions)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Advance recovered</dt>
            <dd className="font-medium text-amber-700">−{money(totals.advanceRecovered)}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Net pay</dt>
            <dd className="font-semibold text-forest-700">{money(totals.netPay)}</dd>
          </div>
        </dl>

        {totals.netPay > 0.005 && (
          <section className="space-y-3">
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} /> Pay now
            </label>
            {payNow ? (
              <MoneyFieldsForm
                value={payValue}
                onChange={(next) => {
                  setPayTouched(true)
                  setPayment(next)
                }}
                accounts={data.accounts}
                amountLabel="Amount paid"
                amountHint="Pay part now and the rest later if needed"
                accountLabel="Paid from account"
                showNotes={false}
              />
            ) : (
              <p className="text-xs text-stone-500">The salary is saved as owed. Pay it later from the payroll list.</p>
            )}
          </section>
        )}

        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
