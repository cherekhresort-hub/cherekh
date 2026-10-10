import { useMemo, useState } from 'react'
import { formatBDT } from '../../utils/format'
import { businessToday } from '../../../lib/finance/dates'
import type { FinAccount, FinanceData } from '../../../lib/finance/types'
import type { PaymentStatus } from '../../../lib/finance/reporting'

export const money = (n: number | null | undefined): string => formatBDT(Math.round((n ?? 0) * 100) / 100)

export const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err))

export const formatDay = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const parseAmount = (s: string): number => {
  const n = Number(s)
  return s.trim() !== '' && Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'Paid',
  partial: 'Partially paid',
  unpaid: 'Unpaid',
  refunded: 'Refunded',
  void: 'Void',
}

export const useFinanceLookups = (data: FinanceData) =>
  useMemo(() => {
    const categories = new Map(data.categories.map((c) => [c.id, c]))
    const categoryLabel = (id: string | null | undefined): string => {
      if (!id) return '—'
      const cat = categories.get(id)
      if (!cat) return id
      const parent = cat.parentId ? categories.get(cat.parentId) : undefined
      return parent
        ? `${parent.code ? `${parent.code}. ` : ''}${parent.name} › ${cat.name}`
        : `${cat.code ? `${cat.code}. ` : ''}${cat.name}`
    }
    const topCategoryName = (id: string): string => {
      const cat = categories.get(id)
      if (!cat) return id === 'deposit_write_offs' ? 'Deposits written off' : id
      return `${cat.code ? `${cat.code}. ` : ''}${cat.name}`
    }
    return {
      categories,
      categoryLabel,
      topCategoryName,
      department: new Map(data.departments.map((d) => [d.id, d.name])),
      supplier: new Map(data.suppliers.map((s) => [s.id, s.name])),
      account: new Map(data.accounts.map((a) => [a.id, a.name])),
      project: new Map(data.projects.map((p) => [p.id, p.name])),
    }
  }, [data])

export type FinanceLookups = ReturnType<typeof useFinanceLookups>

export const usePaged = <T>(rows: T[], pageSize = 25) => {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pages - 1)
  return {
    page: current,
    pages,
    setPage,
    slice: rows.slice(current * pageSize, current * pageSize + pageSize),
    total: rows.length,
    pageSize,
  }
}

export interface MoneyFields {
  amount: string
  accountId: string
  method: string
  reference: string
  date: string
  notes: string
}

export const emptyMoneyFields = (accounts: FinAccount[], amount = ''): MoneyFields => {
  const first = accounts.find((a) => a.active)
  return {
    amount,
    accountId: first?.id ?? '',
    method: first?.defaultMethods[0] ?? 'cash',
    reference: '',
    date: businessToday(),
    notes: '',
  }
}

/** Validates the money block; returns an error message or null. */
export const validateMoney = (value: MoneyFields, max?: number): string | null => {
  const amount = parseAmount(value.amount)
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter an amount greater than zero.'
  if (max !== undefined && amount > max + 0.005) return `Amount cannot exceed ${formatBDT(max)}.`
  if (!value.accountId) return 'Choose the account.'
  if (!value.date) return 'Choose the date.'
  return null
}
