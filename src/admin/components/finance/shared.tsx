import type { ReactNode } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, FileSpreadsheet, FileText } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Input'
import { cn } from '../../utils/cn'
import { APPROVAL_LABELS, FIN_PAYMENT_METHODS } from '../../../lib/finance/classification'
import type { ApprovalStatus, FinAccount, FinCategory } from '../../../lib/finance/types'
import type { PaymentStatus, ReimbursementStatus } from '../../../lib/finance/reporting'
import {
  exportReportCsv,
  exportReportExcel,
  type ExportSheet,
  type ReportExportOptions,
} from '../../../utils/reportExport'
import { PAYMENT_STATUS_LABEL, type MoneyFields } from './financeHelpers'

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** Grouped <option>s: top-level categories as optgroups, subcategories inside. */
export const CategoryOptions = ({ categories, includeInactiveId }: { categories: FinCategory[]; includeInactiveId?: string }) => {
  const parents = categories
    .filter((c) => !c.parentId && (c.active || c.id === includeInactiveId))
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <>
      {parents.map((p) => {
        const subs = categories
          .filter((c) => c.parentId === p.id && (c.active || c.id === includeInactiveId))
          .sort((a, b) => a.sortOrder - b.sortOrder)
        return (
          <optgroup key={p.id} label={`${p.code ? `${p.code}. ` : ''}${p.name}`}>
            <option value={p.id}>{p.name} (general)</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </optgroup>
        )
      })}
    </>
  )
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const PAYMENT_TONE: Record<PaymentStatus, Parameters<typeof Badge>[0]['tone']> = {
  paid: 'forest',
  partial: 'amber',
  unpaid: 'red',
  refunded: 'sky',
  void: 'neutral',
}


export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge tone={PAYMENT_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>
)

const APPROVAL_TONE: Record<ApprovalStatus, Parameters<typeof Badge>[0]['tone']> = {
  not_required: 'neutral',
  pending: 'amber',
  approved: 'forest',
  rejected: 'red',
}

export const ApprovalBadge = ({ status }: { status: ApprovalStatus }) =>
  status === 'not_required' ? null : <Badge tone={APPROVAL_TONE[status]}>{APPROVAL_LABELS[status]}</Badge>

const REIMB_LABEL: Record<ReimbursementStatus, string> = {
  not_applicable: '',
  owed: 'Reimbursement owed',
  partial: 'Partly reimbursed',
  reimbursed: 'Reimbursed',
}

export const ReimbursementBadge = ({ status }: { status: ReimbursementStatus }) =>
  status === 'not_applicable' ? null : (
    <Badge tone={status === 'reimbursed' ? 'forest' : status === 'partial' ? 'amber' : 'violet'}>{REIMB_LABEL[status]}</Badge>
  )

// ---------------------------------------------------------------------------
// Layout bits
// ---------------------------------------------------------------------------

export const FinanceNotice = ({ title, children, tone = 'amber' }: { title: string; children?: ReactNode; tone?: 'amber' | 'red' | 'sky' }) => (
  <div
    className={cn(
      'rounded-2xl border px-4 py-3 text-sm flex gap-3',
      tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-800',
      tone === 'red' && 'border-red-200 bg-red-50 text-red-800',
      tone === 'sky' && 'border-sky-200 bg-sky-50 text-sky-800'
    )}
  >
    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
    <div>
      <p className="font-medium">{title}</p>
      {children && <div className="mt-0.5 text-xs opacity-90">{children}</div>}
    </div>
  </div>
)

export const Stat = ({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'good' | 'bad' | 'muted'
}) => (
  <div className="rounded-2xl bg-white border border-stone-100 shadow-soft p-3.5 min-w-0">
    <p className="text-[11px] uppercase tracking-wide text-stone-500 font-medium">{label}</p>
    <p
      className={cn(
        'font-serif text-xl xl:text-2xl mt-1.5 truncate',
        tone === 'default' && 'text-forest-700',
        tone === 'good' && 'text-forest-600',
        tone === 'bad' && 'text-red-700',
        tone === 'muted' && 'text-stone-500'
      )}
    >
      {value}
    </p>
    {hint && <p className="text-xs text-stone-500 mt-1">{hint}</p>}
  </div>
)

