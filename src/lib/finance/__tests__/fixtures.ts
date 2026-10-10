import type { RevenueBooking } from '../revenue'
import {
  EMPTY_FINANCE_DATA,
  type Classification,
  type FinAccount,
  type FinAsset,
  type FinCategory,
  type FinExpense,
  type FinExpenseLine,
  type FinLedgerEntry,
  type FinanceData,
  type LedgerKind,
} from '../types'

let seq = 0
const nextId = (prefix: string) => `${prefix}-${++seq}`

export const account = (id: string, methods: string[], openingBalance = 0, openingDate: string | null = null): FinAccount => ({
  id,
  name: id,
  accountType: 'cash',
  institution: null,
  accountLast4: null,
  openingBalance,
  openingDate,
  defaultMethods: methods,
  active: true,
  sortOrder: 0,
})

const CATEGORY_IDS: Record<Classification, string> = {
  operating_expense: 'cat-op',
  inventory: 'cat-inv',
  capital_asset: 'cat-cap',
  deposit_advance: 'cat-dep',
  financing_cost: 'cat-fin',
  other: 'cat-other',
}

export const categories: FinCategory[] = (Object.keys(CATEGORY_IDS) as Classification[]).map((c, i) => ({
  id: CATEGORY_IDS[c],
  parentId: null,
  code: String.fromCharCode(65 + i),
  name: c,
  classification: c,
  departmentId: null,
  requiresApproval: false,
  approvalThreshold: null,
  requiresDescription: false,
  active: true,
  sortOrder: i,
}))

interface ExpenseSpec {
  id?: string
  date?: string
  lines: { classification: Classification; amount: number }[]
  discount?: number
  tax?: number
  paidBy?: 'company' | 'employee'
  status?: 'active' | 'void'
  approval?: FinExpense['approvalStatus']
}

export const expense = (spec: ExpenseSpec): { expense: FinExpense; lines: FinExpenseLine[] } => {
  const id = spec.id ?? nextId('exp')
  const subtotal = spec.lines.reduce((s, l) => s + l.amount, 0)
  const total = subtotal - (spec.discount ?? 0) + (spec.tax ?? 0)
  return {
    expense: {
      id,
      code: `EXP-${id}`,
      title: id,
      txnDate: spec.date ?? '2026-03-10',
      invoiceDate: null,
      dueDate: null,
      supplierId: null,
      payeeName: 'Supplier',
      departmentId: null,
      projectId: null,
      phase: 'operating',
      description: null,
      currency: 'BDT',
      subtotal,
      discount: spec.discount ?? 0,
      tax: spec.tax ?? 0,
      additionalCharges: 0,
      total,
      paidByType: spec.paidBy ?? 'company',
      employeeStaffId: null,
      employeeName: spec.paidBy === 'employee' ? 'Staff' : null,
      purchasedBy: null,
      requestedBy: null,
      approvalStatus: spec.approval ?? 'not_required',
      approvedBy: null,
      approvedAt: null,
      approvalNote: null,
      tags: [],
      notes: null,
      status: spec.status ?? 'active',
      voidReason: spec.status === 'void' ? 'mistake' : null,
      voidedBy: null,
      voidedAt: null,
      createdBy: null,
      createdAt: '2026-03-10T04:00:00Z',
    },
    lines: spec.lines.map((l, i) => ({
      id: `${id}-l${i}`,
      expenseId: id,
      lineNo: i + 1,
      description: l.classification,
      categoryId: CATEGORY_IDS[l.classification],
      classification: l.classification,
      quantity: 1,
      unit: null,
      unitPrice: l.amount,
      lineTotal: l.amount,
    })),
  }
}

interface EntrySpec {
  kind: LedgerKind
  amount: number
  direction?: 'in' | 'out'
  date?: string
  accountId?: string
  expenseId?: string | null
  reversalOf?: string | null
  transferGroupId?: string | null
  counterparty?: string | null
  id?: string
}

const NATURAL_IN: LedgerKind[] = ['expense_refund', 'deposit_refund', 'owner_contribution', 'transfer_in']

export const entry = (spec: EntrySpec): FinLedgerEntry => ({
  id: spec.id ?? nextId('led'),
  entryDate: spec.date ?? '2026-03-12',
  accountId: spec.accountId ?? 'acc-cash',
  direction: spec.direction ?? (NATURAL_IN.includes(spec.kind) ? 'in' : 'out'),
  amount: spec.amount,
  kind: spec.kind,
  method: 'cash',
  reference: null,
  counterparty: spec.counterparty ?? null,
  expenseId: spec.expenseId ?? null,
  transferGroupId: spec.transferGroupId ?? null,
  reversalOf: spec.reversalOf ?? null,
  notes: null,
  createdBy: null,
  createdAt: `${spec.date ?? '2026-03-12'}T05:00:00Z`,
})

/** The opposite entry the database writes when reversing `original`. */
export const reversal = (original: FinLedgerEntry): FinLedgerEntry =>
  entry({
    kind: original.kind,
    amount: original.amount,
    direction: original.direction === 'in' ? 'out' : 'in',
    date: original.entryDate,
    accountId: original.accountId,
    expenseId: original.expenseId,
    transferGroupId: original.transferGroupId,
    reversalOf: original.id,
  })

export const asset = (cost: number, purchaseDate: string, usefulLifeMonths: number | null, salvageValue = 0): FinAsset => ({
  id: nextId('ast'),
  code: 'AST',
  name: 'asset',
  categoryId: 'cat-cap',
  expenseId: null,
  expenseLineId: null,
  departmentId: null,
  supplierId: null,
  purchaseDate,
  quantity: 1,
  cost,
  location: null,
  serialNumber: null,
  warrantyUntil: null,
  usefulLifeMonths,
  salvageValue,
  status: 'active',
  disposalDate: null,
  disposalNote: null,
  notes: null,
})

export const financeData = (parts: Partial<FinanceData> & { built?: { expense: FinExpense; lines: FinExpenseLine[] }[] }): FinanceData => {
  const built = parts.built ?? []
  return {
    ...EMPTY_FINANCE_DATA,
    accounts: [account('acc-cash', ['cash']), account('acc-bank', ['bank-transfer', 'card'])],
    categories,
    ...parts,
    expenses: [...(parts.expenses ?? []), ...built.map((b) => b.expense)],
    lines: [...(parts.lines ?? []), ...built.flatMap((b) => b.lines)],
  }
}

export const booking = (spec: Partial<RevenueBooking> & { nights: string[] }): RevenueBooking => ({
  id: spec.id ?? nextId('bk'),
  status: spec.status ?? 'confirmed',
  createdDay: spec.createdDay ?? spec.nights[0],
  checkIn: spec.checkIn ?? spec.nights[0],
  checkOut: spec.checkOut ?? spec.nights[spec.nights.length - 1],
  revenueDays: spec.nights,
  guestRooms: spec.guestRooms ?? 1,
  total: spec.total ?? 0,
  roomNet: spec.roomNet ?? spec.total ?? 0,
  food: spec.food ?? 0,
  other: spec.other ?? 0,
  cash: spec.cash ?? [],
})
