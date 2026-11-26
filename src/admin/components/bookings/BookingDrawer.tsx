import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Mail,
  Phone,
  Users,
  Trash2,
  CheckCircle2,
  LogOut,
  XCircle,
  ClipboardList,
  Save,
  Wallet,
  IdCard,
  FileText,
  Hash,
  Moon,
  StickyNote,
  MessageSquare,
  Sparkles,
  Receipt,
  ArrowRight,
  UtensilsCrossed,
  BedDouble,
  Lock,
  Pencil,
} from 'lucide-react'
import { Drawer } from '../ui/Drawer'
import { BookingStatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Field, Select, Textarea } from '../ui/Input'
import { Card } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { PageSkeleton, Skeleton } from '../ui/Skeleton'
import { GuestDetailsSection } from './GuestDetailsSection'
import { PaymentSection } from './PaymentSection'
import { ExtraChargesSection } from './ExtraChargesSection'
import { BookingActions } from './BookingActions'
import { EditBookingRoomsModal } from './EditBookingRoomsModal'
import { EditBookingDatesModal } from './EditBookingDatesModal'
import { confirmDelete } from '../../utils/confirmDelete'
import { explainBookingUnavailable } from '../../utils/roomAvailabilityMessage'
import {
  addBookingNote,
  deleteBookingNote,
  setBookingNoteCompleted,
  updateBookingNote,
  bookingGuestHidden,
  bookingMoneyHidden,
  computeBookingFinancials,
  deleteBooking,
  getBookingRooms,
  DATE_CHANGE_STATUSES,
  ROOM_CHANGE_STATUSES,
  updateBookingStatus,
  type Booking,
  type BookingCreator,
  type BookingNote,
} from '../../../utils/bookings'
import { bookingCreatorLabel } from '../../utils/bookingCreator'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { isBookingDetailLoaded } from '../../../lib/bookingsStore'
import {
  roleCanChangeBookingRooms,
  roleCanManageBills,
  roleCanModifyBooking,
} from '../../../lib/roles'
import { formatDateTime, formatShortDate } from '../../utils/date'
import { parseRoomLabel } from '../../utils/roomLabel'
import { formatBookingId } from '../../../utils/bookingId'
import { formatBDT, initialsOf } from '../../utils/format'
import {
  getArrivalTimeLabel,
  getBookingArrivalTime,
  getBookingEventTimeline,
  bookingIsConferenceOnly,
  formatEventDatesDisplay,
  getBookingDurationCount,
  getBookingEventDates,
  isFoodOnlyBooking,
} from '../../../utils/bookingHelpers'
import { cn } from '../../utils/cn'
import { useFlashHighlight } from '../../hooks/useFlashHighlight'
import { useHousekeepingData } from '../../hooks/useHousekeepingData'
import { CLEANING_STATUS_LABELS, roomsNotReadyForArrival } from '../../data/housekeeping'
import { businessToday } from '../../../lib/finance/dates'
import {
  BOOKING_HIGHLIGHT,
  BOOKING_TAB_FALLBACK,
  type BookingDrawerTab,
} from '../../../lib/activityNavigation'

type TabKey = BookingDrawerTab

/** Opens a tab and highlights rows when the drawer is reached from an activity link. */
export type BookingDrawerFocus = {
  bookingId: string
  tab: TabKey
  highlight: string[]
  key: number
}

interface BookingDrawerProps {
  booking: Booking | null
  detailLoading?: boolean
  onClose: () => void
  onChanged: () => void
  onRetryLoad?: () => void | Promise<void>
  bookedBy?: BookingCreator
  focus?: BookingDrawerFocus | null
}