export const SectionTitle = ({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) => (
  <div className="flex flex-wrap items-end justify-between gap-3">
    <div>
      <h2 className="font-serif text-lg text-forest-700">{title}</h2>
      {description && <p className="text-xs text-stone-500 mt-0.5">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
)

export const TableShell = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('bg-white border border-stone-100 rounded-2xl shadow-soft overflow-hidden', className)}>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  </div>
)

export const Th = ({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) => (
  <th
    className={cn(
      'px-3 py-2.5 text-[11px] uppercase tracking-wide text-stone-500 font-medium whitespace-nowrap bg-stone-50/70',
      right ? 'text-right' : 'text-left',
      className
    )}
  >
    {children}
  </th>
)

export const Td = ({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) => (
  <td className={cn('px-3 py-2.5 align-top', right && 'text-right tabular-nums whitespace-nowrap', className)}>{children}</td>
)

export const EmptyRow = ({ colSpan, children }: { colSpan: number; children: ReactNode }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-stone-500">
      {children}
    </td>
  </tr>
)

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const Pager = ({ page, pages, setPage, total, pageSize }: { page: number; pages: number; setPage: (p: number) => void; total: number; pageSize: number }) =>
  pages <= 1 ? null : (
    <div className="flex items-center justify-between gap-3 text-xs text-stone-500 px-1">
      <span>
        {page * pageSize + 1}–{Math.min(total, (page + 1) * pageSize)} of {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="px-2">
          {page + 1} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )

// ---------------------------------------------------------------------------
// Export buttons
// ---------------------------------------------------------------------------

export const ExportButtons = ({
  options,
  sheets,
  disabled,
}: {
  options: ReportExportOptions
  sheets: ExportSheet<any>[]
  disabled?: boolean
}) => (
  <div className="flex items-center gap-1.5">
    <Button
      variant="outline"
      size="sm"
      leftIcon={<FileText className="w-3.5 h-3.5" />}
      disabled={disabled || sheets.length === 0}
      onClick={() => exportReportCsv(options, sheets[0])}
    >
      CSV
    </Button>
    <Button
      variant="outline"
      size="sm"
      leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
      disabled={disabled || sheets.length === 0}
      onClick={() => void exportReportExcel(options, sheets)}
    >
      Excel
    </Button>
  </div>
)

// ---------------------------------------------------------------------------
// Money movement fields (account / method / reference / date)
// ---------------------------------------------------------------------------

export const MoneyFieldsForm = ({
  value,
  onChange,
  accounts,
  amountLabel = 'Amount',
  amountHint,
  showNotes = true,
  accountLabel = 'Account',
}: {
  value: MoneyFields
  onChange: (next: MoneyFields) => void
  accounts: FinAccount[]
  amountLabel?: string
  amountHint?: string
  showNotes?: boolean
  accountLabel?: string
}) => {
  const set = (patch: Partial<MoneyFields>) => onChange({ ...value, ...patch })
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label={amountLabel} required hint={amountHint}>
        <Input type="number" min="0" step="0.01" inputMode="decimal" value={value.amount} onChange={(e) => set({ amount: e.target.value })} />
      </Field>
      <Field label="Date" required>
        <Input type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} />
      </Field>
      <Field label={accountLabel} required>
        <Select
          value={value.accountId}
          onChange={(e) => {
            const acc = accounts.find((a) => a.id === e.target.value)
            set({ accountId: e.target.value, method: acc?.defaultMethods[0] ?? value.method })
          }}
        >
          <option value="">Choose account…</option>
          {accounts
            .filter((a) => a.active)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </Select>
      </Field>
      <Field label="Method">
        <Select value={value.method} onChange={(e) => set({ method: e.target.value })}>
          {FIN_PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Transaction reference" className="sm:col-span-2" hint="Bank / bKash / Nagad transaction ID, cheque no., receipt no.">
        <Input value={value.reference} onChange={(e) => set({ reference: e.target.value })} />
      </Field>
      {showNotes && (
        <Field label="Notes" className="sm:col-span-2">
          <Input value={value.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      )}
    </div>
  )
}
