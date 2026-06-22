import { ArrowUpDown, ChevronRight, Mail, Phone, Sparkles } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { EmptyState } from '../ui/EmptyState'
import { formatShortDate } from '../../utils/date'
import { formatBDT } from '../../utils/format'
import { cn } from '../../utils/cn'
import type { Guest, GuestTag } from '../../types'

export type GuestSortKey = 'name' | 'phone' | 'totalStays' | 'totalSpent' | 'lastStay'

interface GuestTableProps {
  guests: Guest[]
  sortKey: GuestSortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: GuestSortKey) => void
  onSelect: (guest: Guest) => void
}

const tagToTone = {
  vip: 'sand',
  returning: 'teal',
  frequent: 'forest',
  new: 'sky',
} as const

type Column = {
  key: GuestSortKey
  label: string
  className?: string
}

const columns: Column[] = [
  { key: 'name', label: 'Guest' },
  { key: 'phone', label: 'Contact' },
  { key: 'totalStays', label: 'Stays', className: 'hidden md:table-cell' },
  { key: 'totalSpent', label: 'Total spent', className: 'hidden lg:table-cell' },
  { key: 'lastStay', label: 'Last stay', className: 'hidden sm:table-cell' },
]

export const GuestTable = ({ guests, sortKey, sortDir, onSort, onSelect }: GuestTableProps) => {
  if (guests.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No guests match these filters"
          description="Try clearing search or tag filters."
        />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-cream/85 backdrop-blur z-10">
          <tr className="text-left text-xs uppercase tracking-wide text-stone-500">
            {columns.map((col) => (
              <th key={col.key} className={cn('py-3 px-4 font-medium', col.className)}>
                <button
                  type="button"
                  onClick={() => onSort(col.key)}
                  className="inline-flex items-center gap-1 hover:text-forest-700"
                >
                  {col.label}
                  <ArrowUpDown
                    className={cn(
                      'w-3 h-3 opacity-60',
                      sortKey === col.key && 'opacity-100 text-forest-700'
                    )}
                  />
                  {sortKey === col.key && (
                    <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
            ))}
            <th className="py-3 px-4 font-medium hidden md:table-cell">Tags</th>
            <th className="py-3 px-4 font-medium text-right w-12" aria-label="Open" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {guests.map((guest) => (
            <tr
              key={guest.id}
              onClick={() => onSelect(guest)}
              className="cursor-pointer hover:bg-cream/40 transition-colors group"
            >
              <td className="py-3 px-4">
                <div className="flex items-center gap-3 min-w-[12rem]">
                  <Avatar name={guest.name} size="sm" color="#1E4D2B" />
                  <div className="min-w-0">
                    <p className="font-medium text-forest-700 truncate">{guest.name}</p>
                    <p className="text-xs text-stone-500 truncate inline-flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0" />
                      {guest.email || '—'}
                    </p>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <span className="text-forest-700 inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  {guest.phone || '—'}
                </span>
              </td>
              <td className="py-3 px-4 hidden md:table-cell">
                <span className="font-medium text-forest-700 tabular-nums">{guest.totalStays}</span>
              </td>
              <td className="py-3 px-4 hidden lg:table-cell whitespace-nowrap">
                <span className="font-medium text-forest-700">{formatBDT(guest.totalSpent)}</span>
              </td>
              <td className="py-3 px-4 hidden sm:table-cell whitespace-nowrap text-stone-600">
                {guest.lastStay ? formatShortDate(guest.lastStay) : '—'}
              </td>
              <td className="py-3 px-4 hidden md:table-cell">
                <GuestTagList tags={guest.tags} hasOverride={guest.hasTagOverride} />
              </td>
              <td className="py-3 px-4 text-right">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 group-hover:bg-stone-100 group-hover:text-forest-700">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const GuestTagList = ({
  tags,
  hasOverride,
}: {
  tags: GuestTag[]
  hasOverride: boolean
}) => (
  <div className="flex flex-wrap items-center gap-1 max-w-[14rem]">
    {tags.length === 0 ? (
      <span className="text-xs text-stone-400">—</span>
    ) : (
      tags.map((tag) => (
        <Badge key={tag} tone={tagToTone[tag]} size="sm">
          {tag}
        </Badge>
      ))
    )}
    {hasOverride && (
      <span title="Tags edited by admin" className="inline-flex text-violet-500">
        <Sparkles className="w-3 h-3" />
      </span>
    )}
  </div>
)
