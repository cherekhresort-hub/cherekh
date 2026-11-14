import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timer,
  ChevronDown,
  UserPlus,
  Inbox,
  Pencil,
  Play,
  CheckCircle2,
  RotateCcw,
  LogIn,
  LogOut,
  BedDouble,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { CleaningStatusBadge } from '../ui/StatusBadge'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { EmptyState } from '../ui/EmptyState'
import { useToast } from '../ui/Toast'
import { notifyAdminOfManagerAction } from '../../../lib/adminNotifications'
import { notifyHousekeepingChanged } from '../../../lib/housekeepingDb'
import { businessToday } from '../../../lib/finance/dates'
import { formatBookingId } from '../../../utils/bookingId'
import { useHousekeepingData } from '../../hooks/useHousekeepingData'
import { useHighlightParam } from '../../hooks/useFlashHighlight'
import { useStaffData } from '../../hooks/useStaffData'
import { useBookingsData } from '../../hooks/useBookingsData'
import { currentStaff } from '../../data/staff'
import {
  CLEANING_STATUS_LABELS,
  applyStatusChange,
  compareHousekeepingTasks,
  formatHousekeepingTime,
  minutesBetween,
  resolveAssignee,
  roomGuestContext,
  type RoomGuestContext,
} from '../../data/housekeeping'
import { cn } from '../../utils/cn'
import type { CleaningPriority, CleaningStatus, HousekeepingTask, StaffMember } from '../../types'

const columns: Array<{ id: CleaningStatus; title: string; accent: string }> = [
  { id: 'dirty', title: 'Dirty rooms', accent: 'border-amber-200 bg-amber-50/40' },
  { id: 'cleaning', title: 'In progress', accent: 'border-sky-200 bg-sky-50/40' },
  { id: 'ready', title: 'Ready', accent: 'border-forest-200 bg-forest-50/40' },
]

const PRIORITY_TONE: Record<CleaningPriority, 'red' | 'amber' | 'neutral'> = {
  high: 'red',
  medium: 'amber',
  low: 'neutral',
}

