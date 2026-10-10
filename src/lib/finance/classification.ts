import type { AccountType, ApprovalStatus, AttachmentDocType, Classification, ExpensePhase, LedgerKind } from './types'

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  operating_expense: 'Operating expense',
  inventory: 'Inventory purchase',
  capital_asset: 'Capital asset',
  deposit_advance: 'Deposit / advance',
  financing_cost: 'Financing cost',
  other: 'Other (unclassified)',
}

export const CLASSIFICATION_HELP: Record<Classification, string> = {
  operating_expense: 'Expensed in the period it is incurred.',
  inventory: 'Periodic method: expensed when purchased (no stock tracking yet).',
  capital_asset: 'Added to the asset register. Only depreciation (if configured) reaches the P&L.',
  deposit_advance: 'Recoverable balance, not an expense, until refunded, applied or written off.',
  financing_cost: 'Interest, bank and payment charges. Shown below the operating result.',
  other: 'Counted as an operating expense and flagged for classification.',
}

/** Classifications that reach the P&L as expenses in the period incurred. */
export const PNL_OPERATING_CLASSES: Classification[] = ['operating_expense', 'inventory', 'other']
export const PNL_FINANCING_CLASSES: Classification[] = ['financing_cost']

export const CAPITAL_KINDS: LedgerKind[] = ['owner_contribution', 'capital_withdrawal']

export const LEDGER_KIND_LABELS: Record<LedgerKind, string> = {
  expense_payment: 'Expense payment',
  expense_refund: 'Supplier refund',
  reimbursement: 'Employee reimbursement',
  deposit_refund: 'Deposit refund received',
  owner_contribution: 'Investment added',
  capital_withdrawal: 'Investment withdrawn',
  transfer_out: 'Transfer out',
  transfer_in: 'Transfer in',
  adjustment: 'Adjustment',
}

const NATURAL_IN_KINDS: LedgerKind[] = ['expense_refund', 'deposit_refund', 'owner_contribution', 'transfer_in']

/** +1 when an entry moves in its kind's natural direction, -1 for a reversal (mirrors private.fin_kind_sign). */
export const kindSign = (kind: LedgerKind, direction: 'in' | 'out'): 1 | -1 => {
  const naturalIn = NATURAL_IN_KINDS.includes(kind)
  if (kind === 'adjustment') return 1
  return (naturalIn ? direction === 'in' : direction === 'out') ? 1 : -1
}

/** Signed effect on cash: +amount for money in, -amount for money out. */
export const cashEffect = (entry: { direction: 'in' | 'out'; amount: number }): number =>
  entry.direction === 'in' ? entry.amount : -entry.amount

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  not_required: 'Not required',
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
}

export const PHASE_LABELS: Record<ExpensePhase, string> = {
  pre_opening: 'Pre-opening',
  operating: 'Operating',
  expansion: 'Expansion',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  bank: 'Bank',
  mobile_wallet: 'Mobile wallet',
  other: 'Other',
}

export const DOC_TYPE_LABELS: Record<AttachmentDocType, string> = {
  invoice: 'Invoice',
  receipt: 'Receipt',
  purchase_order: 'Purchase order',
  warranty: 'Warranty',
  contract: 'Contract / service agreement',
  agreement: 'Agreement',
  payment_confirmation: 'Payment confirmation',
  repayment_schedule: 'Repayment schedule',
  approval: 'Approval',
  other: 'Other',
}

/** Payment methods for money the business pays out or receives outside bookings. */
export const FIN_PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank-transfer', label: 'Bank transfer' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'rocket', label: 'Rocket' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
] as const

export const finMethodLabel = (method: string | null | undefined): string =>
  FIN_PAYMENT_METHODS.find((m) => m.value === method)?.label ?? (method ? method : '—')
