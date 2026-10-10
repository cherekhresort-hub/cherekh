import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field, Textarea } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { LEDGER_KIND_LABELS } from '../../../lib/finance/classification'
import { reverseLedgerEntry } from '../../../lib/finance/financeDb'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import type { FinLedgerEntry } from '../../../lib/finance/types'
import { FinanceNotice } from './shared'
import { errorMessage, formatDay, money } from './financeHelpers'

export const ReverseEntryModal = ({ entry, onClose }: { entry: FinLedgerEntry | null; onClose: () => void }) => {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setReason('')
    setError(null)
  }, [entry])
  if (!entry) return null

  const save = async () => {
    if (!reason.trim()) return setError('A reason is required.')
    setSaving(true)
    try {
      const count = await reverseLedgerEntry(entry.id, reason.trim())
      void logStaffActivity({
        category: 'finance',
        action: 'ledger_reversed',
        title: `Reversed ${LEDGER_KIND_LABELS[entry.kind]}`,
        message: `${money(entry.amount)}: ${reason.trim()}`,
        entityId: entry.expenseId ?? undefined,
      })
      toast.success(count > 1 ? 'Both sides of the transfer reversed' : 'Entry reversed')
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
      size="sm"
      title="Reverse entry"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => void save()} loading={saving}>
            Reverse
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {error && <FinanceNotice title={error} tone="red" />}
        <p className="text-sm text-stone-600">
          Adds an opposite entry for {LEDGER_KIND_LABELS[entry.kind]} of {money(entry.amount)} on {formatDay(entry.entryDate)}.
          {entry.transferGroupId && ' Both sides of the transfer are reversed.'} The original stays in the ledger.
        </p>
        <Field label="Reason" required>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
