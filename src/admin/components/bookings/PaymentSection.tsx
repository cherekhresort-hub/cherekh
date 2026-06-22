import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Banknote,
  CreditCard,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Receipt,
  ChevronDown,
  Wallet,
  Undo2,
  Tag,
  Percent,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import {
  computeBookingFinancials,
  deletePaymentTransaction,
  PAYMENT_METHOD_LABELS,
  recordPaymentTransaction,
  setBookingDiscount,
  setBookingTotalAmount,
  type Booking,
  type DiscountType,
  type PaymentMethod,
  type PaymentTransactionType,
} from '../../../utils/bookings'
import { calculateBookingTotal } from '../../../utils/bookingHelpers'
import { formatBDT } from '../../utils/format'
import { formatDateTime } from '../../utils/date'
import { cn } from '../../utils/cn'
import { confirmDelete } from '../../utils/confirmDelete'

interface PaymentSectionProps {
  booking: Booking
  onChanged: () => void
}

const PAYMENT_STATUS_TONES: Record<string, 'forest' | 'amber' | 'red' | 'neutral'> = {
  paid: 'forest',
  partial: 'amber',
  refunded: 'red',
  pending: 'neutral',
}

const TX_TYPE_LABEL: Record<PaymentTransactionType, string> = {
  payment: 'Payment',
  refund: 'Refund',
  adjustment: 'Adjustment',
}

const TX_TYPE_TONE: Record<PaymentTransactionType, 'forest' | 'red' | 'sky'> = {
  payment: 'forest',
  refund: 'red',
  adjustment: 'sky',
}

