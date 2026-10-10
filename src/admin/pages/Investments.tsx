import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowLeftRight, Landmark, Minus, Plus, RotateCcw } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../../contexts/AuthProvider'
import { useFinanceData } from '../hooks/useFinanceData'
import { useBookingsData } from '../hooks/useBookingsData'
import { EmptyRow, ExportButtons, FinanceNotice, Pager, SectionTitle, Stat, TableShell, Td, Th } from '../components/finance/shared'
import { formatDay, money, usePaged } from '../components/finance/financeHelpers'
import { CapitalEntryModal, type CapitalKind } from '../components/finance/InvestmentForms'
import { TransferModal } from '../components/finance/FinanceSettingsPanel'
import { ReverseEntryModal } from '../components/finance/ReverseEntryModal'
import { LEDGER_KIND_LABELS, finMethodLabel } from '../../lib/finance/classification'
import { businessToday } from '../../lib/finance/dates'
import { toRevenueBookings } from '../../lib/finance/revenueAdapter'
import { capitalEntries, capitalSummary, type CapitalEntryRow } from '../../lib/finance/reporting'
import { MAIN_FUND_ACCOUNT_ID, type FinLedgerEntry } from '../../lib/finance/types'
import type { ExportColumn } from '../../utils/reportExport'

const Investments = () => {
  const { isAdmin } = useAuth()
  const { data, available, error, loading } = useFinanceData(isAdmin)
  const { bookings } = useBookingsData()
  const [entryKind, setEntryKind] = useState<CapitalKind | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [reversing, setReversing] = useState<FinLedgerEntry | null>(null)

  const today = businessToday()
  const revenueBookings = useMemo(() => toRevenueBookings(bookings), [bookings])
  const summary = useMemo(() => capitalSummary(revenueBookings, data, today), [revenueBookings, data, today])
  const rows = useMemo(() => capitalEntries(data.ledger, null), [data.ledger])
  const paged = usePaged(rows, 25)
  const mainFund = data.accounts.find((a) => a.id === MAIN_FUND_ACCOUNT_ID)
  const accountName = (id: string) => data.accounts.find((a) => a.id === id)?.name ?? id

  if (!isAdmin) return <Navigate to="/admin" replace />

  const columns: ExportColumn<CapitalEntryRow>[] = [
    { header: 'Date', value: (r) => r.entry.entryDate },
    { header: 'Type', value: (r) => LEDGER_KIND_LABELS[r.entry.kind] },
    { header: 'Amount (BDT)', value: (r) => (r.entry.kind === 'capital_withdrawal' ? -r.entry.amount : r.entry.amount), total: true },
    { header: 'Account', value: (r) => accountName(r.entry.accountId) },
    { header: 'Invested by / paid to', value: (r) => r.entry.counterparty ?? '' },
    { header: 'Method', value: (r) => finMethodLabel(r.entry.method) },
    { header: 'Reference', value: (r) => r.entry.reference ?? '' },
    { header: 'Reversed', value: (r) => (r.reversed ? 'yes' : '') },
    { header: 'Notes', value: (r) => r.entry.notes ?? '', width: 30 },
    { header: 'Recorded by', value: (r) => r.entry.createdBy ?? '' },
  ]

  return (
    <>
      <TopBar
        title="Investment"
        description="Money the company puts into Cherekh Center. It lands in the Main fund and moves to cash, wallets or bank from there."
        actions={
          available && (
            <div className="flex gap-2">
              <Button variant="outline" leftIcon={<ArrowLeftRight className="w-4 h-4" />} onClick={() => setTransferOpen(true)} className="hidden sm:inline-flex">
                Move money
              </Button>
              <Button variant="outline" leftIcon={<Minus className="w-4 h-4" />} onClick={() => setEntryKind('capital_withdrawal')} className="hidden sm:inline-flex">
                Withdraw
              </Button>
              <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEntryKind('owner_contribution')}>
                Add investment
              </Button>
            </div>
          )
        }
      />
      <main className="px-4 lg:px-8 py-6 space-y-6">
        {!available && !loading ? (
          <FinanceNotice title="Finance data is unavailable">{error}</FinanceNotice>
        ) : loading && data.accounts.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white/80 px-6 py-12 text-center text-sm text-stone-500">Loading…</div>
        ) : (
          <>
            {!mainFund && (
              <FinanceNotice title="Main fund account not found">
                Apply migration 050 to create it. Until then, choose another account when adding investment.
              </FinanceNotice>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Stat label="Total invested" value={money(summary.net)} hint={`Added ${money(summary.added)} · withdrawn ${money(summary.withdrawn)}`} />
              <Stat label={mainFund?.name ?? 'Main fund'} value={money(summary.mainFundBalance)} tone={summary.mainFundBalance < 0 ? 'bad' : 'default'} hint="Balance today" />
              <Stat label="Spent on expenses" value={money(summary.spent)} hint="Paid out, net of refunds" />
              <Stat label="Guest payments received" value={money(summary.guestReceived)} hint="Net of guest refunds" />
              <Stat label="Cash across all accounts" value={money(summary.cashOnHand)} tone={summary.cashOnHand < 0 ? 'bad' : 'good'} hint="Main fund + cash + wallets + bank" />
            </div>
            <div className="flex gap-2 sm:hidden">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeftRight className="w-4 h-4" />} onClick={() => setTransferOpen(true)}>
                Move money
              </Button>
              <Button variant="outline" size="sm" leftIcon={<Minus className="w-4 h-4" />} onClick={() => setEntryKind('capital_withdrawal')}>
                Withdraw
              </Button>
            </div>
            <FinanceNotice tone="sky" title="How investment is treated">
              Investment is capital, never revenue, and a withdrawal is never an expense. Rent paid to the Cherekh owners is recorded as an expense under “Property Rent and Occupancy”.
              Corrections are made with a reversing entry; nothing is deleted.
            </FinanceNotice>

            <section className="space-y-2">
              <SectionTitle
                title="Investment history"
                actions={
                  <ExportButtons
                    options={{ title: 'Investment history', filenameBase: `cherekh-investment-${today}`, period: `As of ${today}` }}
                    sheets={[{ name: 'Investment', columns, rows }]}
                    disabled={rows.length === 0}
                  />
                }
              />
              {rows.length === 0 ? (
                <EmptyState
                  icon={<Landmark className="w-6 h-6" />}
                  title="No investment recorded yet"
                  description="Add the money the company has put into Cherekh Center. It goes into the Main fund by default."
                  action={
                    <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEntryKind('owner_contribution')}>
                      Add investment
                    </Button>
                  }
                />
              ) : (
                <>
                  <TableShell>
                    <thead>
                      <tr>
                        <Th>Date</Th>
                        <Th>Entry</Th>
                        <Th className="hidden md:table-cell">Account</Th>
                        <Th right>Amount</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {paged.slice.length === 0 ? (
                        <EmptyRow colSpan={5}>No entries.</EmptyRow>
                      ) : (
                        paged.slice.map(({ entry: e, reversed }) => {
                          const adding = e.kind === 'owner_contribution'
                          return (
                            <tr key={e.id} className={reversed ? 'bg-stone-50/70' : undefined}>
                              <Td className="whitespace-nowrap">{formatDay(e.entryDate)}</Td>
                              <Td>
                                <p className={reversed ? 'line-through text-stone-500' : 'text-stone-800'}>
                                  {LEDGER_KIND_LABELS[e.kind]}
                                  {e.counterparty && <span className="text-stone-500"> · {e.counterparty}</span>}
                                  {reversed && (
                                    <Badge tone="neutral" className="ml-2 no-underline">
                                      Reversed
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {[finMethodLabel(e.method), e.reference && `Ref ${e.reference}`, e.notes, e.createdBy].filter(Boolean).join(' · ')}
                                </p>
                              </Td>
                              <Td className="hidden md:table-cell text-stone-600">{accountName(e.accountId)}</Td>
                              <Td right className={adding ? 'text-forest-700 font-medium' : 'text-red-700 font-medium'}>
                                {adding ? '+' : '−'}
                                {money(e.amount)}
                              </Td>
                              <Td right>
                                {!reversed && (
                                  <button type="button" className="text-stone-400 hover:text-red-600" title="Reverse" onClick={() => setReversing(e)}>
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              </Td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </TableShell>
                  <Pager {...paged} />
                </>
              )}
            </section>
          </>
        )}
      </main>

      <CapitalEntryModal kind={entryKind} data={data} onClose={() => setEntryKind(null)} />
      <TransferModal open={transferOpen} accounts={data.accounts} defaultFrom={MAIN_FUND_ACCOUNT_ID} onClose={() => setTransferOpen(false)} />
      <ReverseEntryModal entry={reversing} onClose={() => setReversing(null)} />
    </>
  )
}

export default Investments
