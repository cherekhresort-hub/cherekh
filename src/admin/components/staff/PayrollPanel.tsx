import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field, Input } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { recordExpensePayment, setStaffSalary, voidExpense } from '../../../lib/finance/financeDb'
import { buildExpenseFigures, depositPositions } from '../../../lib/finance/reporting'
import {
  currentPayrollPeriod,
  payrollRowsForPeriod,
  periodLabel,
  shiftPeriod,
  summarizePayrollRows,
  type PayrollRow,
} from '../../../lib/finance/payroll'
import type { FinanceData, StaffSalary, FinPayroll } from '../../../lib/finance/types'
import type { ExportColumn } from '../../../utils/reportExport'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import type { StaffMember } from '../../types'
import { EmptyRow, ExportButtons, FinanceNotice, MoneyFieldsForm, PaymentStatusBadge, Stat, TableShell, Td, Th } from '../finance/shared'
import { emptyMoneyFields, errorMessage, money, parseAmount, validateMoney, type MoneyFields } from '../finance/financeHelpers'
import { PayrollFormModal, type PayrollTarget } from './PayrollFormModal'

export const PayrollPanel = ({
  staff,
  data,
  salaries,
  payrolls,
  search,
}: {
  staff: StaffMember[]
  data: FinanceData
  salaries: StaffSalary[]
  payrolls: FinPayroll[]
  search: string
}) => {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [period, setPeriod] = useState(currentPayrollPeriod)
  const [processing, setProcessing] = useState<PayrollTarget | null>(null)
  const [paying, setPaying] = useState<PayrollRow | null>(null)
  const [voiding, setVoiding] = useState<PayrollRow | null>(null)
  const [salaryFor, setSalaryFor] = useState<PayrollRow | null>(null)

  const index = useMemo(() => buildExpenseFigures(data), [data])
  const deposits = useMemo(() => depositPositions(data, index), [data, index])
  const allRows = useMemo(() => payrollRowsForPeriod(staff, salaries, payrolls, index, period), [staff, salaries, payrolls, index, period])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? allRows.filter((r) => `${r.name} ${r.role}`.toLowerCase().includes(q)) : allRows
  }, [allRows, search])
  const summary = summarizePayrollRows(allRows)
  const notProcessed = allRows.filter((r) => !r.payroll && !r.staffId.startsWith('former:')).length

  const columns: ExportColumn<PayrollRow>[] = [
    { header: 'Staff member', value: (r) => r.name, width: 24 },
    { header: 'Role', value: (r) => r.role, width: 18 },
    { header: 'Month', value: () => periodLabel(period), width: 16 },
    { header: 'Base salary (BDT)', value: (r) => r.payroll?.baseSalary ?? 0, total: true },
    { header: 'Additions (BDT)', value: (r) => (r.payroll ? r.payroll.gross - r.payroll.baseSalary : 0), total: true },
    { header: 'Addition details', value: (r) => r.payroll?.earnings.map((e) => `${e.label} ${e.amount}`).join(', ') ?? '', width: 30 },
    { header: 'Gross (BDT)', value: (r) => r.payroll?.gross ?? 0, total: true },
    { header: 'Deductions (BDT)', value: (r) => r.payroll?.totalDeductions ?? 0, total: true },
    { header: 'Deduction details', value: (r) => r.payroll?.deductions.map((d) => `${d.label} ${d.amount}`).join(', ') ?? '', width: 30 },
    { header: 'Advance recovered (BDT)', value: (r) => r.payroll?.advanceRecovered ?? 0, total: true },
    { header: 'Net pay (BDT)', value: (r) => r.payroll?.netPay ?? 0, total: true },
    { header: 'Paid (BDT)', value: (r) => r.paid, total: true },
    { header: 'Still to pay (BDT)', value: (r) => r.outstanding, total: true },
    { header: 'Status', value: (r) => (r.payroll ? r.status.replace('_', ' ') : 'Not processed') },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" aria-label="Previous month" onClick={() => setPeriod(shiftPeriod(period, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Input
            type="month"
            value={period}
            onChange={(e) => e.target.value && setPeriod(e.target.value)}
            className="w-40"
            aria-label="Payroll month"
          />
          <Button variant="outline" size="sm" aria-label="Next month" onClick={() => setPeriod(shiftPeriod(period, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="ml-2 font-serif text-lg text-forest-700">{periodLabel(period)}</span>
        </div>
        <ExportButtons
          options={{ title: `Payroll ${periodLabel(period)}`, filenameBase: `cherekh-payroll-${period}` }}
          sheets={[{ name: 'Payroll', columns, rows: allRows.filter((r) => r.payroll) }]}
          disabled={summary.processed === 0}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Gross pay" value={money(summary.gross)} hint={`${summary.processed} processed · ${notProcessed} not yet`} />
        <Stat label="Deductions & advances" value={money(summary.deductions + summary.advanceRecovered)} hint={`${money(summary.deductions)} deducted · ${money(summary.advanceRecovered)} advances`} tone="muted" />
        <Stat label="Paid" value={money(summary.paid)} tone="good" />
        <Stat label="Still to pay" value={money(summary.outstanding)} tone={summary.outstanding > 0.005 ? 'bad' : 'default'} />
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>Staff member</Th>
            <Th right className="hidden md:table-cell">Monthly salary</Th>
            <Th right className="hidden lg:table-cell">Gross</Th>
            <Th right className="hidden lg:table-cell">Deductions</Th>
            <Th right>Net pay</Th>
            <Th right className="hidden md:table-cell">Still to pay</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.length === 0 ? (
            <EmptyRow colSpan={8}>No staff members match.</EmptyRow>
          ) : (
            rows.map((r) => (
              <tr key={r.staffId}>
                <Td>
                  <span className="font-medium text-forest-700">{r.name}</span>
                  <p className="text-xs text-stone-500">{r.role}</p>
                  {r.voided.length > 0 && <p className="text-xs text-stone-400">{r.voided.length} voided</p>}
                </Td>
                <Td right className="hidden md:table-cell">
                  {r.monthlySalary !== null ? money(r.monthlySalary) : <span className="text-stone-400">Not set</span>}
                  {isAdmin && !r.staffId.startsWith('former:') && (
                    <button type="button" className="block ml-auto text-xs text-forest-600 hover:underline" onClick={() => setSalaryFor(r)}>
                      {r.monthlySalary !== null ? 'Change' : 'Set salary'}
                    </button>
                  )}
                </Td>
                <Td right className="hidden lg:table-cell">{r.payroll ? money(r.payroll.gross) : '—'}</Td>
                <Td right className="hidden lg:table-cell">
                  {r.payroll ? money(r.payroll.totalDeductions + r.payroll.advanceRecovered) : '—'}
                </Td>
                <Td right className="font-medium">{r.payroll ? money(r.payroll.netPay) : '—'}</Td>
                <Td right className="hidden md:table-cell">{r.payroll ? money(r.outstanding) : '—'}</Td>
                <Td>{r.payroll ? <PaymentStatusBadge status={r.status === 'not_processed' ? 'unpaid' : r.status} /> : <Badge tone="neutral">Not processed</Badge>}</Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    {!r.payroll && !r.staffId.startsWith('former:') && (
                      <Button size="sm" onClick={() => setProcessing({ staffId: r.staffId, name: r.name, period, monthlySalary: r.monthlySalary })}>
                        Process
                      </Button>
                    )}
                    {r.payroll && r.outstanding > 0.005 && (
                      <Button size="sm" variant="outline" onClick={() => setPaying(r)}>
                        Pay
                      </Button>
                    )}
                    {r.payroll && (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/expenses?id=${r.payroll!.expenseId}`)}>
                        View
                      </Button>
                    )}
                    {r.payroll && isAdmin && (
                      <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setVoiding(r)}>
                        Void
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
      <p className="text-xs text-stone-500">
        Each payroll is saved as a salary expense in Expenses, dated the last day of the month. Advances recovered come off the staff member’s advance balance. To correct a payroll, an admin voids it (its payments are reversed) and processes it again.
      </p>

      <PayrollFormModal target={processing} data={data} deposits={deposits} onClose={() => setProcessing(null)} />
      <PayModal row={paying} data={data} period={period} onClose={() => setPaying(null)} />
      <VoidModal row={voiding} period={period} onClose={() => setVoiding(null)} />
      <SalaryModal row={salaryFor} onClose={() => setSalaryFor(null)} />
    </div>
  )
}

const PayModal = ({ row, data, period, onClose }: { row: PayrollRow | null; data: FinanceData; period: string; onClose: () => void }) => {
  const toast = useToast()
  const [value, setValue] = useState<MoneyFields>(() => emptyMoneyFields(data.accounts))
  const [openedFor, setOpenedFor] = useState<PayrollRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (row !== openedFor) {
    setOpenedFor(row)
    if (row) {
      setValue(emptyMoneyFields(data.accounts, String(row.outstanding)))
      setError(null)
    }
  }
  if (!row?.payroll) return null
  const payroll = row.payroll

  const save = async () => {
    const problem = validateMoney(value, row.outstanding)
    if (problem) return setError(problem)
    setSaving(true)
    try {
      const amount = parseAmount(value.amount)
      await recordExpensePayment(payroll.expenseId, {
        amount,
        accountId: value.accountId,
        method: value.method,
        reference: value.reference.trim() || undefined,
        date: value.date,
        notes: value.notes.trim() || undefined,
      })
      void logStaffActivity({
        category: 'finance',
        action: 'payroll_paid',
        title: `Salary paid · ${row.name} · ${periodLabel(period)}`,
        message: money(amount),
        entityId: payroll.expenseId,
      })
      toast.success('Payment saved')
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
      size="md"
      title={`Pay salary · ${row.name}`}
      description={`${periodLabel(period)} · still to pay ${money(row.outstanding)}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Save payment
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <FinanceNotice title={error} tone="red" />}
        <MoneyFieldsForm value={value} onChange={setValue} accounts={data.accounts} accountLabel="Paid from account" />
      </div>
    </Modal>
  )
}

const VoidModal = ({ row, period, onClose }: { row: PayrollRow | null; period: string; onClose: () => void }) => {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [openedFor, setOpenedFor] = useState<PayrollRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (row !== openedFor) {
    setOpenedFor(row)
    setReason('')
    setError(null)
  }
  if (!row?.payroll) return null
  const payroll = row.payroll

  const save = async () => {
    if (!reason.trim()) return setError('Give a reason for voiding this payroll.')
    setSaving(true)
    try {
      await voidExpense(payroll.expenseId, reason.trim())
      void logStaffActivity({
        category: 'finance',
        action: 'payroll_voided',
        title: `Payroll voided · ${row.name} · ${periodLabel(period)}`,
        message: reason.trim(),
        entityId: payroll.expenseId,
      })
      toast.success('Payroll voided', 'You can now process it again.')
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
      size="md"
      title={`Void payroll · ${row.name}`}
      description={periodLabel(period)}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Keep payroll
          </Button>
          <Button variant="danger" onClick={() => void save()} loading={saving}>
            Void payroll
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <FinanceNotice title={error} tone="red" />}
        <p className="text-sm text-stone-600">
          The salary expense is kept but marked void. Payments made ({money(row.paid)}) are reversed back to their accounts and recovered advances ({money(payroll.advanceRecovered)}) return to the staff member’s advance balance.
        </p>
        <Field label="Reason" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong overtime amount" />
        </Field>
      </div>
    </Modal>
  )
}

const SalaryModal = ({ row, onClose }: { row: PayrollRow | null; onClose: () => void }) => {
  const toast = useToast()
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [openedFor, setOpenedFor] = useState<PayrollRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (row !== openedFor) {
    setOpenedFor(row)
    setAmount(row?.monthlySalary !== null && row?.monthlySalary !== undefined ? String(row.monthlySalary) : '')
    setError(null)
  }
  if (!row) return null

  const save = async () => {
    const value = parseAmount(amount)
    if (!Number.isFinite(value) || value < 0) return setError('Enter the monthly salary.')
    setSaving(true)
    try {
      await setStaffSalary(row.staffId, value, user?.email ?? undefined)
      void logStaffActivity({
        category: 'staff',
        action: 'salary_set',
        title: `Monthly salary set · ${row.name}`,
        message: row.monthlySalary !== null ? `${money(row.monthlySalary)} → ${money(value)}` : money(value),
        entityId: row.staffId,
      })
      toast.success('Salary saved', row.name)
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
      size="sm"
      title={`Monthly salary · ${row.name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <FinanceNotice title={error} tone="red" />}
        <Field label="Monthly salary (BDT)" required hint="Used as the starting base salary when processing payroll. Past payrolls are not changed.">
          <Input type="number" min="0" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
