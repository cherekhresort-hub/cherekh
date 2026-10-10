import { getSupabase, isSupabaseConfigured } from '../supabase'
import {
  EMPTY_FINANCE_DATA,
  type AttachmentDocType,
  type AttachmentOwner,
  type FinAccount,
  type FinAsset,
  type FinAttachment,
  type FinAuditRow,
  type FinCategory,
  type FinDepartment,
  type FinProject,
  type FinSupplier,
  type FinanceData,
} from './types'

export const FINANCE_CHANGED_EVENT = 'finance-changed'
const DOCS_BUCKET = 'finance-docs'
const PAGE_SIZE = 1000

// Financial records are cached in memory only (never localStorage) so they
// don't persist on shared devices after sign-out.
let memoryCache: FinanceData | null = null
let inflight: Promise<FinanceLoadResult> | null = null

export interface FinanceLoadResult {
  data: FinanceData
  /** False when the finance tables are missing (migrations not applied) or Supabase is not configured. */
  available: boolean
  error?: string
}

export const notifyFinanceChanged = (): void => {
  memoryCache = null
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(FINANCE_CHANGED_EVENT))
}

export const clearFinanceCache = (): void => {
  memoryCache = null
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>

const camel = (key: string): string => key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())

const NUMERIC_KEYS = new Set([
  'subtotal', 'discount', 'tax', 'additional_charges', 'total', 'quantity', 'unit_price', 'line_total',
  'cost', 'salvage_value', 'amount', 'opening_balance', 'budget', 'approval_threshold',
  'size_bytes', 'sort_order', 'line_no', 'useful_life_months',
])

const mapRow = <T>(row: Row): T => {
  const out: Row = {}
  for (const [key, value] of Object.entries(row)) {
    out[camel(key)] = NUMERIC_KEYS.has(key) && value !== null && value !== undefined ? Number(value) : value
  }
  return out as T
}

const snake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

const toRow = (model: Row): Row => {
  const out: Row = {}
  for (const [key, value] of Object.entries(model)) {
    if (value === undefined) continue
    out[snake(key)] = typeof value === 'string' && value.trim() === '' ? null : value
  }
  return out
}

const isMissingTable = (message: string | undefined): boolean =>
  !!message && /(does not exist|schema cache|Could not find the table|relation .* does not exist)/i.test(message)

const fetchAll = async <T>(table: string, order: string, ascending = true): Promise<T[]> => {
  const supabase = getSupabase()
  if (!supabase) return []
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(order, { ascending })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const batch = (data ?? []) as Row[]
    rows.push(...batch.map((r) => mapRow<T>(r)))
    if (batch.length < PAGE_SIZE) break
  }
  return rows
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export const getCachedFinanceData = (): FinanceData | null => memoryCache

/**
 * Load every finance table the current user can read. RLS decides what comes
 * back: managers only see expense-related ledger rows, booking officers get nothing.
 */
