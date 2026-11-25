import { useCallback, useEffect, useMemo, useState } from 'react'
import { History } from 'lucide-react'
import { Select } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { PageSkeleton } from '../ui/Skeleton'
import { EmptyRow, ExportButtons, FinanceNotice, Pager, Stat, TableShell, Td, Th } from '../finance/shared'
import { HOUSEKEEPING_CHANGED_EVENT, loadHousekeepingLog } from '../../../lib/housekeepingDb'
import { addDays, businessToday } from '../../../lib/finance/dates'
import type { ExportColumn } from '../../../utils/reportExport'
import { formatBookingId } from '../../../utils/bookingId'
import { roomCatalog } from '../../../data/roomCatalog'
import { useStaffData } from '../../hooks/useStaffData'
import {
  CLEANING_STATUS_LABELS,
  formatHousekeepingTime,
  resolveAssignee,
  summarizeCleanings,
} from '../../data/housekeeping'
import type { HousekeepingLogEntry, StaffMember } from '../../types'

type Range = '1' | '7' | '30' | '90'

const RANGE_LABELS: Record<Range, string> = {
  '1': 'Today',
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '90': 'Last 90 days',
}

const PAGE_SIZE = 50

const describeChange = (entry: HousekeepingLogEntry): string => {
  if (entry.event === 'assigned') return entry.assignedTo ? `Assigned to ${entry.assignedTo}` : 'Unassigned'
  const from = entry.fromStatus ? CLEANING_STATUS_LABELS[entry.fromStatus] : '—'
  const to = entry.toStatus ? CLEANING_STATUS_LABELS[entry.toStatus] : '—'
  return `${from} → ${to}`
}

const describeSource = (entry: HousekeepingLogEntry): string => {
  if (entry.reason === 'checkout') {
    return `Guest checked out${entry.bookingId ? ` (${formatBookingId(entry.bookingId)})` : ''}`
  }
  return entry.actorEmail ?? 'System'
}

const assigneeName = (entry: HousekeepingLogEntry, staff: StaffMember[]): string =>
  resolveAssignee(entry, staff).name ?? 'Unassigned'

