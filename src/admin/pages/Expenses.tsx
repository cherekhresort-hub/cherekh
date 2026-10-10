import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Receipt, ListPlus } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Tabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../../contexts/AuthProvider'
import { useFinanceData } from '../hooks/useFinanceData'
import { useStaffData } from '../hooks/useStaffData'
import {
  ApprovalBadge,
  EmptyRow,
  ExportButtons,
  FinanceNotice,
  Pager,
  PaymentStatusBadge,
  ReimbursementBadge,
  Stat,
  TableShell,
  Td,
  Th,
} from '../components/finance/shared'
import { PAYMENT_STATUS_LABEL, formatDay, money, useFinanceLookups, usePaged } from '../components/finance/financeHelpers'
import { ExpenseFormModal } from '../components/finance/ExpenseFormModal'
import { ExpenseDrawer } from '../components/finance/ExpenseDrawer'
import { SuppliersPanel } from '../components/finance/SuppliersPanel'
import { DepositsPanel } from '../components/finance/DepositsPanel'
import { ReimbursementsPanel } from '../components/finance/ReimbursementsPanel'
import { AssetsPanel } from '../components/finance/AssetsPanel'
import { FinanceSettingsPanel } from '../components/finance/FinanceSettingsPanel'
import { APPROVAL_LABELS, finMethodLabel } from '../../lib/finance/classification'
import { buildExpenseFigures, depositPositions, type ExpenseFigures, type PaymentStatus } from '../../lib/finance/reporting'
import type { ApprovalStatus } from '../../lib/finance/types'
import type { ExportColumn } from '../../utils/reportExport'

type Tab = 'register' | 'suppliers' | 'deposits' | 'reimbursements' | 'assets' | 'settings'
type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'outstanding_desc'

const Expenses = () => {
  const { isAdmin } = useAuth()
  const { data, available, error, loading } = useFinanceData()
  const { staff } = useStaffData()
  const lookups = useFinanceLookups(data)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'register'
  const setTab = (t: Tab) =>
    setSearchParams(
      (p) => {
        p.set('tab', t)
        return p
      },
      { replace: true }
    )

  const [formMode, setFormMode] = useState<'quick' | 'detailed' | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const index = useMemo(() => buildExpenseFigures(data), [data])
  const deposits = useMemo(() => depositPositions(data, index), [data, index])
  const staffNames = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff])

  // Deep link: /admin/expenses?id=<expense id>
  const deepLinked = useRef<string | null>(null)
  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || deepLinked.current === id || !index.has(id)) return
    deepLinked.current = id
    setSelectedId(id)
    setSearchParams(
      (p) => {
        p.delete('id')
        return p
      },
      { replace: true }
    )
  }, [index, searchParams, setSearchParams])

  const pendingCount = useMemo(() => [...index.values()].filter((f) => f.expense.status === 'active' && f.expense.approvalStatus === 'pending').length, [index])
  const owedCount = useMemo(() => [...index.values()].filter((f) => f.recognized && f.reimbursementOutstanding > 0.005).length, [index])
  const openDeposits = deposits.filter((d) => d.outstanding > 0.005).length

  const tabs = [
    { value: 'register' as Tab, label: 'Register', count: pendingCount > 0 ? pendingCount : undefined },
    { value: 'suppliers' as Tab, label: 'Suppliers' },
    { value: 'deposits' as Tab, label: 'Deposits & advances', count: openDeposits || undefined },
    { value: 'reimbursements' as Tab, label: 'Reimbursements', count: owedCount || undefined },
    { value: 'assets' as Tab, label: 'Assets' },
    ...(isAdmin ? [{ value: 'settings' as Tab, label: 'Settings' }] : []),
  ]

  return (
    <>
      <TopBar
        title="Expenses & Purchases"
        description="Record spending once, then track payments, reimbursements, deposits and assets against it"
        actions={
          available && (
            <div className="flex gap-2">
              <Button variant="outline" leftIcon={<ListPlus className="w-4 h-4" />} onClick={() => setFormMode('detailed')} className="hidden sm:inline-flex">
                Detailed purchase
              </Button>
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setFormMode('quick')}>
                Add expense
              </Button>
            </div>
          )
        }
      />
      <main className="px-4 lg:px-8 py-6 space-y-4">
        {!available && !loading ? (
          <FinanceNotice title="Finance data is unavailable" tone="amber">
            {error}
          </FinanceNotice>
        ) : (
          <>
            <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <Tabs<Tab> value={tab} onChange={setTab} items={tabs} className="w-max" layoutId="expenses-tab" />
            </div>
            {loading && data.expenses.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white/80 px-6 py-12 text-center text-sm text-stone-500">Loading finance records…</div>
            ) : tab === 'register' ? (
              <ExpenseRegister index={index} lookups={lookups} data={data} onOpen={setSelectedId} onAdd={() => setFormMode('quick')} />
            ) : tab === 'suppliers' ? (
              <SuppliersPanel data={data} index={index} onOpenExpense={setSelectedId} />
            ) : tab === 'deposits' ? (
              <DepositsPanel data={data} index={index} deposits={deposits} lookups={lookups} onOpenExpense={setSelectedId} />
            ) : tab === 'reimbursements' ? (
              <ReimbursementsPanel index={index} staffNames={staffNames} onOpenExpense={setSelectedId} />
            ) : tab === 'assets' ? (
              <AssetsPanel data={data} lookups={lookups} onOpenExpense={setSelectedId} />
            ) : isAdmin ? (
              <FinanceSettingsPanel data={data} />
            ) : null}
          </>
        )}
      </main>

      <ExpenseFormModal
        open={formMode !== null}
        initialMode={formMode ?? 'quick'}
        data={data}
        onClose={() => setFormMode(null)}
        onCreated={(id) => setSelectedId(id)}
      />
      <ExpenseDrawer
        figures={selectedId ? index.get(selectedId) ?? null : null}
        data={data}
        lookups={lookups}
        deposits={deposits}
        onClose={() => setSelectedId(null)}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