export const loadFinanceData = async (force = false): Promise<FinanceLoadResult> => {
  if (!isSupabaseConfigured() || !getSupabase()) {
    return { data: EMPTY_FINANCE_DATA, available: false, error: 'Supabase is not configured.' }
  }
  if (memoryCache && !force) return { data: memoryCache, available: true }
  if (inflight) return inflight

  inflight = (async (): Promise<FinanceLoadResult> => {
    try {
      const [
        departments, categories, suppliers, accounts, projects,
        expenses, lines, assets, settlements, ledger,
      ] = await Promise.all([
        fetchAll<FinanceData['departments'][number]>('fin_departments', 'sort_order'),
        fetchAll<FinanceData['categories'][number]>('fin_categories', 'sort_order'),
        fetchAll<FinanceData['suppliers'][number]>('fin_suppliers', 'name'),
        fetchAll<FinanceData['accounts'][number]>('fin_accounts', 'sort_order'),
        fetchAll<FinanceData['projects'][number]>('fin_projects', 'name'),
        fetchAll<FinanceData['expenses'][number]>('fin_expenses', 'txn_date', false),
        fetchAll<FinanceData['lines'][number]>('fin_expense_lines', 'line_no'),
        fetchAll<FinanceData['assets'][number]>('fin_assets', 'purchase_date', false),
        fetchAll<FinanceData['settlements'][number]>('fin_deposit_settlements', 'settlement_date'),
        fetchAll<FinanceData['ledger'][number]>('fin_ledger_entries', 'entry_date'),
      ])
      const data: FinanceData = {
        departments, categories, suppliers, accounts, projects,
        expenses, lines, assets, settlements, ledger,
      }
      memoryCache = data
      return { data, available: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        data: EMPTY_FINANCE_DATA,
        available: false,
        error: isMissingTable(message)
          ? 'Finance tables are not set up yet. Apply migrations 042–050 (supabase db push).'
          : message,
      }
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export const loadFinanceAudit = async (limit = 200): Promise<FinAuditRow[]> => {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('fin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map((r) => mapRow<FinAuditRow>(r))
}

// ---------------------------------------------------------------------------
// RPC wrappers (atomic writes; role checks happen in the database)
// ---------------------------------------------------------------------------

const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  notifyFinanceChanged()
  return data as T
}

export interface ExpenseLineInput {
  description: string
  categoryId: string
  quantity: number
  unit?: string
  unitPrice: number
  /** Admin-only override; ignored for managers. */
  classification?: string
  createAsset?: boolean
  assetName?: string
  usefulLifeMonths?: number | null
}

export interface ExpensePaymentInput {
  amount: number
  accountId: string
  method?: string
  reference?: string
  date?: string
  notes?: string
}

export interface CreateExpenseInput {
  title: string
  txnDate: string
  invoiceDate?: string | null
  dueDate?: string | null
  supplierId?: string | null
  payeeName?: string
  departmentId?: string | null
  projectId?: string | null
  phase?: string
  description?: string
  discount?: number
  tax?: number
  additionalCharges?: number
  paidByType: 'company' | 'employee'
  employeeStaffId?: string | null
  employeeName?: string
  purchasedBy?: string
  requestedBy?: string
  tags?: string[]
  notes?: string
  lines: ExpenseLineInput[]
  payment?: ExpensePaymentInput | null
}

const lineToRpc = (line: ExpenseLineInput): Row => ({
  description: line.description,
  category_id: line.categoryId,
  quantity: line.quantity,
  unit: line.unit ?? null,
  unit_price: line.unitPrice,
  classification: line.classification ?? null,
  create_asset: line.createAsset ?? true,
  asset_name: line.assetName ?? null,
  useful_life_months: line.usefulLifeMonths ?? null,
})

const paymentToRpc = (payment: ExpensePaymentInput): Row => ({
  amount: payment.amount,
  account_id: payment.accountId,
  method: payment.method ?? null,
  reference: payment.reference ?? null,
  date: payment.date ?? null,
  notes: payment.notes ?? null,
})

export const createExpense = (input: CreateExpenseInput) =>
  rpc<{ id: string; code: string; approval_status: string; assets_created: number }>('fin_create_expense', {
    p: {
      ...toRow({
        title: input.title,
        txnDate: input.txnDate,
        invoiceDate: input.invoiceDate,
        dueDate: input.dueDate,
        supplierId: input.supplierId,
        payeeName: input.payeeName,
        departmentId: input.departmentId,
        projectId: input.projectId,
        phase: input.phase,
        description: input.description,
        discount: input.discount ?? 0,
        tax: input.tax ?? 0,
        additionalCharges: input.additionalCharges ?? 0,
        paidByType: input.paidByType,
        employeeStaffId: input.employeeStaffId,
        employeeName: input.employeeName,
        purchasedBy: input.purchasedBy,
        requestedBy: input.requestedBy,
        notes: input.notes,
      }),
      tags: input.tags ?? [],
      lines: input.lines.map(lineToRpc),
      payment: input.payment ? paymentToRpc(input.payment) : null,
    },
  })

export const updateExpenseDetails = (expenseId: string, fields: Record<string, unknown>) =>
  rpc<void>('fin_update_expense_details', { p_expense_id: expenseId, p: toRow(fields) })

export const recordExpensePayment = (
  expenseId: string,
  payment: ExpensePaymentInput,
  kind: 'expense_payment' | 'expense_refund' = 'expense_payment'
) => rpc<string>('fin_record_expense_payment', { p: { ...paymentToRpc(payment), expense_id: expenseId, kind } })

export const recordReimbursement = (expenseId: string, payment: ExpensePaymentInput) =>
  rpc<string>('fin_record_reimbursement', { p: { ...paymentToRpc(payment), expense_id: expenseId } })

export const setExpenseApproval = (expenseId: string, status: 'approved' | 'rejected', note?: string) =>
  rpc<void>('fin_set_expense_approval', { p_expense_id: expenseId, p_status: status, p_note: note ?? null })

export const voidExpense = (expenseId: string, reason: string) =>
  rpc<number>('fin_void_expense', { p_expense_id: expenseId, p_reason: reason })

export interface SettleDepositInput {
  expenseId: string
  kind: 'refund_received' | 'applied' | 'written_off'
  amount: number
  date?: string
  accountId?: string
  method?: string
  reference?: string
  appliedExpenseId?: string
  notes?: string
}

export const settleDeposit = (input: SettleDepositInput) => rpc<string>('fin_settle_deposit', { p: toRow({ ...input }) })

export interface CapitalEntryInput {
  kind: 'owner_contribution' | 'capital_withdrawal'
  amount: number
  /** Defaults to the Main fund account in the database. */
  accountId?: string
  date?: string
  method?: string
  reference?: string
  /** Who invested, or who received a withdrawal. */
  counterparty?: string
  notes?: string
}

/** Admin only. Withdrawals can't exceed the net amount invested (checked in the database). */
export const recordCapital = (input: CapitalEntryInput) => rpc<string>('fin_record_capital', { p: toRow({ ...input }) })

export const transferBetweenAccounts = (input: {
  fromAccountId: string
  toAccountId: string
  amount: number
  date?: string
  method?: string
  reference?: string
  notes?: string
}) => rpc<string>('fin_transfer', { p: toRow({ ...input }) })

export const recordAdjustment = (input: {
  accountId: string
  direction: 'in' | 'out'
  amount: number
  date?: string
  reference?: string
  notes: string
}) => rpc<string>('fin_record_adjustment', { p: toRow({ ...input }) })

export const reverseLedgerEntry = (entryId: string, reason: string) =>
  rpc<number>('fin_reverse_ledger_entry', { p_entry_id: entryId, p_reason: reason })

// ---------------------------------------------------------------------------
// Reference data (direct writes, RLS-protected)
// ---------------------------------------------------------------------------

const upsert = async (table: string, row: Row, onConflict = 'id'): Promise<void> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from(table).upsert(row, { onConflict })
  if (error) throw new Error(error.message)
  notifyFinanceChanged()
}

const insertRow = async <T>(table: string, row: Row): Promise<T> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from(table).insert(row).select('*').single()
  if (error) throw new Error(error.message)
  notifyFinanceChanged()
  return mapRow<T>(data as Row)
}

const updateRow = async (table: string, id: string, fields: Row): Promise<void> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from(table).update(fields).eq('id', id)
  if (error) throw new Error(error.message)
  notifyFinanceChanged()
}

const slugId = (prefix: string, name: string): string =>
  `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`

export const saveCategory = (category: Partial<FinCategory> & { name: string }) =>
  upsert('fin_categories', toRow({ ...category, id: category.id ?? slugId('cat', category.name) }))

export const saveDepartment = (department: Partial<FinDepartment> & { name: string }) =>
  upsert('fin_departments', toRow({ ...department, id: department.id ?? slugId('dept', department.name) }))

export const saveAccount = (account: Partial<FinAccount> & { name: string }) =>
  upsert('fin_accounts', toRow({ ...account, id: account.id ?? slugId('acc', account.name) }))

export const saveProject = async (project: Partial<FinProject> & { name: string }): Promise<void> => {
  if (project.id) return updateRow('fin_projects', project.id, toRow({ ...project, id: undefined }))
  await insertRow<FinProject>('fin_projects', toRow(project))
}

export const saveSupplier = async (supplier: Partial<FinSupplier> & { name: string }): Promise<FinSupplier> => {
  if (supplier.id) {
    await updateRow('fin_suppliers', supplier.id, toRow({ ...supplier, id: undefined }))
    return supplier as FinSupplier
  }
  return insertRow<FinSupplier>('fin_suppliers', toRow(supplier))
}

export const updateAsset = (id: string, fields: Partial<FinAsset>) =>
  updateRow('fin_assets', id, toRow({ ...fields, id: undefined }))

// ---------------------------------------------------------------------------
// Attachments (private bucket, signed URLs)
// ---------------------------------------------------------------------------

export const listAttachments = async (ownerType: AttachmentOwner, ownerId: string): Promise<FinAttachment[]> => {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('fin_attachments')
    .select('*')
    .eq('owner_type', ownerType)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map((r) => mapRow<FinAttachment>(r))
}

export const listAllAttachments = async (ownerTypes: AttachmentOwner[]): Promise<FinAttachment[]> => {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('fin_attachments')
    .select('*')
    .in('owner_type', ownerTypes)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map((r) => mapRow<FinAttachment>(r))
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const uploadAttachment = async (
  ownerType: AttachmentOwner,
  ownerId: string,
  file: File,
  docType: AttachmentDocType,
  uploadedBy?: string
): Promise<FinAttachment> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Files must be 10 MB or smaller.')
  const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-120)
  const path = `${ownerType}/${ownerId}/${Date.now()}-${safeName}`
  const { error: uploadError } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (uploadError) throw new Error(uploadError.message)
  const { data, error } = await supabase
    .from('fin_attachments')
    .insert({
      owner_type: ownerType,
      owner_id: ownerId,
      doc_type: docType,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: uploadedBy ?? null,
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return mapRow<FinAttachment>(data as Row)
}

export const getAttachmentUrl = async (storagePath: string): Promise<string> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(storagePath, 120)
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Could not open the file.')
  return data.signedUrl
}