export const HousekeepingHistory = () => {
  const { staff } = useStaffData()
  const [range, setRange] = useState<Range>('7')
  const [room, setRoom] = useState('')
  const [entries, setEntries] = useState<HousekeepingLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const today = businessToday()
  const fromDay = addDays(today, -(Number(range) - 1))

  const load = useCallback(async () => {
    const result = await loadHousekeepingLog(`${fromDay}T00:00:00+06:00`)
    setEntries(result.entries)
    setUnavailable(result.available ? null : result.message)
    setLoading(false)
  }, [fromDay])

  useEffect(() => {
    setLoading(true)
    void load()
    const onChange = () => void load()
    window.addEventListener(HOUSEKEEPING_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(HOUSEKEEPING_CHANGED_EVENT, onChange)
  }, [load])

  const filtered = useMemo(
    () => (room ? entries.filter((e) => e.roomId === room) : entries),
    [entries, room]
  )
  const summary = useMemo(() => summarizeCleanings(filtered, staff), [filtered, staff])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const logColumns: ExportColumn<HousekeepingLogEntry>[] = [
    { header: 'Time', value: (e) => formatHousekeepingTime(e.createdAt, ''), width: 20 },
    { header: 'Room', value: (e) => e.roomNumber, width: 8 },
    { header: 'Change', value: describeChange, width: 26 },
    { header: 'Assignee', value: (e) => assigneeName(e, staff), width: 20 },
    { header: 'Cleaning minutes', value: (e) => e.durationMinutes ?? null, width: 14 },
    { header: 'By', value: describeSource, width: 30 },
  ]
  const staffColumns: ExportColumn<(typeof summary.byStaff)[number]>[] = [
    { header: 'Staff', value: (s) => s.name, width: 24 },
    { header: 'Rooms cleaned', value: (s) => s.cleanings, total: true, width: 14 },
    { header: 'Timed cleanings', value: (s) => s.timedCleanings, total: true, width: 14 },
    { header: 'Total minutes', value: (s) => s.totalMinutes, total: true, width: 14 },
    { header: 'Average minutes', value: (s) => s.avgMinutes, width: 14 },
  ]

  if (unavailable) {
    return (
      <FinanceNotice title="Cleaning history is not available" tone="amber">
        {unavailable}
      </FinanceNotice>
    )
  }

  if (loading && filtered.length === 0) {
    return <PageSkeleton variant="stats" count={4} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={range} onChange={(e) => { setRange(e.target.value as Range); setPage(1) }} className="h-9 text-sm w-auto">
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <option key={r} value={r}>
                {RANGE_LABELS[r]}
              </option>
            ))}
          </Select>
          <Select value={room} onChange={(e) => { setRoom(e.target.value); setPage(1) }} className="h-9 text-sm w-auto">
            <option value="">All rooms</option>
            {roomCatalog.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.roomNumber}
              </option>
            ))}
          </Select>
        </div>
        <ExportButtons
          options={{
            title: 'Housekeeping history',
            filenameBase: `cherekh-housekeeping-${fromDay}-to-${today}`,
            period: `${fromDay} to ${today}`,
            filters: { Room: room ? `Room ${room}` : 'All rooms' },
          }}
          sheets={[
            { name: 'By staff', columns: staffColumns, rows: summary.byStaff },
            { name: 'Log', columns: logColumns, rows: filtered },
          ]}
          disabled={filtered.length === 0}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Rooms cleaned" value={summary.cleanings} hint={RANGE_LABELS[range]} />
        <Stat
          label="Average cleaning time"
          value={summary.avgMinutes !== null ? `${summary.avgMinutes} min` : '—'}
          hint="Start cleaning → Ready"
          tone="muted"
        />
        <Stat label="Checkouts flagged dirty" value={summary.checkoutsFlagged} tone="muted" />
        <Stat label="Cleaners" value={summary.byStaff.filter((s) => s.key !== 'unassigned').length} tone="muted" />
      </div>

      <TableShell>
        <thead>
          <tr>
            <Th>Staff</Th>
            <Th right>Rooms cleaned</Th>
            <Th right>Average time</Th>
            <Th right>Total time</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {summary.byStaff.length === 0 ? (
            <EmptyRow colSpan={4}>No rooms marked ready in this period.</EmptyRow>
          ) : (
            summary.byStaff.map((s) => (
              <tr key={s.key}>
                <Td className="font-medium text-forest-700">{s.name}</Td>
                <Td right>{s.cleanings}</Td>
                <Td right>{s.avgMinutes !== null ? `${s.avgMinutes} min` : '—'}</Td>
                <Td right>{s.timedCleanings ? `${s.totalMinutes} min` : '—'}</Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>

      <TableShell>
        <thead>
          <tr>
            <Th>Time</Th>
            <Th>Room</Th>
            <Th>Change</Th>
            <Th>Assignee</Th>
            <Th right>Took</Th>
            <Th>By</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {pageRows.length === 0 ? (
            <EmptyRow colSpan={6}>
              <span className="inline-flex items-center gap-2">
                <History className="w-4 h-4" /> No housekeeping activity in this period.
              </span>
            </EmptyRow>
          ) : (
            pageRows.map((entry) => (
              <tr key={entry.id}>
                <Td className="whitespace-nowrap text-stone-600">{formatHousekeepingTime(entry.createdAt, today)}</Td>
                <Td className="font-medium text-forest-700">{entry.roomNumber}</Td>
                <Td>
                  {entry.event === 'status' && entry.toStatus ? (
                    <span className="inline-flex items-center gap-1.5">
                      {describeChange(entry)}
                      {entry.reason === 'checkout' && <Badge tone="amber">Checkout</Badge>}
                    </span>
                  ) : (
                    describeChange(entry)
                  )}
                </Td>
                <Td>{assigneeName(entry, staff)}</Td>
                <Td right>{typeof entry.durationMinutes === 'number' ? `${entry.durationMinutes} min` : '—'}</Td>
                <Td className="text-stone-600">{describeSource(entry)}</Td>
              </tr>
            ))
          )}
        </tbody>
      </TableShell>
      <Pager page={currentPage} pages={pages} setPage={setPage} total={filtered.length} pageSize={PAGE_SIZE} />
    </div>
  )
}
