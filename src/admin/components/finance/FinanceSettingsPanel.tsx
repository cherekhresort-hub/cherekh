import { Fragment, useEffect, useMemo, useState } from 'react'
import { ArrowLeftRight, Pencil, Plus, RotateCcw, Scale } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Tabs } from '../ui/Tabs'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useBookingsData } from '../../hooks/useBookingsData'
import {
  ACCOUNT_TYPE_LABELS,
  CLASSIFICATION_HELP,
  CLASSIFICATION_LABELS,
  FIN_PAYMENT_METHODS,
  LEDGER_KIND_LABELS,
  finMethodLabel,
} from '../../../lib/finance/classification'
import {
  loadFinanceAudit,
  recordAdjustment,
  saveAccount,
  saveCategory,
  saveDepartment,
  saveProject,
  transferBetweenAccounts,
} from '../../../lib/finance/financeDb'
import { businessToday } from '../../../lib/finance/dates'
import { toRevenueBookings } from '../../../lib/finance/revenueAdapter'
import { accountBalances, reversedEntryIds, type AccountBalance } from '../../../lib/finance/reporting'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import type {
  AccountType,
  Classification,
  FinAccount,
  FinanceData,
  FinAuditRow,
  FinCategory,
  FinDepartment,
  FinLedgerEntry,
  FinProject,
  ProjectStatus,
} from '../../../lib/finance/types'
import type { ExportColumn } from '../../../utils/reportExport'
import { ReverseEntryModal } from './ReverseEntryModal'
import { EmptyRow, ExportButtons, FinanceNotice, Pager, SectionTitle, TableShell, Td, Th } from './shared'
import { errorMessage, formatDay, money, parseAmount, usePaged } from './financeHelpers'

type SettingsTab = 'accounts' | 'categories' | 'departments' | 'projects' | 'audit'

