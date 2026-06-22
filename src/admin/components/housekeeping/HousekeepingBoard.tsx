import { useMemo, useState, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, ChevronDown, UserPlus, Inbox } from 'lucide-react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { CleaningStatusBadge } from '../ui/StatusBadge'
import { Select } from '../ui/Input'
import { EmptyState } from '../ui/EmptyState'
import { useToast } from '../ui/Toast'
import { notifyAdminOfManagerAction } from '../../../lib/adminNotifications'
import { notifyHousekeepingChanged } from '../../../lib/housekeepingDb'
import { useHousekeepingData } from '../../hooks/useHousekeepingData'
import { useStaffData } from '../../hooks/useStaffData'
import { cn } from '../../utils/cn'
import type { CleaningStatus, HousekeepingTask } from '../../types'

const columns: Array<{ id: CleaningStatus; title: string; accent: string }> = [
  { id: 'dirty', title: 'Dirty rooms', accent: 'border-amber-200 bg-amber-50/40' },
  { id: 'cleaning', title: 'In progress', accent: 'border-sky-200 bg-sky-50/40' },
  { id: 'ready', title: 'Ready', accent: 'border-forest-200 bg-forest-50/40' },
]

export const HousekeepingBoard = () => {
  const toast = useToast()
  const { staff } = useStaffData()
  const { tasks, loading, saveTask } = useHousekeepingData()
  const housekeepingStaff = useMemo(
    () => staff.filter((s) => s.role.toLowerCase().includes('housekeep')),
    [staff]
  )
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [hoverCol, setHoverCol] = useState<CleaningStatus | null>(null)

  const byColumn = useMemo(() => {
    const result: Record<CleaningStatus, HousekeepingTask[]> = { dirty: [], cleaning: [], ready: [] }
    tasks.forEach((t) => result[t.status].push(t))
    Object.keys(result).forEach((k) =>
      result[k as CleaningStatus].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
    )
    return result
  }, [tasks])

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
    if (!dragTaskId) return

    const room = tasks.find((t) => t.id === dragTaskId)
    if (!room || room.status === status) {
      setDragTaskId(null)
      return
    }

    const updates: Partial<HousekeepingTask> = { status }
    if (status === 'cleaning' && !room.startedAt) updates.startedAt = new Date().toISOString()
    if (status === 'ready' && !room.completedAt) updates.completedAt = new Date().toISOString()

    const nextTask = { ...room, ...updates }
    const synced = await saveTask(nextTask)

    if (synced) {
      notifyHousekeepingChanged()
      toast.success(`Room ${room.roomNumber} → ${status}`)
      void notifyAdminOfManagerAction({
        category: 'housekeeping',
        action: 'housekeeping.status',
        title: 'Housekeeping status changed',
        message: `Room ${room.roomNumber}: ${room.status} → ${status}`,
        entityId: room.id,
      })
    } else {
      toast.error('Could not save', 'Run migration 014 in Supabase and try again.')
    }

    setDragTaskId(null)
  }

  const assign = async (taskId: string, name: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const nextTask = { ...task, assignedTo: name || undefined }
    const synced = await saveTask(nextTask)

    if (synced && name) {
      notifyHousekeepingChanged()
      void notifyAdminOfManagerAction({
        category: 'housekeeping',
        action: 'housekeeping.assigned',
        title: 'Housekeeping assigned',
        message: `Room ${task.roomNumber} assigned to ${name}`,
        entityId: task.id,
      })
    } else if (!synced) {
      toast.error('Could not save assignment', 'Check Supabase connection and migration 014.')
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/80 px-6 py-12 text-center text-sm text-stone-500">
        Loading housekeeping board…
      </div>
    )
  }

  return (
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
                description="Drag a task to update its status."
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
                      <Card
                        draggable
                        onDragStart={onDragStart(task.id)}
                        className={cn(
                          'p-4 cursor-grab active:cursor-grabbing',
                          dragTaskId === task.id && 'ring-2 ring-forest-400 ring-offset-2'
                        )}
                        padded={false}
                      >
                        <div>
                          <p className="font-medium text-forest-700">Room {task.roomNumber}</p>
                          <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                            <Timer className="w-3 h-3" />
                            {task.estimatedMinutes > 0 ? `${task.estimatedMinutes} min` : 'Just done'}
                          </p>
                        </div>

                        {task.notes && (
                          <p className="mt-2 text-xs text-stone-600 leading-relaxed bg-cream/70 rounded-lg px-2.5 py-1.5">
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
                              value={task.assignedTo ?? ''}
                              onChange={(e) => void assign(task.id, e.target.value)}
                              className="h-9 text-xs pr-8"
                            >
                              <option value="">Unassigned</option>
                              {housekeepingStaff.map((s) => (
                                <option key={s.id} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </Select>
                            <ChevronDown className="w-3 h-3 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </Card>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        )
      })}
    </div>
  )
}
