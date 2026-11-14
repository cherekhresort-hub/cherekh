import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field, Input, Select } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { createExpense } from '../../../lib/finance/financeDb'
import { STAFF_ADVANCE_CATEGORY_ID } from '../../../lib/finance/classification'
import {
  buildExpenseFigures,
  depositPositions,
  isStaffAdvance,
  staffAdvanceBalances,
  type DepositPosition,
  type StaffAdvanceBalance,
} from '../../../lib/finance/reporting'
import type { FinanceData } from '../../../lib/finance/types'
import type { ExportColumn } from '../../../utils/reportExport'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import type { StaffMember } from '../../types'
import { currentStaff } from '../../data/staff'
import { SettleModal, type SettleKind } from '../finance/DepositsPanel'
import { EmptyRow, ExportButtons, FinanceNotice, MoneyFieldsForm, SectionTitle, Stat, TableShell, Td, Th } from '../finance/shared'
import { emptyMoneyFields, errorMessage, formatDay, money, parseAmount, validateMoney, type MoneyFields } from '../finance/financeHelpers'

export const AdvancesPanel = ({ staff, data, search }: { staff: StaffMember[]; data: FinanceData; search: string }) => {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [giving, setGiving] = useState<{ staffId: string } | null>(null)
  const [settling, setSettling] = useState<{ position: DepositPosition; kind: SettleKind } | null>(null)
  const [showSettled, setShowSettled] = useState(false)

  const index = useMemo(() => buildExpenseFigures(data), [data])
  const deposits = useMemo(() => depositPositions(data, index), [data, index])
  const staffNames = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff])
  const q = search.trim().toLowerCase()
  const balances = useMemo(
    () =>
      staffAdvanceBalances(deposits, staffNames).filter(
        (b) => (showSettled || b.outstanding > 0.005) && (!q || b.name.toLowerCase().includes(q))
      ),
    [deposits, staffNames, showSettled, q]
  )
  const owed = balances.reduce((s, b) => s + b.outstanding, 0)
  const openCount = balances.reduce((s, b) => s + b.positions.filter((p) => p.outstanding > 0.005).length, 0)

  const columns: ExportColumn<StaffAdvanceBalance>[] = [
    { header: 'Staff member', value: (r) => r.name, width: 24 },
    { header: 'Lent (BDT)', value: (r) => r.lent, total: true },
    { header: 'Repaid (BDT)', value: (r) => r.repaid, total: true },
    { header: 'Deducted from salary (BDT)', value: (r) => r.deducted, total: true },
    { header: 'Forgiven (BDT)', value: (r) => r.writtenOff, total: true },
    { header: 'Still owes (BDT)', value: (r) => r.outstanding, total: true },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Owed by staff" value={money(owed)} tone={owed > 0.005 ? 'bad' : 'default'} />
        <Stat label="Open advances" value={openCount} />
      </div>

      <SectionTitle
        title="Advances & loans"
        description="Money lent to staff. It is not an expense: it stays owed until repaid, deducted from salary (in Payroll) or forgiven."
        actions={
          <>
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={showSettled} onChange={(e) => setShowSettled(e.target.checked)} /> Show settled
            </label>
            <ExportButtons
              options={{ title: 'Staff advances & loans', filenameBase: 'cherekh-staff-advances' }}
              sheets={[{ name: 'Staff advances', columns, rows: balances }]}
              disabled={balances.length === 0}
            />
            <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setGiving({ staffId: '' })}>
              Give advance
            </Button>
          </>
        }
      />

      <TableShell>
        <thead>
          <tr>
            <Th>Advance</Th>
            <Th right>Lent</Th>
            <Th right className="hidden md:table-cell">Repaid</Th>
            <Th right className="hidden md:table-cell">Deducted</Th>
            <Th right className="hidden lg:table-cell">Forgiven</Th>
            <Th right>Still owes</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {balances.length === 0 ? (
            <EmptyRow colSpan={7}>No staff member owes money right now.</EmptyRow>
          ) : (
            balances.flatMap((b) => [
              <tr key={b.key} className="bg-stone-50/60">
                <Td>
                  <span className="font-medium text-forest-700">{b.name}</span>
                </Td>
                <Td right className="font-medium">{money(b.lent)}</Td>
                <Td right className="hidden md:table-cell">{money(b.repaid)}</Td>
                <Td right className="hidden md:table-cell">{money(b.deducted)}</Td>
                <Td right className="hidden lg:table-cell">{money(b.writtenOff)}</Td>
                <Td right className={b.outstanding > 0.005 ? 'font-semibold text-red-700' : 'font-semibold'}>{money(b.outstanding)}</Td>
                <Td right>
                  {b.staffId && (
                    <Button size="sm" variant="ghost" onClick={() => setGiving({ staffId: b.staffId! })}>
                      Give more
                    </Button>
                  )}
                </Td>
              </tr>,
              ...b.positions
                .filter((p) => showSettled || p.outstanding > 0.005)
                .map((p) => {
                  const e = p.figures.expense
                  return (
                    <tr key={e.id}>
                      <Td className="pl-6">
                        <button type="button" className="text-left hover:underline" onClick={() => navigate(`/admin/expenses?id=${e.id}`)}>
                          <span className="font-mono text-xs text-stone-500">{e.code}</span> <span className="text-stone-700">{e.title}</span>
                        </button>
                        <p className="text-xs text-stone-500">{formatDay(e.txnDate)}</p>
                      </Td>
                      <Td right>{money(p.base)}</Td>
                      <Td right className="hidden md:table-cell">{money(p.refunded)}</Td>
                      <Td right className="hidden md:table-cell">{money(p.applied)}</Td>
                      <Td right className="hidden lg:table-cell">{money(p.writtenOff)}</Td>
                      <Td right>{money(p.outstanding)}</Td>
                      <Td right>
                        {p.outstanding > 0.005 && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => setSettling({ position: p, kind: 'refund_received' })}>
                              Repaid
                            </Button>
                            {isAdmin && (
                              <Button size="sm" variant="ghost" onClick={() => setSettling({ position: p, kind: 'written_off' })}>
                                Forgive
                              </Button>
                            )}
                          </div>
                        )}
                      </Td>
                    </tr>
                  )
                }),
            ])
          )}
        </tbody>
      </TableShell>
      <p className="text-xs text-stone-500">
        To take an advance out of salary, process the payroll and enter the amount under “Recover advances”.
      </p>

      <GiveAdvanceModal state={giving} staff={currentStaff(staff)} data={data} onClose={() => setGiving(null)} />
      <SettleModal state={settling} data={data} index={index} onClose={() => setSettling(null)} />
    </div>
  )
}