export const FinanceSettingsPanel = ({ data }: { data: FinanceData }) => {
  const [tab, setTab] = useState<SettingsTab>('accounts')
  return (
    <div className="space-y-4">
      <Tabs<SettingsTab>
        value={tab}
        onChange={setTab}
        layoutId="finance-settings-tab"
        items={[
          { value: 'accounts', label: 'Accounts & ledger' },
          { value: 'categories', label: 'Categories' },
          { value: 'departments', label: 'Departments' },
          { value: 'projects', label: 'Projects' },
          { value: 'audit', label: 'Audit log' },
        ]}
      />
      {tab === 'accounts' && <AccountsSection data={data} />}
      {tab === 'categories' && <CategoriesSection data={data} />}
      {tab === 'departments' && <DepartmentsSection data={data} />}
      {tab === 'projects' && <ProjectsSection data={data} />}
      {tab === 'audit' && <AuditSection />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared modal footer
// ---------------------------------------------------------------------------

const SaveFooter = ({ onCancel, onSave, saving, label = 'Save', danger }: { onCancel: () => void; onSave: () => void; saving: boolean; label?: string; danger?: boolean }) => (
  <div className="flex justify-end gap-2">
    <Button variant="ghost" onClick={onCancel} disabled={saving}>
      Cancel
    </Button>
    <Button variant={danger ? 'danger' : 'primary'} onClick={onSave} loading={saving}>
      {label}
    </Button>
  </div>
)

/** Small state helper for modals that edit a copy of an object. */
const useDraft = <T,>(source: T | null) => {
  const [draft, setDraft] = useState<T | null>(source)
  const [openedFor, setOpenedFor] = useState<T | null>(source)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  if (source !== openedFor) {
    setOpenedFor(source)
    setDraft(source)
    setError(null)
  }
  return { draft, setDraft, error, setError, saving, setSaving }
}

// ---------------------------------------------------------------------------
// Accounts, transfers, adjustments, ledger
// ---------------------------------------------------------------------------

const AccountsSection = ({ data }: { data: FinanceData }) => {
  const { bookings } = useBookingsData()
  const [asOf, setAsOf] = useState(businessToday())
  const [editing, setEditing] = useState<Partial<FinAccount> | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [reversing, setReversing] = useState<FinLedgerEntry | null>(null)
  const [kindFilter, setKindFilter] = useState<'all' | 'non_expense' | FinLedgerEntry['kind']>('all')

  const revenueBookings = useMemo(() => toRevenueBookings(bookings), [bookings])
  const balances = useMemo(() => accountBalances(revenueBookings, data, asOf), [revenueBookings, data, asOf])
  const reversed = useMemo(() => reversedEntryIds(data.ledger), [data.ledger])
  const ledgerRows = useMemo(
    () =>
      data.ledger
        .filter((l) => (kindFilter === 'all' ? true : kindFilter === 'non_expense' ? !l.expenseId : l.kind === kindFilter))
        .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt)),
    [data.ledger, kindFilter]
  )
  const paged = usePaged(ledgerRows, 30)
  const accountName = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? id
  const expenseCode = (id: string | null) => (id ? data.expenses.find((e) => e.id === id)?.code : undefined)

  const balanceColumns: ExportColumn<AccountBalance>[] = [
    { header: 'Account', value: (r) => r.name, width: 26 },
    { header: 'Opening (BDT)', value: (r) => r.opening, total: true },
    { header: 'Guest receipts net (BDT)', value: (r) => r.guestReceipts, total: true },
    { header: 'Other money in (BDT)', value: (r) => r.ledgerIn, total: true },
    { header: 'Money out (BDT)', value: (r) => r.ledgerOut, total: true },
    { header: 'Balance (BDT)', value: (r) => r.balance, total: true },
  ]
  const ledgerColumns: ExportColumn<FinLedgerEntry>[] = [
    { header: 'Date', value: (l) => l.entryDate },
    { header: 'Account', value: (l) => accountName(l.accountId) },
    { header: 'Kind', value: (l) => LEDGER_KIND_LABELS[l.kind] },
    { header: 'Direction', value: (l) => l.direction },
    { header: 'Amount (BDT)', value: (l) => l.amount },
    { header: 'Method', value: (l) => finMethodLabel(l.method) },
    { header: 'Reference', value: (l) => l.reference ?? '' },
    { header: 'Linked to', value: (l) => expenseCode(l.expenseId) ?? '' },
    { header: 'Reversal of', value: (l) => (l.reversalOf ? 'yes' : '') },
    { header: 'Reversed', value: (l) => (reversed.has(l.id) ? 'yes' : '') },
    { header: 'Notes', value: (l) => l.notes ?? '', width: 30 },
    { header: 'Recorded by', value: (l) => l.createdBy ?? '' },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Account balances"
        description="Opening balance + guest payments (from bookings, mapped by payment method) + other money in − money out. Transfers move money between accounts and do not change the total."
        actions={
          <>
            <Input type="date" className="w-40" value={asOf} onChange={(e) => setAsOf(e.target.value || businessToday())} aria-label="Balance as of" />
            <ExportButtons
              options={{ title: 'Account balances', filenameBase: `cherekh-account-balances-${asOf}`, period: `As of ${asOf}` }}
              sheets={[
                { name: 'Balances', columns: balanceColumns, rows: balances },
                { name: 'Ledger', columns: ledgerColumns, rows: ledgerRows },
              ]}
            />
            <Button size="sm" variant="outline" leftIcon={<ArrowLeftRight className="w-4 h-4" />} onClick={() => setTransferOpen(true)}>
              Transfer
            </Button>
            <Button size="sm" variant="outline" leftIcon={<Scale className="w-4 h-4" />} onClick={() => setAdjustOpen(true)}>
              Adjustment
            </Button>
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEditing({ accountType: 'bank', active: true, openingBalance: 0, defaultMethods: [] })}>
              Account
            </Button>
          </>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Account</Th>
            <Th right>Opening</Th>
            <Th right>Guest receipts</Th>
            <Th right>Other in</Th>
            <Th right>Out</Th>
            <Th right>Balance</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {balances.map((b) => (
            <tr key={b.accountId}>
              <Td>
                <p className="font-medium text-forest-700">{b.name}</p>
                <p className="text-xs text-stone-500">
                  {b.account ? `${ACCOUNT_TYPE_LABELS[b.account.accountType]} · ${b.account.defaultMethods.map(finMethodLabel).join(', ') || 'no methods mapped'}` : 'Guest payments whose method is not mapped to any account'}
                  {b.account && !b.account.active && ' · inactive'}
                </p>
              </Td>
              <Td right>{money(b.opening)}</Td>
              <Td right>{money(b.guestReceipts)}</Td>
              <Td right>{money(b.ledgerIn)}</Td>
              <Td right>{money(b.ledgerOut)}</Td>
              <Td right className={b.balance < 0 ? 'text-red-700 font-medium' : 'font-medium text-forest-700'}>
                {money(b.balance)}
              </Td>
              <Td right>
                {b.account && (
                  <button type="button" className="text-stone-400 hover:text-forest-700" aria-label="Edit account" onClick={() => setEditing(b.account as FinAccount)}>
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </Td>
            </tr>
          ))}
          <tr className="bg-stone-50 font-medium">
            <Td>Total</Td>
            <Td right>{money(balances.reduce((s, b) => s + b.opening, 0))}</Td>
            <Td right>{money(balances.reduce((s, b) => s + b.guestReceipts, 0))}</Td>
            <Td right>{money(balances.reduce((s, b) => s + b.ledgerIn, 0))}</Td>
            <Td right>{money(balances.reduce((s, b) => s + b.ledgerOut, 0))}</Td>
            <Td right>{money(balances.reduce((s, b) => s + b.balance, 0))}</Td>
            <Td />
          </tr>
        </tbody>
      </TableShell>

      <SectionTitle
        title="Ledger"
        description="Every cash movement other than guest payments. Entries are never edited or deleted; mistakes are corrected with a reversing entry."
        actions={
          <Select className="w-52" value={kindFilter} onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}>
            <option value="all">All entries</option>
            <option value="non_expense">Not linked to an expense</option>
            {(Object.keys(LEDGER_KIND_LABELS) as FinLedgerEntry['kind'][]).map((k) => (
              <option key={k} value={k}>
                {LEDGER_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>Entry</Th>
            <Th className="hidden md:table-cell">Account</Th>
            <Th right>Amount</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {paged.slice.length === 0 ? (
            <EmptyRow colSpan={5}>No ledger entries.</EmptyRow>
          ) : (
            paged.slice.map((l) => {
              const wasReversed = reversed.has(l.id)
              const link = expenseCode(l.expenseId)
              return (
                <tr key={l.id} className={l.reversalOf || wasReversed ? 'bg-stone-50/70' : undefined}>
                  <Td className="whitespace-nowrap">{formatDay(l.entryDate)}</Td>
                  <Td>
                    <p className={wasReversed ? 'line-through text-stone-500' : 'text-stone-800'}>
                      {l.reversalOf ? 'Reversal · ' : ''}
                      {LEDGER_KIND_LABELS[l.kind]}
                      {link && <span className="font-mono text-xs text-stone-500"> · {link}</span>}
                    </p>
                    <p className="text-xs text-stone-500">
                      {[finMethodLabel(l.method), l.reference && `Ref ${l.reference}`, l.notes, l.createdBy].filter(Boolean).join(' · ')}
                    </p>
                  </Td>
                  <Td className="hidden md:table-cell text-stone-600">{accountName(l.accountId)}</Td>
                  <Td right className={l.direction === 'in' ? 'text-forest-700' : undefined}>
                    {l.direction === 'in' ? '+' : '−'}
                    {money(l.amount)}
                  </Td>
                  <Td right>
                    {!l.reversalOf && !wasReversed && (
                      <button type="button" className="text-stone-400 hover:text-red-600" title="Reverse" onClick={() => setReversing(l)}>
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </Td>
                </tr>
              )
            })
          )}
        </tbody>
      </TableShell>
      <Pager {...paged} />

      <AccountModal account={editing} onClose={() => setEditing(null)} />
      <TransferModal open={transferOpen} accounts={data.accounts} onClose={() => setTransferOpen(false)} />
      <AdjustmentModal open={adjustOpen} accounts={data.accounts} onClose={() => setAdjustOpen(false)} />
      <ReverseEntryModal entry={reversing} onClose={() => setReversing(null)} />
    </div>
  )
}

const AccountModal = ({ account, onClose }: { account: Partial<FinAccount> | null; onClose: () => void }) => {
  const toast = useToast()
  const { draft, setDraft, error, setError, saving, setSaving } = useDraft(account)
  if (!draft) return null
  const set = (patch: Partial<FinAccount>) => setDraft({ ...draft, ...patch })
  const toggleMethod = (m: string) =>
    set({ defaultMethods: draft.defaultMethods?.includes(m) ? draft.defaultMethods.filter((x) => x !== m) : [...(draft.defaultMethods ?? []), m] })

  const save = async () => {
    if (!draft.name?.trim()) return setError('Name is required.')
    setSaving(true)
    try {
      await saveAccount({
        id: draft.id,
        name: draft.name.trim(),
        accountType: draft.accountType ?? 'bank',
        institution: draft.institution?.trim() || null,
        accountLast4: draft.accountLast4?.trim() || null,
        openingBalance: Number(draft.openingBalance) || 0,
        openingDate: draft.openingDate || null,
        defaultMethods: draft.defaultMethods ?? [],
        active: draft.active ?? true,
      })
      toast.success('Account saved')
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="md" title={draft.id ? 'Edit account' : 'Add account'} footer={<SaveFooter onCancel={onClose} onSave={() => void save()} saving={saving} />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {error && (
          <div className="sm:col-span-2">
            <FinanceNotice title={error} tone="red" />
          </div>
        )}
        <Field label="Name" required className="sm:col-span-2">
          <Input value={draft.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Type">
          <Select value={draft.accountType ?? 'bank'} onChange={(e) => set({ accountType: e.target.value as AccountType })}>
            {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bank / provider">
          <Input value={draft.institution ?? ''} onChange={(e) => set({ institution: e.target.value })} />
        </Field>
        <Field label="Last 4 digits" hint="Never store the full account number">
          <Input maxLength={4} value={draft.accountLast4 ?? ''} onChange={(e) => set({ accountLast4: e.target.value.replace(/\D/g, '') })} />
        </Field>
        <Field label="Opening balance (BDT)">
          <Input type="number" step="0.01" value={draft.openingBalance ?? 0} onChange={(e) => set({ openingBalance: Number(e.target.value) })} />
        </Field>
        <Field label="Opening date" hint="Balance counts movements from this day">
          <Input type="date" value={draft.openingDate ?? ''} onChange={(e) => set({ openingDate: e.target.value || null })} />
        </Field>
        <Field label="Guest payment methods that land here" className="sm:col-span-2" hint="Used to place booking payments into accounts. A method should map to one account.">
          <div className="flex flex-wrap gap-3 pt-1">
            {FIN_PAYMENT_METHODS.map((m) => (
              <label key={m.value} className="inline-flex items-center gap-1.5 text-sm text-stone-700">
                <input type="checkbox" checked={draft.defaultMethods?.includes(m.value) ?? false} onChange={() => toggleMethod(m.value)} /> {m.label}
              </label>
            ))}
          </div>
        </Field>
        {draft.id && (
          <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={draft.active ?? true} onChange={(e) => set({ active: e.target.checked })} /> Active
          </label>
        )}
      </div>
    </Modal>
  )
}

export const TransferModal = ({ open, accounts, defaultFrom, onClose }: { open: boolean; accounts: FinAccount[]; defaultFrom?: string; onClose: () => void }) => {
  const toast = useToast()
  const active = accounts.filter((a) => a.active)
  const [form, setForm] = useState({ from: '', to: '', amount: '', date: businessToday(), reference: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) {
      const from = active.find((a) => a.id === defaultFrom)?.id ?? active[0]?.id ?? ''
      const to = active.find((a) => a.id !== from)?.id ?? ''
      setForm({ from, to, amount: '', date: businessToday(), reference: '', notes: '' })
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  if (!open) return null

  const save = async () => {
    const amount = parseAmount(form.amount)
    if (!form.from || !form.to || form.from === form.to) return setError('Choose two different accounts.')
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount.')
    setSaving(true)
    try {
      await transferBetweenAccounts({ fromAccountId: form.from, toAccountId: form.to, amount, date: form.date, reference: form.reference || undefined, notes: form.notes || undefined })
      void logStaffActivity({ category: 'finance', action: 'transfer', title: 'Account transfer', message: `${money(amount)} moved between accounts` })
      toast.success('Transfer recorded')
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="md" title="Transfer between accounts" description="E.g. cash deposited to the bank, or bKash cashed out. Not income or expense." footer={<SaveFooter onCancel={onClose} onSave={() => void save()} saving={saving} label="Record transfer" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {error && (
          <div className="sm:col-span-2">
            <FinanceNotice title={error} tone="red" />
          </div>
        )}
        <Field label="From" required>
          <Select value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
            {active.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="To" required>
          <Select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
            {active.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (BDT)" required>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Reference" className="sm:col-span-2">
          <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

const AdjustmentModal = ({ open, accounts, onClose }: { open: boolean; accounts: FinAccount[]; onClose: () => void }) => {
  const toast = useToast()
  const active = accounts.filter((a) => a.active)
  const [form, setForm] = useState({ account: '', direction: 'in' as 'in' | 'out', amount: '', date: businessToday(), reference: '', notes: '' })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (open) {
      setForm({ account: active[0]?.id ?? '', direction: 'in', amount: '', date: businessToday(), reference: '', notes: '' })
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  if (!open) return null

  const save = async () => {
    const amount = parseAmount(form.amount)
    if (!form.account) return setError('Choose the account.')
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount.')
    if (!form.notes.trim()) return setError('Explain the adjustment.')
    setSaving(true)
    try {
      await recordAdjustment({ accountId: form.account, direction: form.direction, amount, date: form.date, reference: form.reference || undefined, notes: form.notes.trim() })
      void logStaffActivity({ category: 'finance', action: 'adjustment', title: 'Balance adjustment', message: `${form.direction === 'in' ? '+' : '−'}${money(amount)}: ${form.notes.trim()}` })
      toast.success('Adjustment recorded')
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
      title="Balance adjustment"
      description="Corrects an account to match a bank statement or cash count. Reported separately; not treated as income or expense."
      footer={<SaveFooter onCancel={onClose} onSave={() => void save()} saving={saving} label="Record adjustment" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {error && (
          <div className="sm:col-span-2">
            <FinanceNotice title={error} tone="red" />
          </div>
        )}
        <Field label="Account" required>
          <Select value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })}>
            {active.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Direction" required>
          <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as 'in' | 'out' })}>
            <option value="in">Increase balance</option>
            <option value="out">Decrease balance</option>
          </Select>
        </Field>
        <Field label="Amount (BDT)" required>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <Field label="Date" required>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Reason" required className="sm:col-span-2">
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const CategoriesSection = ({ data }: { data: FinanceData }) => {
  const [editing, setEditing] = useState<Partial<FinCategory> | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const parents = data.categories.filter((c) => !c.parentId && (showInactive || c.active)).sort((a, b) => a.sortOrder - b.sortOrder)
  const childrenOf = (id: string) => data.categories.filter((c) => c.parentId === id && (showInactive || c.active)).sort((a, b) => a.sortOrder - b.sortOrder)
  const deptName = (id: string | null) => (id ? data.departments.find((d) => d.id === id)?.name : undefined)

  const columns: ExportColumn<FinCategory>[] = [
    { header: 'Code', value: (c) => c.code ?? '' },
    { header: 'Parent', value: (c) => (c.parentId ? data.categories.find((p) => p.id === c.parentId)?.name ?? '' : '') },
    { header: 'Name', value: (c) => c.name, width: 30 },
    { header: 'Classification', value: (c) => CLASSIFICATION_LABELS[c.classification] },
    { header: 'Department', value: (c) => deptName(c.departmentId) ?? '' },
    { header: 'Approval', value: (c) => (c.requiresApproval ? (c.approvalThreshold ? `Over ${c.approvalThreshold}` : 'Always') : '') },
    { header: 'Active', value: (c) => (c.active ? 'yes' : 'no') },
  ]

  const row = (c: FinCategory, child: boolean) => (
    <tr key={c.id} className={c.active ? undefined : 'opacity-60'}>
      <Td className={child ? 'pl-8' : 'font-medium text-forest-700'}>
        {!child && c.code ? `${c.code}. ` : ''}
        {c.name}
        {!c.active && (
          <Badge tone="neutral" className="ml-2">
            Inactive
          </Badge>
        )}
      </Td>
      <Td className="text-xs text-stone-600">{CLASSIFICATION_LABELS[c.classification]}</Td>
      <Td className="hidden md:table-cell text-xs text-stone-600">{deptName(c.departmentId) ?? '—'}</Td>
      <Td className="hidden md:table-cell text-xs text-stone-600">
        {c.requiresApproval ? (c.approvalThreshold ? `Over ${money(c.approvalThreshold)}` : 'Always') : ''}
        {c.requiresDescription ? ' · description required' : ''}
      </Td>
      <Td right>
        <button type="button" className="text-stone-400 hover:text-forest-700" aria-label="Edit category" onClick={() => setEditing(c)}>
          <Pencil className="w-4 h-4" />
        </button>
      </Td>
    </tr>
  )

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Expense categories"
        description="The classification decides how spending is reported: operating costs go to profit & loss, capital assets to the asset register, deposits to the balance sheet. Categories in use are deactivated, never deleted."
        actions={
          <>
            <label className="inline-flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive
            </label>
            <ExportButtons options={{ title: 'Expense categories', filenameBase: 'cherekh-expense-categories' }} sheets={[{ name: 'Categories', columns, rows: data.categories }]} />
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEditing({ classification: 'operating_expense', active: true, parentId: null })}>
              Category
            </Button>
          </>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Category</Th>
            <Th>Classification</Th>
            <Th className="hidden md:table-cell">Department</Th>
            <Th className="hidden md:table-cell">Rules</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {parents.map((p) => (
            <Fragment key={p.id}>
              {row(p, false)}
              {childrenOf(p.id).map((c) => row(c, true))}
            </Fragment>
          ))}
        </tbody>
      </TableShell>
      <CategoryModal category={editing} data={data} onClose={() => setEditing(null)} />
    </div>
  )
}

const CategoryModal = ({ category, data, onClose }: { category: Partial<FinCategory> | null; data: FinanceData; onClose: () => void }) => {
  const toast = useToast()
  const { draft, setDraft, error, setError, saving, setSaving } = useDraft(category)
  if (!draft) return null
  const set = (patch: Partial<FinCategory>) => setDraft({ ...draft, ...patch })
  const parents = data.categories.filter((c) => !c.parentId && c.id !== draft.id).sort((a, b) => a.sortOrder - b.sortOrder)
  const hasChildren = !!draft.id && data.categories.some((c) => c.parentId === draft.id)

  const save = async () => {
    if (!draft.name?.trim()) return setError('Name is required.')
    if (draft.requiresApproval && draft.approvalThreshold !== null && draft.approvalThreshold !== undefined && draft.approvalThreshold < 0)
      return setError('Threshold cannot be negative.')
    setSaving(true)
    try {
      const siblings = data.categories.filter((c) => (c.parentId ?? null) === (draft.parentId ?? null))
      await saveCategory({
        id: draft.id,
        name: draft.name.trim(),
        parentId: draft.parentId || null,
        code: draft.parentId ? null : draft.code?.trim() || null,
        classification: draft.classification ?? 'operating_expense',
        departmentId: draft.departmentId || null,
        requiresApproval: draft.requiresApproval ?? false,
        approvalThreshold: draft.requiresApproval ? draft.approvalThreshold ?? null : null,
        requiresDescription: draft.requiresDescription ?? false,
        active: draft.active ?? true,
        sortOrder: draft.sortOrder ?? Math.max(0, ...siblings.map((s) => s.sortOrder)) + 10,
      })
      toast.success('Category saved')
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} size="md" title={draft.id ? 'Edit category' : 'Add category'} footer={<SaveFooter onCancel={onClose} onSave={() => void save()} saving={saving} />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {error && (
          <div className="sm:col-span-2">
            <FinanceNotice title={error} tone="red" />
          </div>
        )}
        <Field label="Name" required className="sm:col-span-2">
          <Input value={draft.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Parent" hint={hasChildren ? 'Has subcategories, so it stays top-level' : undefined}>
          <Select value={draft.parentId ?? ''} disabled={hasChildren} onChange={(e) => set({ parentId: e.target.value || null })}>
            <option value="">Top-level category</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code ? `${p.code}. ` : ''}
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        {!draft.parentId && (
          <Field label="Code">
            <Input maxLength={4} value={draft.code ?? ''} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
          </Field>
        )}
        <Field label="Classification" required className="sm:col-span-2" hint={CLASSIFICATION_HELP[draft.classification ?? 'operating_expense']}>
          <Select value={draft.classification ?? 'operating_expense'} onChange={(e) => set({ classification: e.target.value as Classification })}>
            {(Object.keys(CLASSIFICATION_LABELS) as Classification[]).map((c) => (
              <option key={c} value={c}>
                {CLASSIFICATION_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Default department">
          <Select value={draft.departmentId ?? ''} onChange={(e) => set({ departmentId: e.target.value || null })}>
            <option value="">None</option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="space-y-2 pt-6">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={draft.requiresApproval ?? false} onChange={(e) => set({ requiresApproval: e.target.checked })} /> Needs admin approval
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={draft.requiresDescription ?? false} onChange={(e) => set({ requiresDescription: e.target.checked })} /> Description required
          </label>
        </div>
        {draft.requiresApproval && (
          <Field label="Approval threshold (BDT)" hint="Empty = every amount needs approval">
            <Input
              type="number"
              min="0"
              step="1"
              value={draft.approvalThreshold ?? ''}
              onChange={(e) => set({ approvalThreshold: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Field>
        )}
        {draft.id && (
          <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={draft.active ?? true} onChange={(e) => set({ active: e.target.checked })} /> Active (inactive categories stay on old records but can’t be picked for new ones)
          </label>
        )}
        {draft.id && <p className="sm:col-span-2 text-xs text-stone-500">Changing the classification affects new expenses only. Existing lines keep the classification they were recorded with.</p>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Departments & projects
// ---------------------------------------------------------------------------

const DepartmentsSection = ({ data }: { data: FinanceData }) => {
  const [editing, setEditing] = useState<Partial<FinDepartment> | null>(null)
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Departments"
        actions={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEditing({ active: true })}>
            Department
          </Button>
        }
      />
      <TableShell>
        <tbody className="divide-y divide-stone-100">
          {data.departments.length === 0 ? (
            <EmptyRow colSpan={2}>No departments.</EmptyRow>
          ) : (
            data.departments.map((d) => (
              <tr key={d.id} className={d.active ? undefined : 'opacity-60'}>
                <Td>
                  {d.name}
                  {!d.active && (
                    <Badge tone="neutral" className="ml-2">
                      Inactive
                    </Badge>
                  )}
                </Td>
                <Td right>
                  <button type="button" className="text-stone-400 hover:text-forest-700" aria-label="Edit department" onClick={() => setEditing(d)}>
                    <Pencil className="w-4 h-4" />
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
      <DepartmentModal department={editing} count={data.departments.length} onClose={() => setEditing(null)} />
    </div>
  )
}

const DepartmentModal = ({ department, count, onClose }: { department: Partial<FinDepartment> | null; count: number; onClose: () => void }) => {
  const toast = useToast()
  const { draft, setDraft, error, setError, saving, setSaving } = useDraft(department)
  if (!draft) return null
  const save = async () => {
    if (!draft.name?.trim()) return setError('Name is required.')
    setSaving(true)
    try {
      await saveDepartment({ id: draft.id, name: draft.name.trim(), active: draft.active ?? true, sortOrder: draft.sortOrder ?? (count + 1) * 10 })
      toast.success('Department saved')
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} size="sm" title={draft.id ? 'Edit department' : 'Add department'} footer={<SaveFooter onCancel={onClose} onSave={() => void save()} saving={saving} />}>
      <div className="space-y-3">
        {error && <FinanceNotice title={error} tone="red" />}
        <Field label="Name" required>
          <Input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        {draft.id && (
          <label className="inline-flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={draft.active ?? true} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Active
          </label>
        )}
      </div>
    </Modal>
  )
}

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const ProjectsSection = ({ data }: { data: FinanceData }) => {
  const [editing, setEditing] = useState<Partial<FinProject> | null>(null)
  const spentByProject = useMemo(() => {
    const map = new Map<string, number>()
    data.expenses.forEach((e) => {
      if (e.projectId && e.status === 'active' && e.approvalStatus !== 'rejected') map.set(e.projectId, (map.get(e.projectId) ?? 0) + e.total)
    })
    return map
  }, [data.expenses])

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Projects"
        description="Group spending for construction, renovation or expansion work. Budget is a reference figure only."
        actions={
          <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEditing({ status: 'active' })}>
            Project
          </Button>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Project</Th>
            <Th>Status</Th>
            <Th right>Budget</Th>
            <Th right>Expenses recorded</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {data.projects.length === 0 ? (
            <EmptyRow colSpan={5}>No projects yet.</EmptyRow>
          ) : (
            data.projects.map((p) => (
              <tr key={p.id}>
                <Td>
                  <p className="font-medium text-forest-700">{p.name}</p>
                  <p className="text-xs text-stone-500">
                    {[p.departmentId && data.departments.find((d) => d.id === p.departmentId)?.name, p.startDate && `from ${formatDay(p.startDate)}`, p.endDate && `to ${formatDay(p.endDate)}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </Td>
                <Td>
                  <Badge tone={p.status === 'active' ? 'forest' : 'neutral'}>{PROJECT_STATUS_LABELS[p.status]}</Badge>
                </Td>
                <Td right>{p.budget !== null ? money(p.budget) : '—'}</Td>
                <Td right>{money(spentByProject.get(p.id) ?? 0)}</Td>
                <Td right>
                  <button type="button" className="text-stone-400 hover:text-forest-700" aria-label="Edit project" onClick={() => setEditing(p)}>
                    <Pencil className="w-4 h-4" />
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
      <ProjectModal project={editing} data={data} onClose={() => setEditing(null)} />
    </div>
  )
}

const ProjectModal = ({ project, data, onClose }: { project: Partial<FinProject> | null; data: FinanceData; onClose: () => void }) => {
  const toast = useToast()
  const { draft, setDraft, error, setError, saving, setSaving } = useDraft(project)
  if (!draft) return null
  const set = (patch: Partial<FinProject>) => setDraft({ ...draft, ...patch })
  const save = async () => {
    if (!draft.name?.trim()) return setError('Name is required.')
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) return setError('End date is before the start date.')
    setSaving(true)
    try {
      await saveProject({
        id: draft.id,
        name: draft.name.trim(),
        departmentId: draft.departmentId || null,
        description: draft.description?.trim() || null,
        budget: draft.budget ?? null,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        status: draft.status ?? 'active',
      })
      toast.success('Project saved')
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} size="md" title={draft.id ? 'Edit project' : 'Add project'} footer={<SaveFooter onCancel={onClose} onSave={() => void save()} saving={saving} />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {error && (
          <div className="sm:col-span-2">
            <FinanceNotice title={error} tone="red" />
          </div>
        )}
        <Field label="Name" required className="sm:col-span-2">
          <Input value={draft.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Department">
          <Select value={draft.departmentId ?? ''} onChange={(e) => set({ departmentId: e.target.value || null })}>
            <option value="">None</option>
            {data.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={draft.status ?? 'active'} onChange={(e) => set({ status: e.target.value as ProjectStatus })}>
            {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Budget (BDT)">
          <Input type="number" min="0" step="1" value={draft.budget ?? ''} onChange={(e) => set({ budget: e.target.value === '' ? null : Number(e.target.value) })} />
        </Field>
        <div />
        <Field label="Start date">
          <Input type="date" value={draft.startDate ?? ''} onChange={(e) => set({ startDate: e.target.value || null })} />
        </Field>
        <Field label="End date">
          <Input type="date" value={draft.endDate ?? ''} onChange={(e) => set({ endDate: e.target.value || null })} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

const AuditSection = () => {
  const toast = useToast()
  const [rows, setRows] = useState<FinAuditRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    loadFinanceAudit(300)
      .then((r) => !cancelled && setRows(r))
      .catch((err) => toast.error('Could not load audit log', errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [toast])
  const paged = usePaged(rows, 30)

  const summary = (r: FinAuditRow): string => {
    if (r.action !== 'UPDATE' || !r.oldData || !r.newData) return ''
    const changed = Object.keys(r.newData).filter(
      (k) => k !== 'updated_at' && JSON.stringify((r.oldData as Record<string, unknown>)[k]) !== JSON.stringify((r.newData as Record<string, unknown>)[k])
    )
    return changed.length ? `Changed: ${changed.join(', ')}` : ''
  }
  const label = (r: FinAuditRow): string => {
    const d = (r.newData ?? r.oldData ?? {}) as Record<string, unknown>
    return String(d.code ?? d.name ?? d.title ?? d.kind ?? r.recordId ?? '')
  }

  return (
    <div className="space-y-4">
      <SectionTitle title="Finance audit log" description="Every insert, update and delete on finance tables, with who made it. Most recent 300 changes." />
      <TableShell>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>Change</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {loading ? (
            <EmptyRow colSpan={3}>Loading…</EmptyRow>
          ) : paged.slice.length === 0 ? (
            <EmptyRow colSpan={3}>No changes logged yet.</EmptyRow>
          ) : (
            paged.slice.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-xs text-stone-600">
                  {new Date(r.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}
                </Td>
                <Td className="text-xs text-stone-600">{r.actorEmail ?? 'system'}</Td>
                <Td>
                  <p className="text-sm text-stone-800">
                    <Badge tone={r.action === 'INSERT' ? 'forest' : r.action === 'DELETE' ? 'red' : 'sky'}>{r.action.toLowerCase()}</Badge>{' '}
                    <span className="text-stone-500">{r.tableName.replace('fin_', '').replace(/_/g, ' ')}</span> {label(r)}
                  </p>
                  {summary(r) && <p className="text-xs text-stone-500 mt-0.5">{summary(r)}</p>}
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
      <Pager {...paged} />
    </div>
  )
}
