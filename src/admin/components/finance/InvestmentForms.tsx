import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Field, Input } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { LEDGER_KIND_LABELS } from '../../../lib/finance/classification'
import { recordCapital } from '../../../lib/finance/financeDb'
import { withdrawableCapital } from '../../../lib/finance/reporting'
import { logStaffActivity } from '../../../lib/staffActivityLog'
import { MAIN_FUND_ACCOUNT_ID, type FinanceData } from '../../../lib/finance/types'
import { FinanceNotice, MoneyFieldsForm } from './shared'
import { emptyMoneyFields, errorMessage, money, parseAmount, validateMoney, type MoneyFields } from './financeHelpers'

export type CapitalKind = 'owner_contribution' | 'capital_withdrawal'

const startFields = (data: FinanceData): MoneyFields => {
  const fields = emptyMoneyFields(data.accounts)
  const main = data.accounts.find((a) => a.id === MAIN_FUND_ACCOUNT_ID && a.active)
  return main ? { ...fields, accountId: main.id, method: main.defaultMethods[0] ?? fields.method } : fields
}

/** Add investment money (into the Main fund by default) or record money taken back out. */
export const CapitalEntryModal = ({ kind, data, onClose }: { kind: CapitalKind | null; data: FinanceData; onClose: () => void }) => {
  const toast = useToast()
  const [fields, setFields] = useState<MoneyFields>(() => startFields(data))
  const [counterparty, setCounterparty] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (kind) {
      setFields(startFields(data))
      setCounterparty('')
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])
  if (!kind) return null

  const adding = kind === 'owner_contribution'
  const max = adding ? undefined : withdrawableCapital(data.ledger)

  const save = async () => {
    setError(null)
    const problem = validateMoney(fields, max)
    if (problem) return setError(problem)
    setSaving(true)
    try {
      const amount = parseAmount(fields.amount)
      await recordCapital({
        kind,
        amount,
        accountId: fields.accountId,
        date: fields.date,
        method: fields.method,
        reference: fields.reference.trim() || undefined,
        counterparty: counterparty.trim() || undefined,
        notes: fields.notes.trim() || undefined,
      })
      void logStaffActivity({
        category: 'finance',
        action: kind,
        title: LEDGER_KIND_LABELS[kind],
        message: [money(amount), counterparty.trim()].filter(Boolean).join(' · '),
      })
      toast.success(adding ? 'Investment added' : 'Withdrawal recorded')
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
      title={adding ? 'Add investment' : 'Withdraw investment'}
      description={
        adding
          ? 'Money the company puts into Cherekh Center. It is capital, never revenue.'
          : 'Money taken back out of the business. Reduces capital; not an expense.'
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant={adding ? 'primary' : 'danger'} onClick={() => void save()} loading={saving}>
            {adding ? 'Add investment' : 'Record withdrawal'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <FinanceNotice title={error} tone="red" />}
        {max !== undefined && <p className="text-xs text-stone-500">Available to withdraw: {money(max)}</p>}
        <MoneyFieldsForm
          value={fields}
          onChange={setFields}
          accounts={data.accounts}
          amountLabel="Amount (BDT)"
          accountLabel={adding ? 'Received into account' : 'Paid from account'}
        />
        <Field label={adding ? 'Invested by' : 'Paid to'} hint="Optional, e.g. a partner's name">
          <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
