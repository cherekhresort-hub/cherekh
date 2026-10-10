import { useEffect, useMemo, useState } from 'react'
import { Paperclip, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { Tabs } from '../ui/Tabs'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { useStaffData } from '../../hooks/useStaffData'
import { CategoryOptions, FinanceNotice, MoneyFieldsForm } from './shared'
import { emptyMoneyFields, errorMessage, money, parseAmount, type MoneyFields } from './financeHelpers'
import { CLASSIFICATION_HELP, CLASSIFICATION_LABELS, DOC_TYPE_LABELS, PHASE_LABELS } from '../../../lib/finance/classification'
import { createExpense, saveSupplier, uploadAttachment, type ExpenseLineInput } from '../../../lib/finance/financeDb'
import { businessToday } from '../../../lib/finance/dates'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import type { AttachmentDocType, Classification, FinanceData } from '../../../lib/finance/types'
import { cn } from '../../utils/cn'

type Mode = 'quick' | 'detailed'
type PaymentChoice = 'full' | 'partial' | 'none'

interface LineDraft {
  key: string
  description: string
  categoryId: string
  quantity: string
  unit: string
  unitPrice: string
  createAsset: boolean
  usefulLifeMonths: string
}

interface FileDraft {
  key: string
  file: File
  docType: AttachmentDocType
}

const newLine = (categoryId = ''): LineDraft => ({
  key: Math.random().toString(36).slice(2),
  description: '',
  categoryId,
  quantity: '1',
  unit: '',
  unitPrice: '',
  createAsset: true,
  usefulLifeMonths: '',
})

const lineTotal = (l: LineDraft): number => {
  const q = Number(l.quantity)
  const p = Number(l.unitPrice)
  return Number.isFinite(q) && Number.isFinite(p) ? Math.round(q * p * 100) / 100 : 0
}

interface ExpenseFormModalProps {
  open: boolean
  initialMode?: Mode
  data: FinanceData
  onClose: () => void
  onCreated?: (expenseId: string) => void
}

export const ExpenseFormModal = ({ open, initialMode = 'quick', data, onClose, onCreated }: ExpenseFormModalProps) => {
  const toast = useToast()
  const { isAdmin, user } = useAuth()
  const { staff } = useStaffData()

  const [mode, setMode] = useState<Mode>(initialMode)
  const [title, setTitle] = useState('')
  const [txnDate, setTxnDate] = useState(businessToday())
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [newSupplierName, setNewSupplierName] = useState('')
  const [payeeName, setPayeeName] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [phase, setPhase] = useState('operating')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([newLine()])
  const [discount, setDiscount] = useState('')
  const [tax, setTax] = useState('')
  const [charges, setCharges] = useState('')
  const [paidBy, setPaidBy] = useState<'company' | 'employee'>('company')
  const [employeeStaffId, setEmployeeStaffId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [purchasedBy, setPurchasedBy] = useState('')
  const [requestedBy, setRequestedBy] = useState('')
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('full')
  const [payment, setPayment] = useState<MoneyFields>(() => emptyMoneyFields(data.accounts))
  const [files, setFiles] = useState<FileDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setTitle('')
    setTxnDate(businessToday())
    setInvoiceDate('')
    setDueDate('')
    setSupplierId('')
    setNewSupplierName('')
    setPayeeName('')
    setDepartmentId('')
    setProjectId('')
    setPhase('operating')
    setDescription('')
    setLines([newLine()])
    setDiscount('')
    setTax('')
    setCharges('')
    setPaidBy('company')
    setEmployeeStaffId('')
    setEmployeeName('')
    setPurchasedBy('')
    setRequestedBy('')
    setTags('')
    setNotes('')
    setPaymentChoice('full')
    setPayment(emptyMoneyFields(data.accounts))
    setFiles([])
    setError(null)
    // Reset only when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const categoryById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories])
  const effectiveLines = mode === 'quick' ? lines.slice(0, 1) : lines
  const subtotal = effectiveLines.reduce((s, l) => s + lineTotal(l), 0)
  const adjustments = mode === 'detailed'
    ? { discount: Number(discount) || 0, tax: Number(tax) || 0, charges: Number(charges) || 0 }
    : { discount: 0, tax: 0, charges: 0 }
  const total = Math.round((subtotal - adjustments.discount + adjustments.tax + adjustments.charges) * 100) / 100

  const lineClass = (l: LineDraft): Classification | null => categoryById.get(l.categoryId)?.classification ?? null

  const approvalNeeded = useMemo(
    () =>
      effectiveLines.some((l) => {
        const cat = categoryById.get(l.categoryId)
        if (!cat) return false
        const parent = cat.parentId ? categoryById.get(cat.parentId) : undefined
        const hit = (c?: typeof cat) => !!c && c.requiresApproval && (c.approvalThreshold == null || total >= c.approvalThreshold)
        return hit(cat) || hit(parent)
      }),
    [effectiveLines, categoryById, total]
  )

  const needsDescription = effectiveLines.some((l) => {
    const cat = categoryById.get(l.categoryId)
    const parent = cat?.parentId ? categoryById.get(cat.parentId) : undefined
    return !!(cat?.requiresDescription || parent?.requiresDescription)
  })

  const hasDeposit = effectiveLines.some((l) => lineClass(l) === 'deposit_advance')
  const hasCapital = effectiveLines.some((l) => lineClass(l) === 'capital_asset')

  const updateLine = (key: string, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const paymentAmount = paymentChoice === 'full' ? total : paymentChoice === 'partial' ? parseAmount(payment.amount) : 0

  const validate = (): string | null => {
    if (!title.trim()) return 'Enter an expense title.'
    if (!txnDate) return 'Choose the transaction date.'
    for (const [idx, l] of effectiveLines.entries()) {
      if (!l.categoryId) return `Choose a category for line ${idx + 1}.`
      if (!(Number(l.quantity) > 0)) return `Line ${idx + 1} needs a quantity above zero.`
      if (!(Number(l.unitPrice) >= 0) || l.unitPrice === '') return `Enter the ${mode === 'quick' ? 'amount' : 'unit price'} for line ${idx + 1}.`
    }
    if (total <= 0) return 'The total must be greater than zero.'
    if (needsDescription && !description.trim()) return 'A description is required for "Other / Uncategorized".'
    if (paidBy === 'employee' && !employeeStaffId && !employeeName.trim()) return 'Choose the employee who paid.'
    if (supplierId === '__new' && !newSupplierName.trim()) return 'Enter the new supplier name.'
    if (paidBy === 'company' && paymentChoice !== 'none') {
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) return 'Enter the amount paid.'
      if (paymentAmount > total + 0.005) return 'Amount paid cannot exceed the total.'
      if (!payment.accountId) return 'Choose the account the money was paid from.'
    }
    return null
  }

  const submit = async () => {
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setSaving(true)
    try {
      let resolvedSupplierId: string | null = supplierId && supplierId !== '__new' ? supplierId : null
      if (supplierId === '__new') {
        const created = await saveSupplier({ name: newSupplierName.trim(), active: true })
        resolvedSupplierId = created.id
      }
      const lineInputs: ExpenseLineInput[] = effectiveLines.map((l) => ({
        description: l.description.trim() || (mode === 'quick' ? title.trim() : ''),
        categoryId: l.categoryId,
        quantity: Number(l.quantity),
        unit: l.unit.trim() || undefined,
        unitPrice: Number(l.unitPrice),
        createAsset: l.createAsset,
        usefulLifeMonths: l.usefulLifeMonths ? Number(l.usefulLifeMonths) : null,
      }))
      const result = await createExpense({
        title: title.trim(),
        txnDate,
        invoiceDate: invoiceDate || null,
        dueDate: dueDate || null,
        supplierId: resolvedSupplierId,
        payeeName: payeeName.trim() || undefined,
        departmentId: departmentId || null,
        projectId: projectId || null,
        phase,
        description: description.trim() || undefined,
        discount: adjustments.discount,
        tax: adjustments.tax,
        additionalCharges: adjustments.charges,
        paidByType: paidBy,
        employeeStaffId: paidBy === 'employee' ? employeeStaffId || null : null,
        employeeName:
          paidBy === 'employee'
            ? employeeName.trim() || staff.find((s) => s.id === employeeStaffId)?.name || undefined
            : undefined,
        purchasedBy: purchasedBy.trim() || undefined,
        requestedBy: requestedBy.trim() || undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        notes: notes.trim() || undefined,
        lines: lineInputs,
        payment:
          paidBy === 'company' && paymentChoice !== 'none'
            ? {
                amount: paymentAmount,
                accountId: payment.accountId,
                method: payment.method,
                reference: payment.reference.trim() || undefined,
                date: payment.date || txnDate,
              }
            : null,
      })

      const failedUploads: string[] = []
      for (const f of files) {
        try {
          await uploadAttachment('expense', result.id, f.file, f.docType, user?.email ?? undefined)
        } catch (err) {
          failedUploads.push(`${f.file.name}: ${errorMessage(err)}`)
        }
      }

      void logStaffActivity({
        category: 'finance',
        action: 'expense_created',
        title: `Expense ${result.code} recorded`,
        message: `${title.trim()} · ${money(total)}${result.approval_status === 'pending' ? ' · pending approval' : ''}`,
        entityId: result.id,
        metadata: { code: result.code, total, approval: result.approval_status },
      })

      toast.success(
        `Expense ${result.code} saved`,
        result.approval_status === 'pending'
          ? 'Awaiting admin approval.'
          : result.assets_created > 0
            ? `${result.assets_created} asset${result.assets_created === 1 ? '' : 's'} added to the register.`
            : undefined
      )
      if (failedUploads.length > 0) toast.error('Some files did not upload', failedUploads.join('\n'))
      onCreated?.(result.id)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const activeDepartments = data.departments.filter((d) => d.active)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Record expense"
      description="Expenses are recorded once. Later installments, refunds and reimbursements are added from the expense itself."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-stone-600">
            Total <span className="font-semibold text-forest-700 tabular-nums">{money(total)}</span>
            {paidBy === 'company' && paymentChoice !== 'none' && Number.isFinite(paymentAmount) && (
              <span className="ml-2 text-xs text-stone-500">
                paying {money(paymentAmount)} · balance {money(Math.max(0, total - paymentAmount))}
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} loading={saving}>
              Save expense
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <Tabs<Mode>
          value={mode}
          onChange={setMode}
          layoutId="expense-mode"
          items={[
            { value: 'quick', label: 'Quick entry' },
            { value: 'detailed', label: 'Detailed purchase' },
          ]}
        />

        {error && <FinanceNotice title={error} tone="red" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Expense title" required className="sm:col-span-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Room furniture from Hatil" autoFocus />
          </Field>
          <Field label="Transaction date" required>
            <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
          </Field>
          <Field label="Supplier / paid to">
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— None / not a regular supplier —</option>
              {data.suppliers
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              <option value="__new">+ New supplier…</option>
            </Select>
          </Field>
          {supplierId === '__new' ? (
            <Field label="New supplier name" required>
              <Input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
            </Field>
          ) : (
            <Field label="Recipient name" hint="If not a listed supplier">
              <Input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} />
            </Field>
          )}
          <Field label="Department">
            <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">— Not set —</option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* Line items */}
        {mode === 'quick' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category" required>
              <Select value={lines[0].categoryId} onChange={(e) => updateLine(lines[0].key, { categoryId: e.target.value })}>
                <option value="">Choose category…</option>
                <CategoryOptions categories={data.categories} />
              </Select>
            </Field>
            <Field label="Amount (BDT)" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={lines[0].unitPrice}
                onChange={(e) => updateLine(lines[0].key, { unitPrice: e.target.value, quantity: '1' })}
              />
            </Field>
            {lineClass(lines[0]) && (
              <p className="sm:col-span-2 text-xs text-stone-500 -mt-1">
                Treated as <strong>{CLASSIFICATION_LABELS[lineClass(lines[0])!]}</strong>. {CLASSIFICATION_HELP[lineClass(lines[0])!]}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-forest-700">Line items</h3>
              <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setLines((p) => [...p, newLine()])}>
                Add line
              </Button>
            </div>
            {lines.map((l, idx) => {
              const cls = lineClass(l)
              return (
                <div key={l.key} className="rounded-xl border border-stone-200 p-3 space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-12 md:col-span-4"
                      placeholder={`Item ${idx + 1} (e.g. Beds)`}
                      value={l.description}
                      onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    />
                    <Select className="col-span-12 md:col-span-4" value={l.categoryId} onChange={(e) => updateLine(l.key, { categoryId: e.target.value })}>
                      <option value="">Category…</option>
                      <CategoryOptions categories={data.categories} />
                    </Select>
                    <Input
                      className="col-span-3 md:col-span-1"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Qty"
                      value={l.quantity}
                      onChange={(e) => updateLine(l.key, { quantity: e.target.value })}
                    />
                    <Input className="col-span-3 md:col-span-1" placeholder="Unit" value={l.unit} onChange={(e) => updateLine(l.key, { unit: e.target.value })} />
                    <Input
                      className="col-span-4 md:col-span-2"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Unit price"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l.key, { unitPrice: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-stone-500">
                      {cls ? CLASSIFICATION_LABELS[cls] : 'No category'} · line total{' '}
                      <span className="font-medium text-stone-700 tabular-nums">{money(lineTotal(l))}</span>
                    </span>
                    <div className="flex items-center gap-3">
                      {cls === 'capital_asset' && (
                        <>
                          <label className="inline-flex items-center gap-1.5 text-stone-600">
                            <input type="checkbox" checked={l.createAsset} onChange={(e) => updateLine(l.key, { createAsset: e.target.checked })} />
                            Add to asset register
                          </label>
                          {l.createAsset && (
                            <Input
                              className="h-8 w-36 text-xs"
                              type="number"
                              min="1"
                              placeholder="Useful life (months)"
                              value={l.usefulLifeMonths}
                              onChange={(e) => updateLine(l.key, { usefulLifeMonths: e.target.value })}
                            />
                          )}
                        </>
                      )}
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))}
                          className="text-stone-400 hover:text-red-600"
                          aria-label="Remove line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <Field label="Subtotal">
                <Input value={money(subtotal)} disabled />
              </Field>
              <Field label="Discount">
                <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </Field>
              <Field label="Tax / VAT">
                <Input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
              </Field>
              <Field label="Additional charges" hint="Delivery, labour, etc.">
                <Input type="number" min="0" step="0.01" value={charges} onChange={(e) => setCharges(e.target.value)} />
              </Field>
            </div>
            <p className="text-xs text-stone-500">
              Total = subtotal − discount + tax + charges = <strong className="text-forest-700">{money(total)}</strong>. Discount, tax and charges are spread across lines in proportion to their value.
            </p>
          </div>
        )}

        {approvalNeeded && (
          <FinanceNotice title={isAdmin ? 'This category needs approval — it will be auto-approved by you.' : 'This expense needs admin approval.'} tone="sky">
            It is saved immediately and flagged as pending until an admin approves it.
          </FinanceNotice>
        )}
        {hasDeposit && (
          <FinanceNotice title="Deposit / advance" tone="sky">
            Refundable deposits and advances are tracked as balances, not expenses. Record refunds or apply them to later bills from the Deposits tab.
          </FinanceNotice>
        )}
        {hasCapital && mode === 'quick' && (
          <FinanceNotice title="Capital asset" tone="sky">
            This will be added to the asset register. Switch to Detailed purchase to set a useful life for depreciation.
          </FinanceNotice>
        )}

        <Field label="Description" required={needsDescription}>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        {/* Who paid */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-forest-700">Payment</h3>
          <div className="flex flex-wrap gap-2">
            {(['company', 'employee'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setPaidBy(v)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm border',
                  paidBy === v ? 'bg-forest-700 text-white border-forest-700' : 'bg-white text-stone-700 border-stone-200'
                )}
              >
                {v === 'company' ? 'Paid by Cherekh Center' : 'Paid by an employee (to reimburse)'}
              </button>
            ))}
          </div>

          {paidBy === 'employee' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Employee" required>
                <Select value={employeeStaffId} onChange={(e) => setEmployeeStaffId(e.target.value)}>
                  <option value="">Choose staff member…</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="…or name (if not on the roster)">
                <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} />
              </Field>
              <p className="sm:col-span-2 text-xs text-stone-500">
                The expense is counted once. Reimbursing the employee later is a payment against it, not a second expense.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['full', 'Paid in full now'],
                    ['partial', 'Partly paid'],
                    ['none', 'Not paid yet (on credit)'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setPaymentChoice(v)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border',
                      paymentChoice === v ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-stone-700 border-stone-200'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {paymentChoice !== 'none' && (
                <MoneyFieldsForm
                  value={paymentChoice === 'full' ? { ...payment, amount: String(total) } : payment}
                  onChange={(next) => setPayment(paymentChoice === 'full' ? { ...next, amount: payment.amount } : next)}
                  accounts={data.accounts}
                  amountLabel={paymentChoice === 'full' ? 'Amount paid (full)' : 'Amount paid now'}
                  accountLabel="Paid from account"
                  showNotes={false}
                />
              )}
              {mode === 'detailed' && paymentChoice !== 'full' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Invoice / bill date">
                    <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
                  </Field>
                  <Field label="Payment due date">
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </Field>
                </div>
              )}
            </>
          )}
        </div>

        {mode === 'detailed' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Phase">
              <Select value={phase} onChange={(e) => setPhase(e.target.value)}>
                {Object.entries(PHASE_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Project">
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">— None —</option>
                {data.projects
                  .filter((p) => p.status !== 'cancelled')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Purchased by">
              <Input value={purchasedBy} onChange={(e) => setPurchasedBy(e.target.value)} />
            </Field>
            <Field label="Requested by">
              <Input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
            </Field>
            <Field label="Tags" hint="Comma separated">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
            <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        )}

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-forest-700">Receipts & documents</h3>
            <label className="inline-flex items-center gap-1.5 text-sm text-forest-700 cursor-pointer hover:underline">
              <Paperclip className="w-4 h-4" /> Attach files
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []).map((file) => ({
                    key: Math.random().toString(36).slice(2),
                    file,
                    docType: (mode === 'quick' ? 'receipt' : 'invoice') as AttachmentDocType,
                  }))
                  setFiles((prev) => [...prev, ...picked])
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {files.length === 0 ? (
            <p className="text-xs text-stone-500">PDF or photos, up to 10 MB each. Stored privately.</p>
          ) : (
            <ul className="space-y-1.5">
              {files.map((f) => (
                <li key={f.key} className="flex items-center gap-2 text-sm">
                  <span className="truncate flex-1">{f.file.name}</span>
                  <Select
                    className="h-8 w-44 text-xs"
                    value={f.docType}
                    onChange={(e) =>
                      setFiles((prev) => prev.map((x) => (x.key === f.key ? { ...x, docType: e.target.value as AttachmentDocType } : x)))
                    }
                  >
                    {(['receipt', 'invoice', 'purchase_order', 'warranty', 'contract', 'payment_confirmation', 'other'] as AttachmentDocType[]).map((d) => (
                      <option key={d} value={d}>
                        {DOC_TYPE_LABELS[d]}
                      </option>
                    ))}
                  </Select>
                  <button type="button" className="text-stone-400 hover:text-red-600" onClick={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))} aria-label="Remove file">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