export const PaymentSection = ({ booking, onChanged }: PaymentSectionProps) => {
  const { canDelete, canEditPricing } = useAuth()
  const toast = useToast()
  const fin = useMemo(() => computeBookingFinancials(booking), [booking])
  const suggestedTotal = useMemo(() => calculateBookingTotal(booking), [booking])
  const transactions = useMemo(
    () =>
      [...(booking.payment?.transactions ?? [])].sort((a, b) =>
        a.recordedAt < b.recordedAt ? 1 : -1
      ),
    [booking]
  )

  const [editingTotal, setEditingTotal] = useState(false)
  const [totalDraft, setTotalDraft] = useState<number>(fin.subtotal)

  const [editingDiscount, setEditingDiscount] = useState(false)
  const [discountType, setDiscountType] = useState<DiscountType>(
    booking.payment?.discount?.type ?? 'amount'
  )
  const [discountValue, setDiscountValue] = useState<number>(
    booking.payment?.discount?.value ?? 0
  )
  const [discountReason, setDiscountReason] = useState<string>(
    booking.payment?.discount?.reason ?? ''
  )

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<PaymentTransactionType>('payment')
  const [amount, setAmount] = useState<number>(0)
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setTotalDraft(fin.subtotal)
    setEditingTotal(false)
    setEditingDiscount(false)
    setDiscountType(booking.payment?.discount?.type ?? 'amount')
    setDiscountValue(booking.payment?.discount?.value ?? 0)
    setDiscountReason(booking.payment?.discount?.reason ?? '')
    setAmount(0)
    setReference('')
    setNotes('')
    setType('payment')
    setMethod('cash')
    setOpen(false)
  }, [booking.id, fin.subtotal, booking.payment?.discount?.type, booking.payment?.discount?.value, booking.payment?.discount?.reason])

  const saveTotal = async () => {
    if (!canEditPricing) {
      toast.error('Permission denied', 'Only admins can change room rent / subtotal.')
      return
    }
    const updated = await setBookingTotalAmount(booking.id, totalDraft)
    if (!updated) {
      toast.error('Could not update subtotal')
      return
    }
    toast.success('Total updated', formatBDT(totalDraft))
    setEditingTotal(false)
    onChanged()
  }

  const cancelTotal = () => {
    setTotalDraft(fin.total)
    setEditingTotal(false)
  }

  const applySuggestedTotal = async () => {
    if (!canEditPricing) {
      toast.error('Permission denied', 'Only admins can override the rate card subtotal.')
      return
    }
    const updated = await setBookingTotalAmount(booking.id, suggestedTotal)
    if (!updated) {
      toast.error('Could not update subtotal')
      return
    }
    toast.success('Subtotal set from rate card', formatBDT(suggestedTotal))
    onChanged()
  }

  const saveDiscount = async () => {
    if (discountValue <= 0) {
      toast.error('Enter a discount value greater than 0')
      return
    }
    if (discountType === 'percent' && discountValue > 100) {
      toast.error('Percent discount cannot exceed 100')
      return
    }
    await setBookingDiscount(booking.id, {
      type: discountType,
      value: discountValue,
      reason: discountReason,
    })
    toast.success('Discount applied')
    setEditingDiscount(false)
    onChanged()
  }

  const removeDiscount = async () => {
    if (!canDelete) {
      toast.error('Permission denied', 'Managers cannot remove discounts.')
      return
    }
    await setBookingDiscount(booking.id, null)
    setDiscountValue(0)
    setDiscountReason('')
    setEditingDiscount(false)
    toast.success('Discount removed')
    onChanged()
  }

  const showSuggestion =
    suggestedTotal > 0 && suggestedTotal !== fin.subtotal && !editingTotal

  const submitTx = async () => {
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    await recordPaymentTransaction(booking.id, {
      type,
      amount,
      method,
      reference,
      notes,
    })
    toast.success(`${TX_TYPE_LABEL[type]} recorded`, formatBDT(amount))
    setAmount(0)
    setReference('')
    setNotes('')
    setType('payment')
    setOpen(false)
    onChanged()
  }

  const removeTx = async (txId: string) => {
    if (!canDelete) {
      toast.error('Permission denied', 'Managers cannot remove payment transactions.')
      return
    }
    if (!(await confirmDelete({
      title: 'Remove transaction?',
      text: 'Remove this payment transaction? This cannot be undone.',
    }))) return
    await deletePaymentTransaction(booking.id, txId)
    toast.success('Transaction removed')
    onChanged()
  }

  const statusTone = PAYMENT_STATUS_TONES[fin.status] ?? 'neutral'

  return (
    <Card padded={false} className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" /> Payment
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">Manage charges, payments and refunds</p>
        </div>
        <Badge tone={statusTone} size="sm">
          {fin.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="Total due" value={formatBDT(fin.total)} tone="default" />
        <Stat label="Paid" value={formatBDT(fin.paid)} tone="success" />
        <Stat
          label="Outstanding"
          value={formatBDT(fin.outstanding)}
          tone={fin.outstanding > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="rounded-2xl border border-stone-100 p-3 mb-4 bg-cream/40 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-stone-500">Subtotal</p>
            {editingTotal ? (
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={totalDraft || ''}
                  onChange={(e) => setTotalDraft(Math.max(0, Number(e.target.value || 0)))}
                  className="h-9 w-36"
                  placeholder="0"
                />
                <Button size="sm" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={saveTotal}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<X className="w-3.5 h-3.5" />}
                  onClick={cancelTotal}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <p className="font-serif text-lg text-stone-700">{formatBDT(fin.subtotal)}</p>
            )}
          </div>
          {!editingTotal && canEditPricing && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => setEditingTotal(true)}
            >
              Edit subtotal
            </Button>
          )}
        </div>

        {showSuggestion && canEditPricing && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-forest-50 border border-forest-100 px-3 py-2">
            <p className="text-xs text-forest-700">
              Suggested subtotal from rate card:{' '}
              <span className="font-medium">{formatBDT(suggestedTotal)}</span>
            </p>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Check className="w-3.5 h-3.5" />}
              onClick={applySuggestedTotal}
            >
              {fin.subtotal === 0 ? 'Use this' : 'Replace'}
            </Button>
          </div>
        )}
        {showSuggestion && !canEditPricing && (
          <p className="text-xs text-stone-500 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2">
            Rate card subtotal: <span className="font-medium">{formatBDT(suggestedTotal)}</span>
            {' '}(managers cannot change rent — contact admin to override)
          </p>
        )}

        <div className="border-t border-stone-200/70 pt-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[10px] uppercase tracking-wide text-stone-500 inline-flex items-center gap-1">
              <Tag className="w-3 h-3" /> Discount
            </p>
            {!editingDiscount && (
              <div className="flex items-center gap-1.5">
                {booking.payment?.discount && canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={removeDiscount}
                  >
                    Remove
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={
                    booking.payment?.discount ? (
                      <Pencil className="w-3.5 h-3.5" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )
                  }
                  onClick={() => setEditingDiscount(true)}
                >
                  {booking.payment?.discount ? 'Edit' : 'Add discount'}
                </Button>
              </div>
            )}
          </div>

          {editingDiscount ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="pr-8 h-9"
                  >
                    <option value="amount">Flat amount (BDT)</option>
                    <option value="percent">Percent (%)</option>
                  </Select>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={discountType === 'percent' ? 100 : undefined}
                    step={discountType === 'percent' ? 1 : 100}
                    value={discountValue || ''}
                    onChange={(e) =>
                      setDiscountValue(Math.max(0, Number(e.target.value || 0)))
                    }
                    placeholder={discountType === 'percent' ? '10' : '500'}
                    className="h-9 pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
                    {discountType === 'percent' ? '%' : '৳'}
                  </span>
                </div>
              </div>
              <Input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder="Reason (optional) — e.g. returning guest, group rate"
                className="h-9"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-stone-500">
                  Will subtract{' '}
                  <span className="font-medium text-forest-700">
                    {formatBDT(
                      discountType === 'percent'
                        ? Math.round((fin.subtotal * Math.min(100, discountValue)) / 100)
                        : Math.min(fin.subtotal, discountValue)
                    )}
                  </span>{' '}
                  from {formatBDT(fin.subtotal)}
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<X className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setEditingDiscount(false)
                      setDiscountType(booking.payment?.discount?.type ?? 'amount')
                      setDiscountValue(booking.payment?.discount?.value ?? 0)
                      setDiscountReason(booking.payment?.discount?.reason ?? '')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                    onClick={saveDiscount}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          ) : booking.payment?.discount ? (
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="text-stone-700">
                  <span className="font-medium text-red-700">
                    − {formatBDT(fin.discount)}
                  </span>{' '}
                  <span className="text-xs text-stone-500">
                    {booking.payment.discount.type === 'percent'
                      ? `(${booking.payment.discount.value}%)`
                      : '(flat)'}
                  </span>
                </p>
                {booking.payment.discount.reason && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    {booking.payment.discount.reason}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                <Percent className="w-3 h-3" />
                Applied
              </span>
            </div>
          ) : (
            <p className="text-xs text-stone-500">No discount applied.</p>
          )}
        </div>

        <div className="border-t border-stone-200/70 pt-3 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wide text-stone-500">Total payment</p>
          <p className="font-serif text-xl text-forest-700">{formatBDT(fin.total)}</p>
        </div>

        {fin.refunded > 0 && (
          <p className="text-xs text-red-600 inline-flex items-center gap-1">
            <Undo2 className="w-3 h-3" /> {formatBDT(fin.refunded)} refunded
          </p>
        )}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-[11px] uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
          <Receipt className="w-3 h-3" /> Transactions
          <span className="text-stone-400 normal-case font-normal">({transactions.length})</span>
        </h4>
        <Button
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Record payment'}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-2xl border border-forest-100 bg-white p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Type">
                  <div className="relative">
                    <Select
                      value={type}
                      onChange={(e) => setType(e.target.value as PaymentTransactionType)}
                      className="pr-8"
                    >
                      <option value="payment">Payment received</option>
                      <option value="refund">Refund issued</option>
                      <option value="adjustment">Adjustment / credit</option>
                    </Select>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </Field>
                <Field label="Amount (BDT)" required>
                  <Input
                    type="number"
                    min={0}
                    step={100}
                    value={amount || ''}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value || 0)))}
                    placeholder="0"
                  />
                </Field>
                <Field label="Method">
                  <div className="relative">
                    <Select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                      className="pr-8"
                    >
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </Select>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </Field>
                <Field label="Reference / TrxID">
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. bKash TrxID"
                  />
                </Field>
              </div>
              <Field label="Notes">
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={submitTx}>
                  Save transaction
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {transactions.length > 0 ? (
        <ul className="space-y-2">
          {transactions.map((tx) => {
            const isRefund = tx.type === 'refund'
            return (
              <li
                key={tx.id}
                className="flex items-start gap-3 bg-cream/60 rounded-xl px-3 py-2.5"
              >
                <span
                  className={cn(
                    'w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0',
                    isRefund ? 'bg-red-100 text-red-700' : 'bg-forest-100 text-forest-700'
                  )}
                >
                  {tx.method === 'card' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Banknote className="w-4 h-4" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span
                      className={cn(
                        'font-medium',
                        isRefund ? 'text-red-700' : 'text-forest-700'
                      )}
                    >
                      {isRefund ? '−' : '+'}
                      {formatBDT(tx.amount)}
                    </span>
                    <Badge tone={TX_TYPE_TONE[tx.type]} size="sm">
                      {TX_TYPE_LABEL[tx.type]}
                    </Badge>
                    {tx.method && (
                      <Badge tone="neutral" size="sm">
                        {PAYMENT_METHOD_LABELS[tx.method]}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {formatDateTime(tx.recordedAt)}
                    {tx.recordedBy ? ` · ${tx.recordedBy}` : ''}
                    {tx.reference ? ` · Ref ${tx.reference}` : ''}
                  </p>
                  {tx.notes && (
                    <p className="text-xs text-stone-600 mt-1 whitespace-pre-wrap">{tx.notes}</p>
                  )}
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => removeTx(tx.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove transaction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="rounded-xl bg-cream/60 border border-dashed border-stone-200 px-4 py-6 text-center">
          <Receipt className="w-5 h-5 text-stone-400 mx-auto mb-2" />
          <p className="text-xs text-stone-500">No transactions yet. Record a payment to get started.</p>
        </div>
      )}
    </Card>
  )
}

const Stat = ({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'default' | 'success' | 'warning'
}) => (
  <div
    className={cn(
      'rounded-xl px-3 py-2.5',
      tone === 'success' && 'bg-forest-50',
      tone === 'warning' && 'bg-amber-50',
      tone === 'default' && 'bg-stone-50'
    )}
  >
    <p className="text-[10px] uppercase tracking-wide text-stone-500">{label}</p>
    <p
      className={cn(
        'font-serif text-base mt-0.5',
        tone === 'success' && 'text-forest-700',
        tone === 'warning' && 'text-amber-700',
        tone === 'default' && 'text-stone-800'
      )}
    >
      {value}
    </p>
  </div>
)
