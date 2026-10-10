import { Fragment, useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Field, Input, Textarea } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { saveSupplier } from '../../../lib/finance/financeDb'
import { supplierPayables, type ExpenseIndex, type SupplierPayable } from '../../../lib/finance/reporting'
import type { FinanceData, FinSupplier } from '../../../lib/finance/types'
import type { ExportColumn } from '../../../utils/reportExport'
import { EmptyRow, ExportButtons, FinanceNotice, SectionTitle, Stat, TableShell, Td, Th } from './shared'
import { errorMessage, money } from './financeHelpers'

interface Row extends SupplierPayable {
  supplier: FinSupplier | null
}

export const SuppliersPanel = ({
  data,
  index,
  onOpenExpense,
}: {
  data: FinanceData
  index: ExpenseIndex
  onOpenExpense: (id: string) => void
}) => {
  const [editing, setEditing] = useState<Partial<FinSupplier> | null>(null)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const rows = useMemo<Row[]>(() => {
    const payables = supplierPayables(data, index)
    const byId = new Map(payables.filter((p) => p.supplierId).map((p) => [p.supplierId as string, p]))
    const list: Row[] = data.suppliers.map((s) => ({
      ...(byId.get(s.id) ?? { key: s.id, supplierId: s.id, name: s.name, billed: 0, paid: 0, outstanding: 0, openCount: 0 }),
      supplier: s,
    }))
    payables.filter((p) => !p.supplierId).forEach((p) => list.push({ ...p, supplier: null }))
    const q = search.trim().toLowerCase()
    return list
      .filter((r) => !q || [r.name, r.supplier?.phone, r.supplier?.contactPerson].join(' ').toLowerCase().includes(q))
      .sort((a, b) => b.outstanding - a.outstanding || b.billed - a.billed || a.name.localeCompare(b.name))
  }, [data, index, search])

  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0)
  const openExpenses = (r: Row) =>
    [...index.values()].filter(
      (f) =>
        f.recognized &&
        f.expense.paidByType === 'company' &&
        (r.supplierId ? f.expense.supplierId === r.supplierId : !f.expense.supplierId && (f.expense.payeeName ?? 'No supplier') === r.name) &&
        f.outstanding > 0.005
    )

  const columns: ExportColumn<Row>[] = [
    { header: 'Supplier', value: (r) => r.name, width: 28 },
    { header: 'Contact', value: (r) => r.supplier?.contactPerson ?? '' },
    { header: 'Phone', value: (r) => r.supplier?.phone ?? '' },
    { header: 'Billed (BDT)', value: (r) => r.billed, total: true },
    { header: 'Paid (BDT)', value: (r) => r.paid, total: true },
    { header: 'Outstanding (BDT)', value: (r) => r.outstanding, total: true },
    { header: 'Open bills', value: (r) => r.openCount, total: true },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Suppliers" value={data.suppliers.filter((s) => s.active).length} />
        <Stat label="Owed to suppliers" value={money(totalOutstanding)} tone={totalOutstanding > 0 ? 'bad' : 'muted'} />
      </div>
      <SectionTitle
        title="Suppliers & payables"
        description="Billed is the total of non-void, non-rejected purchases. Outstanding is what is still owed after payments, refunds and applied advances."
        actions={
          <>
            <Input className="w-56" placeholder="Search suppliers" value={search} onChange={(e) => setSearch(e.target.value)} />
            <ExportButtons options={{ title: 'Supplier payables', filenameBase: 'cherekh-supplier-payables' }} sheets={[{ name: 'Suppliers', columns, rows }]} disabled={rows.length === 0} />
            <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setEditing({ active: true })}>
              Add supplier
            </Button>
          </>
        }
      />
      <TableShell>
        <thead>
          <tr>
            <Th>Supplier</Th>
            <Th className="hidden md:table-cell">Contact</Th>
            <Th right>Billed</Th>
            <Th right>Paid</Th>
            <Th right>Outstanding</Th>
            <Th />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.length === 0 ? (
            <EmptyRow colSpan={6}>No suppliers yet.</EmptyRow>
          ) : (
            rows.map((r) => (
              <Fragment key={r.key}>
                <tr className="hover:bg-cream/50 cursor-pointer" onClick={() => setExpanded(expanded === r.key ? null : r.key)}>
                  <Td>
                    <p className="font-medium text-forest-700">{r.name}</p>
                    {r.supplier && !r.supplier.active && <Badge tone="neutral">Inactive</Badge>}
                    {!r.supplier && <p className="text-xs text-stone-500">Recorded by name only</p>}
                  </Td>
                  <Td className="hidden md:table-cell text-xs text-stone-600">
                    {[r.supplier?.contactPerson, r.supplier?.phone, r.supplier?.email].filter(Boolean).join(' · ') || '—'}
                  </Td>
                  <Td right>{money(r.billed)}</Td>
                  <Td right>{money(r.paid)}</Td>
                  <Td right className={r.outstanding > 0.005 ? 'text-red-700' : 'text-stone-400'}>
                    {money(r.outstanding)}
                    {r.openCount > 0 && <span className="block text-[11px] text-stone-500">{r.openCount} open</span>}
                  </Td>
                  <Td right>
                    {r.supplier && (
                      <button
                        type="button"
                        className="text-stone-400 hover:text-forest-700"
                        aria-label="Edit supplier"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditing(r.supplier as FinSupplier)
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </Td>
                </tr>
                {expanded === r.key && (
                  <tr className="bg-stone-50/60">
                    <td colSpan={6} className="px-4 py-2">
                      {openExpenses(r).length === 0 ? (
                        <p className="text-xs text-stone-500">Nothing outstanding.</p>
                      ) : (
                        <ul className="text-sm space-y-1">
                          {openExpenses(r).map((f) => (
                            <li key={f.expense.id} className="flex justify-between gap-3">
                              <button type="button" className="text-left text-forest-700 hover:underline" onClick={() => onOpenExpense(f.expense.id)}>
                                <span className="font-mono text-xs text-stone-500">{f.expense.code}</span> {f.expense.title}
                              </button>
                              <span className="tabular-nums text-red-700">{money(f.outstanding)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </TableShell>
      <SupplierModal supplier={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

const SupplierModal = ({ supplier, onClose }: { supplier: Partial<FinSupplier> | null; onClose: () => void }) => {
  const toast = useToast()
  const [form, setForm] = useState<Partial<FinSupplier>>({})
  const [openedFor, setOpenedFor] = useState<Partial<FinSupplier> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (supplier !== openedFor) {
    setOpenedFor(supplier)
    setForm(supplier ?? {})
    setError(null)
  }
  if (!supplier) return null

  const set = (patch: Partial<FinSupplier>) => setForm((f) => ({ ...f, ...patch }))
  const save = async () => {
    if (!form.name?.trim()) return setError('Name is required.')
    setSaving(true)
    try {
      await saveSupplier({
        id: form.id,
        name: form.name.trim(),
        contactPerson: form.contactPerson?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        address: form.address?.trim() || null,
        notes: form.notes?.trim() || null,
        active: form.active ?? true,
      })
      toast.success('Supplier saved')
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
      title={form.id ? 'Edit supplier' : 'Add supplier'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            Save
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {error && (
          <div className="sm:col-span-2">
            <FinanceNotice title={error} tone="red" />
          </div>
        )}
        <Field label="Name" required className="sm:col-span-2">
          <Input value={form.name ?? ''} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Contact person">
          <Input value={form.contactPerson ?? ''} onChange={(e) => set({ contactPerson: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Address">
          <Input value={form.address ?? ''} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        {form.id && (
          <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={form.active ?? true} onChange={(e) => set({ active: e.target.checked })} /> Active (inactive suppliers are hidden from new purchases)
          </label>
        )}
      </div>
    </Modal>
  )
}