const GiveAdvanceModal = ({
  state,
  staff,
  data,
  onClose,
}: {
  state: { staffId: string } | null
  staff: StaffMember[]
  data: FinanceData
  onClose: () => void
}) => {
  const toast = useToast()
  const [openedFor, setOpenedFor] = useState<typeof state>(null)
  const [staffId, setStaffId] = useState('')
  const [kind, setKind] = useState<'advance' | 'loan'>('advance')
  const [reason, setReason] = useState('')
  const [value, setValue] = useState<MoneyFields>(() => emptyMoneyFields(data.accounts))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (state !== openedFor) {
    setOpenedFor(state)
    if (state) {
      setStaffId(state.staffId)
      setKind('advance')
      setReason('')
      setValue(emptyMoneyFields(data.accounts))
      setError(null)
    }
  }
  if (!state) return null

  const member = staff.find((s) => s.id === staffId)

  const save = async () => {
    if (!member) return setError('Choose the staff member.')
    const problem = validateMoney(value)
    if (problem) return setError(problem)
    const amount = parseAmount(value.amount)
    const label = kind === 'loan' ? 'Staff loan' : 'Salary advance'
    setSaving(true)
    try {
      const result = await createExpense({
        title: `${label} · ${member.name}`,
        txnDate: value.date,
        payeeName: member.name,
        departmentId: 'human_resources',
        description: reason.trim() || undefined,
        paidByType: 'company',
        employeeStaffId: member.id,
        employeeName: member.name,
        tags: ['staff-advance'],
        lines: [
          {
            description: reason.trim() ? `${label}: ${reason.trim()}` : label,
            categoryId: STAFF_ADVANCE_CATEGORY_ID,
            quantity: 1,
            unitPrice: amount,
          },
        ],
        payment: {
          amount,
          accountId: value.accountId,
          method: value.method,
          reference: value.reference.trim() || undefined,
          date: value.date,
          notes: value.notes.trim() || undefined,
        },
      })
      void logStaffActivity({
        category: 'finance',
        action: 'staff_advance_given',
        title: `${label} · ${member.name}`,
        message: `${money(amount)} · ${result.code}`,
        entityId: result.id,
      })
      toast.success(`${label} saved`, member.name)
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
      title="Give advance or loan"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Staff member" required>
            <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
              <option value="">Choose…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={kind} onChange={(e) => setKind(e.target.value as 'advance' | 'loan')}>
              <option value="advance">Salary advance</option>
              <option value="loan">Personal loan</option>
            </Select>
          </Field>
          <Field label="Reason" className="sm:col-span-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family emergency" />
          </Field>
        </div>
        <MoneyFieldsForm value={value} onChange={setValue} accounts={data.accounts} accountLabel="Paid from account" />
        {member && <AdvanceHint data={data} staffId={member.id} name={member.name} />}
      </div>
    </Modal>
  )
}

const AdvanceHint = ({ data, staffId, name }: { data: FinanceData; staffId: string; name: string }) => {
  const owed = useMemo(() => {
    const index = buildExpenseFigures(data)
    return depositPositions(data, index)
      .filter((d) => isStaffAdvance(d.figures) && d.figures.expense.employeeStaffId === staffId)
      .reduce((s, d) => s + d.outstanding, 0)
  }, [data, staffId])
  if (owed <= 0.005) return null
  return <p className="text-xs text-amber-700">{name} already owes {money(owed)}.</p>
}