const formatMinutes = (minutes: number): string =>
  minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`

const useMinuteTick = (): Date => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export const HousekeepingBoard = () => {
  const toast = useToast()
  const { staff } = useStaffData()
  const { bookings } = useBookingsData()
  const { tasks, loading, saveTask } = useHousekeepingData()
  useHighlightParam(!loading)
  const now = useMinuteTick()
  const today = businessToday(now)

  const housekeepingStaff = useMemo(
    () => currentStaff(staff).filter((s) => s.role.toLowerCase().includes('housekeep')),
    [staff]
  )
  const guests = useMemo(() => roomGuestContext(bookings, today), [bookings, today])
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [hoverCol, setHoverCol] = useState<CleaningStatus | null>(null)
  const [editing, setEditing] = useState<HousekeepingTask | null>(null)

  const byColumn = useMemo(() => {
    const result: Record<CleaningStatus, HousekeepingTask[]> = { dirty: [], cleaning: [], ready: [] }
    tasks.forEach((t) => result[t.status].push(t))
    Object.values(result).forEach((list) => list.sort(compareHousekeepingTasks))
    return result
  }, [tasks])

  const moveTo = async (task: HousekeepingTask, status: CleaningStatus) => {
    if (task.status === status) return
    const synced = await saveTask(applyStatusChange(task, status))
    if (synced) {
      notifyHousekeepingChanged()
      toast.success(`Room ${task.roomNumber} → ${CLEANING_STATUS_LABELS[status]}`)
      void notifyAdminOfManagerAction({
        category: 'housekeeping',
        action: 'housekeeping.status',
        title: 'Housekeeping status changed',
        message: `Room ${task.roomNumber}: ${task.status} → ${status}`,
        entityId: task.id,
      })
    } else {
      toast.error('Could not save', 'Check your connection and try again.')
    }
  }

  const onDragStart = (id: string) => (e: DragEvent<HTMLDivElement>) => {
    setDragTaskId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (status: CleaningStatus) => (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setHoverCol(status)
  }

  const onDrop = (status: CleaningStatus) => async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setHoverCol(null)
    const task = tasks.find((t) => t.id === dragTaskId)
    setDragTaskId(null)
    if (task) await moveTo(task, status)
  }

  const assign = async (task: HousekeepingTask, staffId: string) => {
    const member = staff.find((s) => s.id === staffId)
    const nextTask: HousekeepingTask = {
      ...task,
      assignedStaffId: member?.id,
      assignedTo: member?.name,
    }
    const synced = await saveTask(nextTask)

    if (synced && member) {
      notifyHousekeepingChanged()
      void notifyAdminOfManagerAction({
        category: 'housekeeping',
        action: 'housekeeping.assigned',
        title: 'Housekeeping assigned',
        message: `Room ${task.roomNumber} assigned to ${member.name}`,
        entityId: task.id,
      })
    } else if (synced) {
      notifyHousekeepingChanged()
    } else {
      toast.error('Could not save assignment', 'Check your connection and try again.')
    }
  }

  const saveDetails = async (task: HousekeepingTask, details: Pick<HousekeepingTask, 'priority' | 'estimatedMinutes' | 'notes'>) => {
    const synced = await saveTask({ ...task, ...details })
    if (!synced) {
      toast.error('Could not save room details', 'Check your connection and try again.')
      return false
    }
    notifyHousekeepingChanged()
    toast.success(`Room ${task.roomNumber} updated`)
    return true
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/80 px-6 py-12 text-center text-sm text-stone-500">
        Loading housekeeping board…
      </div>
    )
  }

  return (
    <>
      <div className="-mx-1 px-1 flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
        {columns.map((col) => {
          const items = byColumn[col.id]
          const isHover = hoverCol === col.id
          return (
            <div
              key={col.id}
              onDragOver={onDragOver(col.id)}
              onDragLeave={() => setHoverCol(null)}
              onDrop={onDrop(col.id)}
              className={cn(
                'min-w-[18rem] sm:min-w-[20rem] lg:min-w-0',
                'rounded-2xl border-2 border-dashed transition-colors min-h-[12rem] p-3',
                col.accent,
                isHover && 'border-forest-400 bg-forest-50/70'
              )}
            >
              <div className="flex items-center justify-between px-2 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-forest-700">{col.title}</h3>
                  <Badge tone="neutral">{items.length}</Badge>
                </div>
                <CleaningStatusBadge status={col.id} />
              </div>

              {items.length === 0 ? (
                <EmptyState
                  title="Nothing here"
                  description="Use the buttons on a room card, or drag it here."
                  icon={<Inbox className="w-4 h-4" />}
                  className="bg-white/70"
                />
              ) : (
                <ul className="space-y-2.5">
                  <AnimatePresence>
                    {items.map((task) => (
                      <motion.li
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                      >
                        <TaskCard
                          task={task}
                          staff={staff}
                          housekeepingStaff={housekeepingStaff}
                          guest={guests.get(task.roomId)}
                          now={now}
                          today={today}
                          dragging={dragTaskId === task.id}
                          onDragStart={onDragStart(task.id)}
                          onMove={(status) => void moveTo(task, status)}
                          onAssign={(staffId) => void assign(task, staffId)}
                          onEdit={() => setEditing(task)}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <TaskEditModal task={editing} onClose={() => setEditing(null)} onSave={saveDetails} />
    </>
  )
}

const TaskCard = ({
  task,
  staff,
  housekeepingStaff,
  guest,
  now,
  today,
  dragging,
  onDragStart,
  onMove,
  onAssign,
  onEdit,
}: {
  task: HousekeepingTask
  staff: StaffMember[]
  housekeepingStaff: StaffMember[]
  guest?: RoomGuestContext
  now: Date
  today: string
  dragging: boolean
  onDragStart: (e: DragEvent<HTMLDivElement>) => void
  onMove: (status: CleaningStatus) => void
  onAssign: (staffId: string) => void
  onEdit: () => void
}) => {
  const assignee = resolveAssignee(task, staff)
  const listedIds = new Set(housekeepingStaff.map((s) => s.id))
  const showExtraOption = Boolean(assignee.name) && (!assignee.staffId || !listedIds.has(assignee.staffId))
  const selectValue = assignee.staffId ?? (assignee.name ? '__saved__' : '')
  const nowIso = now.toISOString()

  let timing: string | null = null
  if (task.status === 'cleaning' && task.startedAt) {
    const elapsed = minutesBetween(task.startedAt, nowIso) ?? 0
    timing = `Started ${formatHousekeepingTime(task.startedAt, today)} · ${formatMinutes(elapsed)} so far`
  } else if (task.status === 'ready' && task.completedAt) {
    const took = minutesBetween(task.startedAt, task.completedAt)
    timing = `Ready since ${formatHousekeepingTime(task.completedAt, today)}${took !== null ? ` · took ${formatMinutes(took)}` : ''}`
  } else if (task.status === 'dirty' && task.updatedAt) {
    timing = `Dirty since ${formatHousekeepingTime(task.updatedAt, today)}`
  }

  const unreadyArrival = guest?.arriving && task.status !== 'ready'

  return (
    <Card
      draggable
      data-highlight-id={task.id}
      onDragStart={onDragStart}
      className={cn(
        'p-4 cursor-grab active:cursor-grabbing',
        dragging && 'ring-2 ring-forest-400 ring-offset-2',
        unreadyArrival && 'ring-1 ring-red-300'
      )}
      padded={false}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-forest-700 flex items-center gap-2">
            Room {task.roomNumber}
            {task.priority !== 'medium' && (
              <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority === 'high' ? 'High' : 'Low'}</Badge>
            )}
          </p>
          <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
            <Timer className="w-3 h-3" />
            Est. {task.estimatedMinutes} min
          </p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 -m-1 rounded-lg text-stone-400 hover:text-forest-700 hover:bg-stone-100"
          aria-label={`Edit room ${task.roomNumber} priority and notes`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {(guest?.arriving || guest?.departing || guest?.inHouse) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {guest.arriving && (
            <Badge tone={unreadyArrival ? 'red' : 'sky'} icon={<LogIn />}>
              Arriving today · {formatBookingId(guest.arriving.id)}
            </Badge>
          )}
          {guest.departing && (
            <Badge tone="amber" icon={<LogOut />}>
              Departing today
            </Badge>
          )}
          {guest.inHouse && (
            <Badge tone="neutral" icon={<BedDouble />}>
              Guest in room
            </Badge>
          )}
        </div>
      )}

      {timing && <p className="mt-2 text-xs text-stone-600">{timing}</p>}

      {task.notes && (
        <p className="mt-2 text-xs text-stone-600 leading-relaxed bg-cream/70 rounded-lg px-2.5 py-1.5 whitespace-pre-line">
          {task.notes}
        </p>
      )}

      <div className="mt-3">
        <label className="text-[10px] uppercase tracking-wide text-stone-500 flex items-center gap-1 mb-1">
          <UserPlus className="w-3 h-3" />
          Assignee
        </label>
        <div className="relative">
          <Select
            value={selectValue}
            onChange={(e) => onAssign(e.target.value)}
            className="h-9 text-xs pr-8"
          >
            <option value="">Unassigned</option>
            {showExtraOption && (
              <option value={assignee.staffId ?? '__saved__'} disabled>
                {assignee.name}
                {assignee.former ? ' (no longer on team)' : ''}
              </option>
            )}
            {housekeepingStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <ChevronDown className="w-3 h-3 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.status === 'dirty' && (
          <>
            <Button size="sm" leftIcon={<Play className="w-3.5 h-3.5" />} onClick={() => onMove('cleaning')}>
              Start cleaning
            </Button>
            <Button size="sm" variant="outline" leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => onMove('ready')}>
              Ready
            </Button>
          </>
        )}
        {task.status === 'cleaning' && (
          <>
            <Button size="sm" leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => onMove('ready')}>
              Mark ready
            </Button>
            <Button size="sm" variant="outline" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => onMove('dirty')}>
              Back to dirty
            </Button>
          </>
        )}
        {task.status === 'ready' && (
          <Button size="sm" variant="outline" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => onMove('dirty')}>
            Mark dirty
          </Button>
        )}
      </div>
    </Card>
  )
}

const TaskEditModal = ({
  task,
  onClose,
  onSave,
}: {
  task: HousekeepingTask | null
  onClose: () => void
  onSave: (
    task: HousekeepingTask,
    details: Pick<HousekeepingTask, 'priority' | 'estimatedMinutes' | 'notes'>
  ) => Promise<boolean>
}) => {
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const [priority, setPriority] = useState<CleaningPriority>('medium')
  const [minutes, setMinutes] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  if (task && openedFor !== task.id) {
    setOpenedFor(task.id)
    setPriority(task.priority)
    setMinutes(String(task.estimatedMinutes))
    setNotes(task.notes ?? '')
  }
  if (!task && openedFor !== null) setOpenedFor(null)

  const parsedMinutes = Number(minutes)
  const minutesValid = minutes.trim() !== '' && Number.isFinite(parsedMinutes) && parsedMinutes >= 0 && parsedMinutes <= 600

  const submit = async () => {
    if (!task || !minutesValid) return
    setSaving(true)
    const ok = await onSave(task, {
      priority,
      estimatedMinutes: Math.round(parsedMinutes),
      notes: notes.trim() || undefined,
    })
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Modal
      open={Boolean(task)}
      onClose={onClose}
      title={task ? `Room ${task.roomNumber}` : ''}
      description="Priority, cleaning time estimate and notes for housekeeping."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => void submit()} loading={saving} disabled={!minutesValid}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Priority">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as CleaningPriority)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </Field>
        <Field label="Estimated minutes" error={minutesValid ? undefined : 'Enter 0–600 minutes'}>
          <Input type="number" min={0} max={600} inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        <Field label="Notes" hint="e.g. extra towels, broken lamp, deep clean needed">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