export const BookingDrawer = ({
  booking,
  detailLoading = false,
  onClose,
  onChanged,
  onRetryLoad,
  bookedBy,
  focus,
}: BookingDrawerProps) => {
  const toast = useToast()
  const { canDelete, role, user } = useAuth()
  const { tasks: housekeepingTasks } = useHousekeepingData({
    enabled: Boolean(booking) && (role === 'admin' || role === 'manager'),
  })
  const [tab, setTab] = useState<TabKey>('overview')
  const [note, setNote] = useState('')
  const [roomsModalOpen, setRoomsModalOpen] = useState(false)
  const [datesModalOpen, setDatesModalOpen] = useState(false)
  const shownDetailFor = useRef<string | null>(null)
  const focusTabApplied = useRef<number | null>(null)
  const focusHighlighted = useRef<number | null>(null)
  const { start: startHighlight, clear: clearHighlight } = useFlashHighlight()
  const focusForBooking = focus && booking && focus.bookingId === booking.id ? focus : null
  const detailLoaded = booking ? isBookingDetailLoaded(booking.id) : false

  useEffect(() => {
    setNote('')
    setTab('overview')
    setRoomsModalOpen(false)
    setDatesModalOpen(false)
    clearHighlight()
  }, [booking?.id, clearHighlight])

  useEffect(() => {
    if (!focusForBooking || focusTabApplied.current === focusForBooking.key) return
    focusTabApplied.current = focusForBooking.key
    setTab(focusForBooking.tab)
  }, [focusForBooking])

  useEffect(() => {
    if (!focusForBooking || !detailLoaded || focusHighlighted.current === focusForBooking.key) return
    focusHighlighted.current = focusForBooking.key
    startHighlight(focusForBooking.highlight, { fallback: BOOKING_TAB_FALLBACK[focusForBooking.tab] })
  }, [focusForBooking, detailLoaded, startHighlight])

  const fin = useMemo(
    () => (booking ? computeBookingFinancials(booking) : null),
    [booking]
  )
  const nights = useMemo(
    () => (booking ? getBookingDurationCount(booking) : 0),
    [booking]
  )
  const isConferenceOnly = booking ? bookingIsConferenceOnly(booking) : false
  const foodOnly = booking ? isFoodOnlyBooking(booking) : false
  const eventDatesLabel = booking ? formatEventDatesDisplay(getBookingEventDates(booking)) : ''

  if (!booking) return <Drawer open={false} onClose={onClose}>{null}</Drawer>

  const detailReady = isBookingDetailLoaded(booking.id)
  const initialLoad = detailLoading && !detailReady
  // A background refresh can mark a shown booking stale; keep its detail on screen
  // (and any open forms mounted) while the fresh copy loads.
  if (detailReady) shownDetailFor.current = booking.id
  const keepShowing = shownDetailFor.current === booking.id

  if (!keepShowing && (!detailReady || initialLoad)) {
    const failed = !detailLoading && !detailReady
    return (
      <Drawer open onClose={onClose} title={failed ? 'Could not load booking' : 'Loading booking'} width="lg">
        {failed ? (
          <div className="px-6 py-16 text-center space-y-4">
            <p className="text-sm text-stone-500">
              Full booking details could not be loaded. Check your connection and staff login, then try again.
            </p>
            {onRetryLoad && (
              <Button variant="outline" onClick={() => void onRetryLoad()}>
                Try again
              </Button>
            )}
          </div>
        ) : (
          <div className="px-6 py-6 space-y-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
            <PageSkeleton variant="form" />
          </div>
        )}
      </Drawer>
    )
  }

  if (!fin) return <Drawer open={false} onClose={onClose}>{null}</Drawer>

  const lines = getBookingRooms(booking)
  const unreadyRooms = roomsNotReadyForArrival(booking, housekeepingTasks, businessToday())
  const readOnly = !roleCanModifyBooking(role, user?.email, booking)
  const billsReadOnly = readOnly || !roleCanManageBills(role)
  const canChangeRooms =
    !readOnly &&
    detailLoaded &&
    roleCanChangeBookingRooms(role) &&
    ROOM_CHANGE_STATUSES.includes(booking.status) &&
    !bookingIsConferenceOnly(booking) &&
    !foodOnly
  const canChangeDates =
    !readOnly &&
    detailLoaded &&
    roleCanChangeBookingRooms(role) &&
    DATE_CHANGE_STATUSES.includes(booking.status)

  const setStatus = async (status: Booking['status'], label: string) => {
    const updated = await updateBookingStatus(booking.id, status)
    if (!updated) {
      toast.error('Could not update status', await explainBookingUnavailable(booking))
      return
    }
    toast.success(`Booking ${label}`, booking.name)
    onChanged()
  }

  const changeStatusInline = async (status: Booking['status']) => {
    if (status === booking.status) return
    const updated = await updateBookingStatus(booking.id, status)
    if (!updated) {
      toast.error('Could not update status', await explainBookingUnavailable(booking))
      return
    }
    toast.success('Status updated', status)
    onChanged()
  }

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error('Permission denied', 'Managers cannot delete bookings.')
      return
    }
    if (!(await confirmDelete({
      title: 'Delete booking?',
      text: 'Delete this booking? This cannot be undone.',
    }))) return
    const ok = await deleteBooking(booking.id)
    if (!ok) {
      toast.error('Could not delete booking')
      return
    }
    toast.success('Booking deleted')
    onChanged()
    onClose()
  }

  const canEditNotes = roleCanManageBills(role) && detailLoaded

  const saveNote = async () => {
    if (!note.trim()) return
    await addBookingNote(booking.id, note.trim())
    setNote('')
    toast.success('Internal note added')
    onChanged()
  }

  const editNote = async (noteId: string, text: string) => {
    if (!canEditNotes) return false
    const updated = await updateBookingNote(booking.id, noteId, text)
    if (!updated) {
      toast.error('Could not update note')
      return false
    }
    toast.success('Note updated')
    onChanged()
    return true
  }

  const toggleNoteCompleted = async (noteId: string, completed: boolean) => {
    if (!canEditNotes) return
    const updated = await setBookingNoteCompleted(booking.id, noteId, completed)
    if (!updated) {
      toast.error(completed ? 'Could not mark note complete' : 'Could not reopen note')
      return
    }
    toast.success(completed ? 'Note marked complete' : 'Note reopened')
    onChanged()
  }

  const removeNote = async (noteId: string) => {
    if (!canDelete) return
    if (!(await confirmDelete({
      title: 'Delete note?',
      text: 'Remove this internal note? It stays in the activity log.',
    }))) return
    const updated = await deleteBookingNote(booking.id, noteId)
    if (!updated) {
      toast.error('Could not delete note')
      return
    }
    toast.success('Note deleted')
    onChanged()
  }

  const moneyHidden = bookingMoneyHidden(booking)
  const guestHidden = bookingGuestHidden(booking)
  const tabHidden =
    (moneyHidden && (tab === 'payment' || tab === 'bills')) || (guestHidden && tab === 'guests')
  const activeTab: TabKey = tabHidden ? 'overview' : tab
  const noteCount = (booking.notes ?? []).filter((n) => !n.completed).length
  const extraCount = booking.extras?.length ?? 0
  const filledGuestCount = (booking.guests ?? []).filter(
    (g) => g.idNumber || g.idType !== 'nid'
  ).length

  const header = (
    <div className="bg-gradient-to-br from-forest-700 via-forest-700 to-teal-700 text-white px-6 pt-6 pb-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 inline-flex items-center justify-center font-serif text-xl text-white shrink-0">
          {initialsOf(booking.name)}
        </div>
        <div className="flex-1 min-w-0 pr-10">
          <div className="flex items-center gap-2 mb-1">
            <BookingStatusBadge status={booking.status} />
            <span className="inline-flex items-center gap-1 text-xs text-white/70">
              <Hash className="w-3 h-3" />
              {formatBookingId(booking.id)}
            </span>
          </div>
          <h2 className="font-serif text-2xl text-white leading-tight truncate">
            {booking.name}
          </h2>
          <p className="text-sm text-white/70 mt-0.5 truncate">
            {foodOnly
              ? 'Food bill · Walk-in'
              : lines
                  .map((line) => {
                    const parsed = parseRoomLabel(line.roomName)
                    return parsed.number ? `${parsed.number} · ${parsed.bed}` : parsed.bed
                  })
                  .join('  ·  ')}
          </p>
          <p className="text-xs text-white/60 mt-1 truncate">
            Booked {formatDateTime(booking.createdAt)}
            {bookedBy ? ` by ${bookingCreatorLabel(bookedBy)}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-5">
        <HeaderStat
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          label={foodOnly ? 'Service date' : isConferenceOnly ? 'Event dates' : 'Check-in'}
          value={
            foodOnly
              ? formatShortDate(booking.checkIn)
              : isConferenceOnly
                ? eventDatesLabel || formatShortDate(booking.checkIn)
                : formatShortDate(booking.checkIn)
          }
        />
        <HeaderStat
          icon={<Moon className="w-3.5 h-3.5" />}
          label={foodOnly ? 'Type' : isConferenceOnly ? 'Event days' : 'Nights'}
          value={foodOnly ? 'Food' : `${nights}`}
        />
        <HeaderStat
          icon={<Users className="w-3.5 h-3.5" />}
          label="Guests"
          value={`${booking.totalGuests}`}
        />
        {moneyHidden ? (
          <HeaderStat icon={<Lock className="w-3.5 h-3.5" />} label="Payment" value="Hidden" />
        ) : (
          <HeaderStat
            icon={<Wallet className="w-3.5 h-3.5" />}
            label={fin.outstanding > 0 ? 'Outstanding' : 'Total'}
            value={formatBDT(fin.outstanding > 0 ? fin.outstanding : fin.total)}
            accent={fin.outstanding > 0 ? 'warning' : 'default'}
          />
        )}
      </div>
    </div>
  )

  const toolbar = (
    <Tabs<TabKey>
      layoutId="booking-drawer-tabs"
      value={activeTab}
      onChange={setTab}
      className="w-full justify-start flex-wrap"
      items={[
        { value: 'overview', label: <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Overview</span> },
        ...(moneyHidden
          ? []
          : [
              { value: 'payment' as const, label: <span className="inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Payment</span> },
              { value: 'bills' as const, label: <span className="inline-flex items-center gap-1.5"><UtensilsCrossed className="w-3.5 h-3.5" /> Bills</span>, count: extraCount || undefined },
            ]),
        ...(guestHidden
          ? []
          : [{ value: 'guests' as const, label: <span className="inline-flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" /> Guests</span>, count: filledGuestCount || undefined }]),
        { value: 'notes', label: <span className="inline-flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Notes</span>, count: noteCount || undefined },
      ]}
    />
  )

  return (
    <Drawer
      open={!!booking}
      onClose={onClose}
      width="xl"
      header={header}
      toolbar={toolbar}
      contentPadding={false}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          {canDelete ? (
            <Button
              variant="ghost"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleDelete}
              className="text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          ) : (
            <span className="text-xs text-stone-400 px-1">
              {readOnly ? 'View only' : role === 'manager' ? 'View & edit only (manager)' : 'View & edit'}
            </span>
          )}
          {!readOnly && (
          <div className="flex flex-wrap gap-2">
            {booking.status === 'pending' && (
              <Button
                variant="primary"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => setStatus('confirmed', 'confirmed')}
              >
                Confirm
              </Button>
            )}
            {booking.status === 'confirmed' && (
              <Button
                variant="secondary"
                leftIcon={<LogOut className="w-4 h-4" />}
                onClick={() => setStatus('checked-out', 'checked out')}
              >
                Check out
              </Button>
            )}
            {booking.status !== 'cancelled' && (
              <Button
                variant="outline"
                leftIcon={<XCircle className="w-4 h-4" />}
                onClick={() => setStatus('cancelled', 'cancelled')}
              >
                Cancel
              </Button>
            )}
          </div>
          )}
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="px-6 py-5"
        >
          {readOnly && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              View only. Booking officers can change only the bookings they created.
            </p>
          )}
          {activeTab === 'overview' && unreadyRooms.length > 0 && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                Arriving today, but{' '}
                {unreadyRooms
                  .map((task) => `Room ${task.roomNumber} is ${CLEANING_STATUS_LABELS[task.status].toLowerCase()}`)
                  .join(', ')}
                .
              </span>
              <Link to="/admin/housekeeping" className="font-medium underline underline-offset-2">
                Open housekeeping
              </Link>
            </div>
          )}
          {activeTab === 'overview' && (
            <OverviewTab
              booking={booking}
              lines={lines}
              nights={nights}
              isConferenceOnly={isConferenceOnly}
              foodOnly={foodOnly}
              eventDatesLabel={eventDatesLabel}
              onChangeStatus={changeStatusInline}
              onChangeRooms={canChangeRooms ? () => setRoomsModalOpen(true) : undefined}
              onChangeDates={canChangeDates ? () => setDatesModalOpen(true) : undefined}
              readOnly={readOnly}
            />
          )}
          {canChangeRooms && (
            <EditBookingRoomsModal
              open={roomsModalOpen}
              booking={booking}
              onClose={() => setRoomsModalOpen(false)}
              onSaved={() => onChanged()}
            />
          )}
          {canChangeDates && (
            <EditBookingDatesModal
              open={datesModalOpen}
              booking={booking}
              onClose={() => setDatesModalOpen(false)}
              onSaved={() => onChanged()}
            />
          )}
          {activeTab === 'payment' && <PaymentSection booking={booking} onChanged={onChanged} readOnly={readOnly} />}
          {activeTab === 'bills' && (
            <ExtraChargesSection booking={booking} onChanged={onChanged} readOnly={billsReadOnly} />
          )}
          {activeTab === 'guests' && (
            <div data-highlight-id={BOOKING_HIGHLIGHT.guests} className="rounded-2xl">
              <GuestDetailsSection booking={booking} onSaved={onChanged} readOnly={readOnly} />
            </div>
          )}
          {activeTab === 'notes' && (
            <NotesTab
              booking={booking}
              note={note}
              onChangeNote={setNote}
              onSave={saveNote}
              onEdit={canEditNotes ? editNote : undefined}
              onToggleComplete={canEditNotes ? toggleNoteCompleted : undefined}
              onDelete={canDelete && detailLoaded ? removeNote : undefined}
              readOnly={readOnly}
            />
          )}
          <p className="mt-6 text-xs text-stone-400 inline-flex items-center gap-1.5">
            <StickyNote className="w-3 h-3" /> Updated {formatDateTime(booking.updatedAt)}
          </p>
        </motion.div>
      </AnimatePresence>
    </Drawer>
  )
}

const HeaderStat = ({
  icon,
  label,
  value,
  accent = 'default',
}: {
  icon: React.ReactNode
  label: string
  value: string
  accent?: 'default' | 'warning'
}) => (
  <div
    className={cn(
      'rounded-xl px-2.5 py-2 border backdrop-blur-sm',
      accent === 'warning'
        ? 'bg-amber-300/20 border-amber-200/40'
        : 'bg-white/10 border-white/15'
    )}
  >
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-white/70">
      {icon}
      {label}
    </span>
    <p className="font-serif text-base text-white mt-0.5 truncate">{value}</p>
  </div>
)

interface OverviewTabProps {
  booking: Booking
  lines: ReturnType<typeof getBookingRooms>
  nights: number
  isConferenceOnly: boolean
  foodOnly: boolean
  eventDatesLabel: string
  onChangeStatus: (status: Booking['status']) => void
  onChangeRooms?: () => void
  onChangeDates?: () => void
  readOnly: boolean
}

const OverviewTab = ({
  booking,
  lines,
  nights,
  isConferenceOnly,
  foodOnly,
  eventDatesLabel,
  onChangeStatus,
  onChangeRooms,
  onChangeDates,
  readOnly,
}: OverviewTabProps) => (
  <div className="space-y-4 text-sm">
    <Card padded={false} className="p-4" data-highlight-id={BOOKING_HIGHLIGHT.status}>
      <Field label="Booking status">
        <Select
          value={booking.status}
          onChange={(e) => onChangeStatus(e.target.value as Booking['status'])}
          disabled={readOnly}
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked-out">Checked-out</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Field>
    </Card>

    <BookingActions booking={booking} />

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card padded={false} className="p-5">
        <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3 inline-flex items-center gap-1.5">
          <Phone className="w-3 h-3" /> Guest contact
        </h3>
        <ul className="space-y-2.5">
          {booking.guestHidden ? (
            <li className="flex items-center gap-2 text-stone-400">
              <Lock className="w-4 h-4 shrink-0" />
              <span className="text-xs">Guest name and contact are visible only on bookings you created.</span>
            </li>
          ) : (
          <>
          <li className="flex items-center gap-2 text-stone-700">
            <Mail className="w-4 h-4 text-stone-400 shrink-0" />
            {booking.email ? (
              <a
                href={`mailto:${booking.email}`}
                className="font-medium hover:text-forest-700 truncate"
              >
                {booking.email}
              </a>
            ) : (
              <span className="text-stone-400">No email</span>
            )}
          </li>
          <li className="flex items-center gap-2 text-stone-700">
            <Phone className="w-4 h-4 text-stone-400 shrink-0" />
            <a
              href={`tel:${booking.phone}`}
              className="font-medium hover:text-forest-700"
            >
              {booking.phone}
            </a>
          </li>
          </>
          )}
          {getBookingArrivalTime(booking) && (
            <li className="flex items-center gap-2 text-stone-700">
              <ClipboardList className="w-4 h-4 text-stone-400 shrink-0" />
              <span className="text-xs">
                Arrives {getArrivalTimeLabel(getBookingArrivalTime(booking)!)}
              </span>
            </li>
          )}
          {getBookingEventTimeline(booking) && (
            <li className="flex items-start gap-2 text-stone-700">
              <ClipboardList className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <span className="text-xs whitespace-pre-line">
                Event timeline: {getBookingEventTimeline(booking)}
              </span>
            </li>
          )}
        </ul>
      </Card>

      <Card padded={false} className="p-5" data-highlight-id={BOOKING_HIGHLIGHT.stay}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3" /> {foodOnly ? 'Service' : isConferenceOnly ? 'Event' : 'Stay'}
          </h3>
          {onChangeDates && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<CalendarDays className="w-3.5 h-3.5" />}
              onClick={onChangeDates}
            >
              {foodOnly ? 'Change date' : isConferenceOnly ? 'Change event dates' : 'Change dates'}
            </Button>
          )}
        </div>
        {foodOnly ? (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-stone-500">Service date</p>
            <p className="font-medium text-forest-700">{formatShortDate(booking.checkIn)}</p>
          </div>
        ) : isConferenceOnly ? (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-stone-500">Event dates</p>
            <p className="font-medium text-forest-700">{eventDatesLabel}</p>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wide text-stone-500">Check-in</p>
              <p className="font-medium text-forest-700">{formatShortDate(booking.checkIn)}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-300" />
            <div className="flex-1 text-right">
              <p className="text-[10px] uppercase tracking-wide text-stone-500">Check-out</p>
              <p className="font-medium text-forest-700">{formatShortDate(booking.checkOut)}</p>
            </div>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between bg-cream/60 rounded-xl px-3 py-2">
          <span className="text-xs text-stone-500 inline-flex items-center gap-1">
            {foodOnly ? (
              <>
                <UtensilsCrossed className="w-3 h-3" /> Walk-in food bill
              </>
            ) : (
              <>
                <Moon className="w-3 h-3" /> {nights}{' '}
                {isConferenceOnly ? `event day${nights === 1 ? '' : 's'}` : `night${nights === 1 ? '' : 's'}`}
              </>
            )}
          </span>
          <span className="text-xs text-stone-500 inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> {booking.totalGuests} guests
          </span>
        </div>
      </Card>
    </div>

    {!foodOnly && (
    <Card padded={false} className="p-5" data-highlight-id={BOOKING_HIGHLIGHT.rooms}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Rooms ({lines.length})
        </h3>
        {onChangeRooms && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<BedDouble className="w-3.5 h-3.5" />}
            onClick={onChangeRooms}
          >
            Change rooms
          </Button>
        )}
      </div>
      <ul className="space-y-2">
        {lines.map((line) => {
          const parsed = parseRoomLabel(line.roomName)
          return (
          <li
            key={`${booking.id}-${line.roomType}-${line.roomName}`}
            className="flex items-center justify-between bg-cream/70 px-3 py-2.5 rounded-xl"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-700 font-serif text-xs font-semibold text-white">
                {parsed.number ?? (parsed.bed.toLowerCase().includes('conference') ? 'CR' : '—')}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-forest-700 truncate">
                  {parsed.bed}
                  {parsed.amenity ? ` · ${parsed.amenity}` : ''}
                </p>
                <p className="text-xs text-stone-500">
                  {line.adults} adult{line.adults === 1 ? '' : 's'}
                  {line.children > 0 ? ` · ${line.children} child${line.children === 1 ? '' : 'ren'}` : ''}
                </p>
              </div>
            </div>
            <Badge tone="forest" size="sm">
              {line.totalGuests} guests
            </Badge>
          </li>
          )
        })}
      </ul>
    </Card>
    )}

    <Card padded={false} className="p-5">
      <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3 inline-flex items-center gap-1.5">
        <Receipt className="w-3 h-3" /> Special requests
      </h3>
      <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 rounded-xl px-3 py-2.5 whitespace-pre-wrap">
        {booking.specialRequests || 'No special requests submitted.'}
      </p>
    </Card>
  </div>
)

interface NotesTabProps {
  booking: Booking
  note: string
  onChangeNote: (v: string) => void
  onSave: () => void
  /** Admin or manager — edit existing note text. */
  onEdit?: (noteId: string, text: string) => Promise<boolean>
  /** Admin or manager — mark complete / reopen. */
  onToggleComplete?: (noteId: string, completed: boolean) => void | Promise<void>
  /** Present only for admins. */
  onDelete?: (noteId: string) => void
  readOnly: boolean
}

const sortNotesNewestFirst = (a: BookingNote, b: BookingNote) =>
  (a.createdAt < b.createdAt ? 1 : -1)

const NotesTab = ({
  booking,
  note,
  onChangeNote,
  onSave,
  onEdit,
  onToggleComplete,
  onDelete,
  readOnly,
}: NotesTabProps) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const allNotes = booking.notes ?? []
  const openNotes = allNotes.filter((n) => !n.completed).sort(sortNotesNewestFirst)
  const completedNotes = allNotes.filter((n) => n.completed).sort(sortNotesNewestFirst)

  const startEdit = (noteId: string, text: string) => {
    setEditingId(noteId)
    setDraft(text)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft('')
    setSavingEdit(false)
  }

  const saveEdit = async () => {
    if (!editingId || !onEdit || !draft.trim()) return
    setSavingEdit(true)
    const ok = await onEdit(editingId, draft.trim())
    setSavingEdit(false)
    if (ok) cancelEdit()
  }

  const toggleComplete = async (noteId: string, completed: boolean) => {
    if (!onToggleComplete) return
    setTogglingId(noteId)
    await onToggleComplete(noteId, completed)
    setTogglingId(null)
    if (editingId === noteId) cancelEdit()
  }

  const renderNote = (n: BookingNote) => {
    const isEditing = editingId === n.id
    const done = Boolean(n.completed)
    return (
      <li
        key={n.id}
        data-highlight-id={n.id}
        className={cn(
          'rounded-xl px-3 py-2.5',
          done ? 'bg-stone-50/80 border border-stone-100' : 'bg-stone-50'
        )}
      >
        <div className="flex items-start gap-2.5">
          {onToggleComplete ? (
            <label className="mt-0.5 inline-flex shrink-0 cursor-pointer" title={done ? 'Mark as open' : 'Mark as complete'}>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-stone-300 text-forest-700 focus:ring-forest-400"
                checked={done}
                disabled={togglingId === n.id || isEditing}
                onChange={(e) => void toggleComplete(n.id, e.target.checked)}
                aria-label={done ? 'Mark note as open' : 'Mark note as complete'}
              />
            </label>
          ) : done ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest-600" aria-hidden />
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
              <span className="font-medium text-forest-700 truncate">{n.createdBy}</span>
              <span className="inline-flex items-center gap-1.5 shrink-0">
                {formatDateTime(n.createdAt)}
                {onEdit && !isEditing && !done && (
                  <button
                    type="button"
                    onClick={() => startEdit(n.id, n.note)}
                    className="rounded-md p-1 text-stone-400 transition-colors hover:bg-forest-50 hover:text-forest-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
                    aria-label="Edit note"
                    title="Edit note"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {onDelete && !isEditing && (
                  <button
                    type="button"
                    onClick={() => onDelete(n.id)}
                    className="rounded-md p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    aria-label="Delete note"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            </div>
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  autoFocus
                  aria-label="Edit note text"
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={cancelEdit} disabled={savingEdit}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    leftIcon={<Save className="w-3.5 h-3.5" />}
                    onClick={() => void saveEdit()}
                    loading={savingEdit}
                    disabled={!draft.trim() || draft.trim() === n.note}
                  >
                    Save changes
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p
                  className={cn(
                    'text-sm mt-1 whitespace-pre-wrap',
                    done ? 'text-stone-500 line-through decoration-stone-300' : 'text-stone-700'
                  )}
                >
                  {n.note}
                </p>
                {n.updatedAt && !done && (
                  <p className="mt-1 text-[11px] text-stone-400">
                    Edited {formatDateTime(n.updatedAt)}
                    {n.updatedBy ? ` · ${n.updatedBy}` : ''}
                  </p>
                )}
                {done && n.completedAt && (
                  <p className="mt-1 text-[11px] text-stone-400">
                    Completed {formatDateTime(n.completedAt)}
                    {n.completedBy ? ` · ${n.completedBy}` : ''}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </li>
    )
  }

  return (
    <Card padded={false} className="p-5" data-highlight-id={BOOKING_HIGHLIGHT.notes}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" /> Internal notes
        </h3>
        {openNotes.length > 0 && (
          <Badge tone="amber" size="sm">
            {openNotes.length} open
          </Badge>
        )}
      </div>

      {allNotes.length === 0 ? (
        <div className="rounded-xl bg-stone-50 border border-dashed border-stone-200 px-4 py-6 text-center mb-4">
          <MessageSquare className="w-5 h-5 text-stone-400 mx-auto mb-2" />
          <p className="text-xs text-stone-500">
            {readOnly ? 'No internal notes yet.' : 'No internal notes yet. Add one below.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-4">
          {openNotes.length > 0 ? (
            <ul className="space-y-2">{openNotes.map(renderNote)}</ul>
          ) : (
            <p className="text-xs text-stone-500 px-1">All notes are completed.</p>
          )}

          {completedNotes.length > 0 && (
            <div className="pt-2 border-t border-stone-100">
              <h4 className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2 inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Completed
                <span className="normal-case tracking-normal text-stone-400">({completedNotes.length})</span>
              </h4>
              <ul className="space-y-2">{completedNotes.map(renderNote)}</ul>
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <>
          <Field label="Add internal note">
            <Textarea
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
              placeholder="Visible to staff only - preferences, payment details, follow-ups…"
              rows={3}
              disabled={Boolean(editingId)}
            />
          </Field>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              leftIcon={<Save className="w-3.5 h-3.5" />}
              onClick={onSave}
              disabled={!note.trim() || Boolean(editingId)}
            >
              Save note
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
