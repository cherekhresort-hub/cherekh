export type Classification =
  | 'operating_expense'
  | 'inventory'
  | 'capital_asset'
  | 'deposit_advance'
  | 'financing_cost'
  | 'other'

export type AccountType = 'cash' | 'bank' | 'mobile_wallet' | 'other'

export interface FinDepartment {
  id: string
  name: string
  active: boolean
  sortOrder: number
}

export interface FinCategory {
  id: string
  parentId: string | null
  code: string | null
  name: string
  classification: Classification
  departmentId: string | null
  requiresApproval: boolean
  approvalThreshold: number | null
  requiresDescription: boolean
  active: boolean
  sortOrder: number
}

export interface FinSupplier {
  id: string
  name: string
  contactPerson: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  active: boolean
}

export interface FinAccount {
  id: string
  name: string
  accountType: AccountType
  institution: string | null
  accountLast4: string | null
  openingBalance: number
  openingDate: string | null
  defaultMethods: string[]
  active: boolean
  sortOrder: number
}

/** The "mother account": investment money lands here before moving to cash, wallets or bank. */
export const MAIN_FUND_ACCOUNT_ID = 'acc-main'

export type ProjectStatus = 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export interface FinProject {
  id: string
  name: string
  departmentId: string | null
  description: string | null
  budget: number | null
  startDate: string | null
  endDate: string | null
  status: ProjectStatus
}

export type ExpensePhase = 'pre_opening' | 'operating' | 'expansion'
export type PaidByType = 'company' | 'employee'
export type ApprovalStatus = 'not_required' | 'pending' | 'approved' | 'rejected'

export interface FinExpense {
  id: string
  code: string
  title: string
  txnDate: string
  invoiceDate: string | null
  dueDate: string | null
  supplierId: string | null
  payeeName: string | null
  departmentId: string | null
  projectId: string | null
  phase: ExpensePhase
  description: string | null
  currency: string
  subtotal: number
  discount: number
  tax: number
  additionalCharges: number
  total: number
  paidByType: PaidByType
  employeeStaffId: string | null
  employeeName: string | null
  purchasedBy: string | null
  requestedBy: string | null
  approvalStatus: ApprovalStatus
  approvedBy: string | null
  approvedAt: string | null
  approvalNote: string | null
  tags: string[]
  notes: string | null
  status: 'active' | 'void'
  voidReason: string | null
  voidedBy: string | null
  voidedAt: string | null
  createdBy: string | null
  createdAt: string
}

export interface FinExpenseLine {
  id: string
  expenseId: string
  lineNo: number
  description: string
  categoryId: string
  classification: Classification
  quantity: number
  unit: string | null
  unitPrice: number
  lineTotal: number
}

export type AssetStatus = 'active' | 'disposed' | 'written_off' | 'void'

export interface FinAsset {
  id: string
  code: string
  name: string
  categoryId: string | null
  expenseId: string | null
  expenseLineId: string | null
  departmentId: string | null
  supplierId: string | null
  purchaseDate: string
  quantity: number
  cost: number
  location: string | null
  serialNumber: string | null
  warrantyUntil: string | null
  usefulLifeMonths: number | null
  salvageValue: number
  status: AssetStatus
  disposalDate: string | null
  disposalNote: string | null
  notes: string | null
}

export type SettlementKind = 'refund_received' | 'applied' | 'written_off'

export interface FinDepositSettlement {
  id: string
  expenseId: string
  settlementDate: string
  amount: number
  kind: SettlementKind
  ledgerEntryId: string | null
  appliedExpenseId: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export type LedgerKind =
  | 'expense_payment'
  | 'expense_refund'
  | 'reimbursement'
  | 'deposit_refund'
  /** Investment added */
  | 'owner_contribution'
  /** Investment withdrawn */
  | 'capital_withdrawal'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'

export interface FinLedgerEntry {
  id: string
  entryDate: string
  accountId: string
  direction: 'in' | 'out'
  amount: number
  kind: LedgerKind
  method: string | null
  reference: string | null
  counterparty: string | null
  expenseId: string | null
  transferGroupId: string | null
  reversalOf: string | null
  notes: string | null
  createdBy: string | null
  createdAt: string
}

export type AttachmentOwner = 'expense' | 'asset'
export type AttachmentDocType =
  | 'invoice'
  | 'receipt'
  | 'purchase_order'
  | 'warranty'
  | 'contract'
  | 'agreement'
  | 'payment_confirmation'
  | 'repayment_schedule'
  | 'approval'
  | 'other'

export interface FinAttachment {
  id: string
  ownerType: AttachmentOwner
  ownerId: string
  docType: AttachmentDocType
  storagePath: string
  fileName: string
  mimeType: string | null
  sizeBytes: number | null
  uploadedBy: string | null
  createdAt: string
}

export interface FinAuditRow {
  id: number
  tableName: string
  recordId: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  actorEmail: string | null
  oldData: Record<string, unknown> | null
  newData: Record<string, unknown> | null
  createdAt: string
}

/** Everything the finance pages and reports read, loaded in one pass. */
export interface FinanceData {
  departments: FinDepartment[]
  categories: FinCategory[]
  suppliers: FinSupplier[]
  accounts: FinAccount[]
  projects: FinProject[]
  expenses: FinExpense[]
  lines: FinExpenseLine[]
  assets: FinAsset[]
  settlements: FinDepositSettlement[]
  ledger: FinLedgerEntry[]
}

export const EMPTY_FINANCE_DATA: FinanceData = {
  departments: [],
  categories: [],
  suppliers: [],
  accounts: [],
  projects: [],
  expenses: [],
  lines: [],
  assets: [],
  settlements: [],
  ledger: [],
}