interface RegisterProps {
  index: Map<string, ExpenseFigures>
  lookups: ReturnType<typeof useFinanceLookups>
  data: ReturnType<typeof useFinanceData>['data']
  onOpen: (id: string) => void
  onAdd: () => void
}

const ExpenseRegister = ({ index, lookups, data, onOpen, onAdd }: RegisterProps) => {
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [category, setCategory] = useState('all')
  const [department, setDepartment] = useState('all')
  const [supplier, setSupplier] = useState('all')
  const [payStatus, setPayStatus] = useState<'all' | PaymentStatus | 'owed'>('all')
  const [approval, setApproval] = useState<'all' | ApprovalStatus>('all')
  const [showVoid, setShowVoid] = useState(false)
  const [sort, setSort] = useState<SortKey>('date_desc')

  const methodsByExpense = useMemo(() => {
    const map = new Map<string, Set<string>>()
    data.ledger.forEach((l) => {
      if (!l.expenseId || l.reversalOf || !l.method) return
      const set = map.get(l.expenseId) ?? new Set<string>()
      set.add(l.method)
      map.set(l.expenseId, set)
    })
    return map
  }, [data.ledger])

  const supplierLabel = (f: ExpenseFigures) => (f.expense.supplierId && lookups.supplier.get(f.expense.supplierId)) || f.expense.payeeName || '—'
  const categorySummary = (f: ExpenseFigures) => {
    const tops = [...new Set(f.lines.map((l) => lookups.categories.get(l.categoryId)?.parentId ?? l.categoryId))]
    return tops.length === 1 ? lookups.categoryLabel(f.lines[0]?.categoryId) : `${tops.length} categories`
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = [...index.values()].filter((f) => {
      const e = f.expense
      if (!showVoid && e.status === 'void') return false
      if (from && e.txnDate < from) return false
      if (to && e.txnDate > to) return false
      if (department !== 'all' && e.departmentId !== department) return false
      if (supplier !== 'all' && e.supplierId !== supplier) return false
      if (approval !== 'all' && e.approvalStatus !== approval) return false
      if (payStatus === 'owed' ? f.reimbursementOutstanding <= 0.005 : payStatus !== 'all' && f.paymentStatus !== payStatus) return false
      if (category !== 'all' && !f.lines.some((l) => l.categoryId === category || lookups.categories.get(l.categoryId)?.parentId === category)) return false
      if (q) {
        const hay = [e.code, e.title, e.description, e.payeeName, e.employeeName, e.notes, e.tags.join(' '), supplierLabel(f), ...f.lines.map((l) => l.description)]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const sorters: Record<SortKey, (a: ExpenseFigures, b: ExpenseFigures) => number> = {
      date_desc: (a, b) => b.expense.txnDate.localeCompare(a.expense.txnDate) || b.expense.code.localeCompare(a.expense.code),
      date_asc: (a, b) => a.expense.txnDate.localeCompare(b.expense.txnDate) || a.expense.code.localeCompare(b.expense.code),
      amount_desc: (a, b) => b.expense.total - a.expense.total,
      outstanding_desc: (a, b) => b.outstanding + b.reimbursementOutstanding - (a.outstanding + a.reimbursementOutstanding),
    }
    return list.sort(sorters[sort])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, search, from, to, category, department, supplier, payStatus, approval, showVoid, sort, lookups])

  const paged = usePaged(rows, 25)
  const totals = rows.reduce(
    (acc, f) => {
      if (!f.recognized) return acc
      acc.total += f.expense.total
      acc.paid += f.expense.paidByType === 'company' ? f.netPaid : f.reimbursed
      acc.outstanding += f.outstanding
      acc.owed += f.reimbursementOutstanding
      return acc
    },
    { total: 0, paid: 0, outstanding: 0, owed: 0 }
  )

  const columns: ExportColumn<ExpenseFigures>[] = [
    { header: 'Expense ID', value: (f) => f.expense.code },
    { header: 'Date', value: (f) => f.expense.txnDate },
    { header: 'Title', value: (f) => f.expense.title, width: 30 },
    { header: 'Category', value: categorySummary, width: 34 },
    { header: 'Department', value: (f) => (f.expense.departmentId && lookups.department.get(f.expense.departmentId)) || '' },
    { header: 'Supplier / recipient', value: supplierLabel, width: 24 },
    { header: 'Amount (BDT)', value: (f) => f.expense.total, total: true },
    { header: 'Paid (BDT)', value: (f) => (f.expense.paidByType === 'company' ? f.netPaid : f.reimbursed), total: true },
    { header: 'Outstanding (BDT)', value: (f) => f.outstanding + f.reimbursementOutstanding, total: true },
    { header: 'Payment method', value: (f) => [...(methodsByExpense.get(f.expense.id) ?? [])].map(finMethodLabel).join(', ') },
    { header: 'Payment status', value: (f) => PAYMENT_STATUS_LABEL[f.paymentStatus] },
    { header: 'Paid by', value: (f) => (f.expense.paidByType === 'employee' ? `Employee: ${f.expense.employeeName ?? ''}` : 'Company') },
    { header: 'Approval', value: (f) => APPROVAL_LABELS[f.expense.approvalStatus] },
    { header: 'Status', value: (f) => f.expense.status },
  ]

  const filterLabels = {
    Search: search || undefined,
    From: from || undefined,
    To: to || undefined,
    Category: category !== 'all' ? lookups.categoryLabel(category) : undefined,
    Department: department !== 'all' ? lookups.department.get(department) : undefined,
    Supplier: supplier !== 'all' ? lookups.supplier.get(supplier) : undefined,
    'Payment status': payStatus !== 'all' ? payStatus : undefined,
    Approval: approval !== 'all' ? approval : undefined,
    'Including void': showVoid ? 'yes' : undefined,
  }

  if (index.size === 0) {
    return (
      <EmptyState
        icon={<Receipt className="w-6 h-6" />}
        title="No expenses yet"
        description="Record the first purchase or bill. Partial payments, reimbursements and refunds are added to it later."
        action={
          <Button leftIcon={<Plus className="w-4 h-4" />} onClick={onAdd}>
            Add expense
          </Button>
        }
      />
    )
  }

  const parents = data.categories.filter((c) => !c.parentId).sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Expenses (filtered)" value={money(totals.total)} hint={`${rows.length} record${rows.length === 1 ? '' : 's'}`} />
        <Stat label="Paid" value={money(totals.paid)} />
        <Stat label="Owed to suppliers" value={money(totals.outstanding)} tone={totals.outstanding > 0 ? 'bad' : 'muted'} />
        <Stat label="Owed to employees" value={money(totals.owed)} tone={totals.owed > 0 ? 'bad' : 'muted'} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        <Input className="col-span-2" placeholder="Search ID, title, supplier, item…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code}. {p.name}
            </option>
          ))}
        </Select>
        <Select value={department} onChange={(e) => setDepartment(e.target.value)} aria-label="Department">
          <option value="all">All departments</option>
          {data.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <Select value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="Supplier">
          <option value="all">All suppliers</option>
          {data.suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select value={payStatus} onChange={(e) => setPayStatus(e.target.value as typeof payStatus)} aria-label="Payment status">
          <option value="all">Any payment status</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
          <option value="owed">Reimbursement owed</option>
        </Select>
        <Select value={approval} onChange={(e) => setApproval(e.target.value as typeof approval)} aria-label="Approval">
          <option value="all">Any approval</option>
          <option value="pending">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="not_required">Not required</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort">
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="amount_desc">Largest amount</option>
          <option value="outstanding_desc">Most outstanding</option>
        </Select>
        <label className="col-span-2 inline-flex items-center gap-2 text-sm text-stone-600">
          <input type="checkbox" checked={showVoid} onChange={(e) => setShowVoid(e.target.checked)} /> Show void expenses
        </label>
        <div className="col-span-2 md:col-span-4 xl:col-span-2 flex justify-end">
          <ExportButtons
            options={{
              title: 'Expense register',
              filenameBase: `cherekh-expenses-${from || 'all'}-${to || 'now'}`,
              period: from || to ? `${from || '…'} to ${to || '…'}` : 'All time',
              filters: filterLabels,
            }}
            sheets={[{ name: 'Expenses', columns, rows }]}
            disabled={rows.length === 0}
          />
        </div>
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>ID</Th>
            <Th>Date</Th>
            <Th>Title</Th>
            <Th className="hidden lg:table-cell">Category</Th>
            <Th className="hidden md:table-cell">Supplier</Th>
            <Th right>Amount</Th>
            <Th right>Paid</Th>
            <Th right>Outstanding</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {paged.slice.length === 0 ? (
            <EmptyRow colSpan={9}>No expenses match these filters.</EmptyRow>
          ) : (
            paged.slice.map((f) => (
              <tr
                key={f.expense.id}
                className={`hover:bg-cream/50 cursor-pointer ${f.expense.status === 'void' ? 'opacity-60' : ''}`}
                onClick={() => onOpen(f.expense.id)}
              >
                <Td className="font-mono text-xs text-stone-500 whitespace-nowrap">{f.expense.code}</Td>
                <Td className="whitespace-nowrap">{formatDay(f.expense.txnDate)}</Td>
                <Td>
                  <p className="font-medium text-forest-700">{f.expense.title}</p>
                  <p className="text-xs text-stone-500">
                    {(f.expense.departmentId && lookups.department.get(f.expense.departmentId)) || ''}
                    {f.expense.paidByType === 'employee' ? ` · paid by ${f.expense.employeeName ?? 'employee'}` : ''}
                  </p>
                </Td>
                <Td className="hidden lg:table-cell text-xs text-stone-600 max-w-[220px]">{categorySummary(f)}</Td>
                <Td className="hidden md:table-cell text-stone-600">{supplierLabel(f)}</Td>
                <Td right>{money(f.expense.total)}</Td>
                <Td right>{money(f.expense.paidByType === 'company' ? f.netPaid : f.reimbursed)}</Td>
                <Td right className={f.outstanding + f.reimbursementOutstanding > 0.005 ? 'text-red-700' : 'text-stone-400'}>
                  {money(f.outstanding + f.reimbursementOutstanding)}
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <PaymentStatusBadge status={f.paymentStatus} />
                    <ReimbursementBadge status={f.reimbursementStatus} />
                    <ApprovalBadge status={f.expense.approvalStatus} />
                  </div>
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

export default Expenses
