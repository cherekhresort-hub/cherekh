import { useMemo, useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { updateAsset } from '../../../lib/finance/financeDb'
import { businessToday } from '../../../lib/finance/dates'
import { accumulatedDepreciation } from '../../../lib/finance/reporting'
import type { AssetStatus, FinanceData, FinAsset } from '../../../lib/finance/types'
import type { ExportColumn } from '../../../utils/reportExport'
import { AttachmentsSection } from './AttachmentsSection'
import { EmptyRow, ExportButtons, FinanceNotice, Pager, SectionTitle, Stat, TableShell, Td, Th } from './shared'
import { errorMessage, formatDay, money, usePaged, type FinanceLookups } from './financeHelpers'

const STATUS_TONE: Record<AssetStatus, 'forest' | 'neutral' | 'amber' | 'red'> = {
  active: 'forest',
  disposed: 'neutral',
  written_off: 'amber',
  void: 'red',
}

export const AssetsPanel = ({
  data,
  lookups,
  onOpenExpense,
}: {
  data: FinanceData
  lookups: FinanceLookups
  onOpenExpense: (id: string) => void
}) => {
  const { isAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | AssetStatus>('active')
  const [editing, setEditing] = useState<FinAsset | null>(null)
  const today = businessToday()

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return data.assets
      .filter((a) => status === 'all' || a.status === status)
      .filter((a) => !q || [a.code, a.name, a.location, a.serialNumber].join(' ').toLowerCase().includes(q))
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
  }, [data.assets, search, status])
  const paged = usePaged(rows, 25)

  const active = data.assets.filter((a) => a.status === 'active')
  const cost = active.reduce((s, a) => s + a.cost, 0)
  const accumulated = active.reduce((s, a) => s + accumulatedDepreciation(a, today), 0)
  const withoutLife = active.filter((a) => !a.usefulLifeMonths).length
  const expenseCode = (id: string | null) => (id ? data.expenses.find((e) => e.id === id)?.code ?? '' : '')

  const columns: ExportColumn<FinAsset>[] = [
    { header: 'Asset ID', value: (a) => a.code },
    { header: 'Name', value: (a) => a.name, width: 28 },
    { header: 'Category', value: (a) => lookups.categoryLabel(a.categoryId), width: 30 },
    { header: 'Department', value: (a) => (a.departmentId && lookups.department.get(a.departmentId)) || '' },
    { header: 'Purchase date', value: (a) => a.purchaseDate },
    { header: 'Quantity', value: (a) => a.quantity },
    { header: 'Cost (BDT)', value: (a) => a.cost, total: true },
    { header: 'Useful life (months)', value: (a) => a.usefulLifeMonths ?? '' },
    { header: 'Accumulated depreciation (BDT)', value: (a) => (a.status === 'active' ? accumulatedDepreciation(a, today) : 0), total: true },
    { header: 'Location', value: (a) => a.location ?? '' },
    { header: 'Serial', value: (a) => a.serialNumber ?? '' },
    { header: 'Warranty until', value: (a) => a.warrantyUntil ?? '' },
    { header: 'Status', value: (a) => a.status },
    { header: 'Source expense', value: (a) => expenseCode(a.expenseId) },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Active assets" value={active.length} />
        <Stat label="Cost of active assets" value={money(cost)} />
        <Stat label="Accumulated depreciation" value={money(accumulated)} hint={withoutLife > 0 ? `${withoutLife} without a useful life (not depreciated)` : undefined} />
        <Stat label="Book value" value={money(cost - accumulated)} />
      </div>
      <SectionTitle
        title="Asset register"
        description="Created automatically from expense lines classified as capital assets. Depreciation is straight-line and only applies once a useful life is set."
        actions={
          <>
            <Input className="w-48" placeholder="Search assets" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select className="w-36" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="active">Active</option>
              <option value="disposed">Disposed</option>
              <option value="written_off">Written off</option>
              <option value="void">Void</option>
              <option value="all">All</option>
            </Select>
            <ExportButtons options={{ title: 'Asset register', filenameBase: 'cherekh-assets', filters: { Status: status } }} sheets={[{ name: 'Assets', columns, rows }]} disabled={rows.length === 0} />
          </>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Asset</Th>
            <Th className="hidden md:table-cell">Category</Th>
            <Th>Purchased</Th>
            <Th right>Cost</Th>
            <Th right className="hidden lg:table-cell">Depreciated</Th>
            <Th className="hidden lg:table-cell">Location</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {paged.slice.length === 0 ? (
            <EmptyRow colSpan={8}>No assets. Mark an expense line as a capital asset to add one.</EmptyRow>
          ) : (
            paged.slice.map((a) => (
              <tr key={a.id}>
                <Td>
                  <p className="font-medium text-forest-700">{a.name}</p>
                  <p className="text-xs text-stone-500">
                    <span className="font-mono">{a.code}</span>
                    {a.expenseId && (
                      <>
                        {' · '}
                        <button type="button" className="hover:underline" onClick={() => onOpenExpense(a.expenseId as string)}>
                          {expenseCode(a.expenseId)}
                        </button>
                      </>
                    )}
                  </p>
                </Td>
                <Td className="hidden md:table-cell text-xs text-stone-600">{lookups.categoryLabel(a.categoryId)}</Td>
                <Td className="whitespace-nowrap">{formatDay(a.purchaseDate)}</Td>
                <Td right>{money(a.cost)}</Td>
                <Td right className="hidden lg:table-cell">
                  {a.usefulLifeMonths ? money(a.status === 'active' ? accumulatedDepreciation(a, today) : 0) : <span className="text-xs text-stone-400">No useful life</span>}
                </Td>
                <Td className="hidden lg:table-cell text-stone-600">{a.location ?? '—'}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[a.status]}>{a.status.replace('_', ' ')}</Badge>
                </Td>
                <Td right>
                  <button type="button" className="text-stone-400 hover:text-forest-700" aria-label="Asset details" onClick={() => setEditing(a)}>
                    <Pencil className="w-4 h-4" />
                  </button>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
      <Pager {...paged} />
      <AssetModal asset={editing} canEdit={isAdmin} onClose={() => setEditing(null)} />
    </div>
  )
}

const AssetModal = ({ asset, canEdit, onClose }: { asset: FinAsset | null; canEdit: boolean; onClose: () => void }) => {
  const toast = useToast()
  const [form, setForm] = useState<Partial<FinAsset>>({})
  const [openedFor, setOpenedFor] = useState<FinAsset | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (asset !== openedFor) {
    setOpenedFor(asset)
    setForm(asset ?? {})
    setError(null)
  }
  if (!asset) return null

  const set = (patch: Partial<FinAsset>) => setForm((f) => ({ ...f, ...patch }))
  const editable = canEdit && asset.status !== 'void'

  const save = async () => {
    setError(null)
    if (!form.name?.trim()) return setError('Name is required.')
    const life = form.usefulLifeMonths
    if (life !== null && life !== undefined && (!Number.isInteger(life) || life <= 0)) return setError('Useful life must be a whole number of months.')
    if ((form.salvageValue ?? 0) < 0 || (form.salvageValue ?? 0) > asset.cost) return setError('Salvage value must be between 0 and the cost.')
    if ((form.status === 'disposed' || form.status === 'written_off') && !form.disposalDate) return setError('Set the disposal date.')
    setSaving(true)
    try {
      await updateAsset(asset.id, {
        name: form.name.trim(),
        location: form.location?.trim() || null,
        serialNumber: form.serialNumber?.trim() || null,
        warrantyUntil: form.warrantyUntil || null,
        usefulLifeMonths: life ?? null,
        salvageValue: form.salvageValue ?? 0,
        status: form.status,
        disposalDate: form.status === 'active' ? null : form.disposalDate || null,
        disposalNote: form.disposalNote?.trim() || null,
        notes: form.notes?.trim() || null,
      })
      toast.success('Asset updated')
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
      size="lg"
      title={`${asset.code} · ${asset.name}`}
      description={`Cost ${money(asset.cost)} · purchased ${formatDay(asset.purchaseDate)}`}
      footer={
        editable ? (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              Save
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {error && <FinanceNotice title={error} tone="red" />}
        {asset.status === 'void' && <FinanceNotice title="This asset was voided with its source expense." tone="red" />}
        <fieldset disabled={!editable} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name" required className="sm:col-span-2">
            <Input value={form.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="Location">
            <Input value={form.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
          </Field>
          <Field label="Serial number">
            <Input value={form.serialNumber ?? ''} onChange={(e) => set({ serialNumber: e.target.value })} />
          </Field>
          <Field label="Warranty until">
            <Input type="date" value={form.warrantyUntil ?? ''} onChange={(e) => set({ warrantyUntil: e.target.value || null })} />
          </Field>
          <Field label="Useful life (months)" hint="Leave empty to skip depreciation">
            <Input
              type="number"
              min="1"
              step="1"
              value={form.usefulLifeMonths ?? ''}
              onChange={(e) => set({ usefulLifeMonths: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Field>
          <Field label="Salvage value (BDT)">
            <Input type="number" min="0" step="0.01" value={form.salvageValue ?? 0} onChange={(e) => set({ salvageValue: Number(e.target.value) || 0 })} />
          </Field>
          <Field label="Status">
            <Select value={form.status ?? 'active'} onChange={(e) => set({ status: e.target.value as AssetStatus })}>
              <option value="active">Active</option>
              <option value="disposed">Disposed</option>
              <option value="written_off">Written off</option>
              {asset.status === 'void' && <option value="void">Void</option>}
            </Select>
          </Field>
          {form.status !== 'active' && form.status !== 'void' && (
            <>
              <Field label="Disposal date" required>
                <Input type="date" value={form.disposalDate ?? ''} onChange={(e) => set({ disposalDate: e.target.value || null })} />
              </Field>
              <Field label="Disposal note">
                <Input value={form.disposalNote ?? ''} onChange={(e) => set({ disposalNote: e.target.value })} />
              </Field>
            </>
          )}
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
          </Field>
        </fieldset>
        {!canEdit && <p className="text-xs text-stone-500">Only admins can edit asset details.</p>}
        <AttachmentsSection ownerType="asset" ownerId={asset.id} docTypes={['warranty', 'invoice', 'receipt', 'other']} canUpload={asset.status !== 'void'} />
      </div>
    </Modal>
  )
}
