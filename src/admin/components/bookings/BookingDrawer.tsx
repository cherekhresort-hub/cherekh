import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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
} from 'lucide-react'
import { FaPrint } from 'react-icons/fa'
import { Drawer } from '../ui/Drawer'
import { BookingStatusBadge } from '../ui/StatusBadge'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Field, Select, Textarea } from '../ui/Input'
import { Card } from '../ui/Card'
import { Tabs } from '../ui/Tabs'
import { GuestDetailsSection } from './GuestDetailsSection'
import { PaymentSection } from './PaymentSection'
import { BookingActions } from './BookingActions'
import { printBookingInvoice } from '../../utils/bookingInvoice'
import { confirmDelete } from '../../utils/confirmDelete'
import {
  addBookingNote,
  computeBookingFinancials,
  deleteBooking,
  getBookingRooms,
  updateBookingStatus,
  type Booking,
} from '../../../utils/bookings'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { isBookingDetailLoaded } from '../../../lib/bookingsStore'
import { formatDateTime, formatShortDate } from '../../utils/date'
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
} from '../../../utils/bookingHelpers'
import { cn } from '../../utils/cn'

type TabKey = 'overview' | 'payment' | 'guests' | 'notes'

interface BookingDrawerProps {
  booking: Booking | null
  detailLoading?: boolean
  onClose: () => void
  onChanged: () => void
  onRetryLoad?: () => void | Promise<void>
}

export const BookingDrawer = ({ booking, detailLoading = false, onClose, onChanged, onRetryLoad }: BookingDrawerProps) => {
  const toast = useToast()
  const { canDelete } = useAuth()
  const [tab, setTab] = useState<TabKey>('overview')
  const [note, setNote] = useState('')

  useEffect(() => {
    setNote('')
    setTab('overview')
  }, [booking?.id])

  const fin = useMemo(
    () => (booking ? computeBookingFinancials(booking) : null),
    [booking]
  )
  const nights = useMemo(
    () => (booking ? getBookingDurationCount(booking) : 0),
    [booking]
  )
  const isConferenceOnly = booking ? bookingIsConferenceOnly(booking) : false
  const eventDatesLabel = booking ? formatEventDatesDisplay(getBookingEventDates(booking)) : ''

  if (!booking) return <Drawer open={false} onClose={onClose}>{null}</Drawer>

  const detailReady = isBookingDetailLoaded(booking.id)
  const initialLoad = detailLoading && !detailReady

  if (!detailReady || initialLoad) {
    const failed = !detailLoading && !detailReady
    return (
      <Drawer open onClose={onClose} title={failed ? 'Could not load booking' : 'Loading booking'} width="lg">
        <div className="px-6 py-16 text-center space-y-4">
          {detailLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-forest-600 mx-auto" />
          ) : null}
          <p className="text-sm text-stone-500">
            {failed
              ? 'Full booking details could not be loaded. Check your connection and staff login, then try again.'
              : 'Loading full booking details…'}
          </p>
          {failed && onRetryLoad && (
            <Button variant="outline" onClick={() => void onRetryLoad()}>
              Try again
            </Button>
          )}
        </div>
      </Drawer>
    )
  }

  if (!fin) return <Drawer open={false} onClose={onClose}>{null}</Drawer>

  const lines = getBookingRooms(booking)

  const setStatus = async (status: Booking['status'], label: string) => {
    const updated = await updateBookingStatus(booking.id, status)
    if (!updated) {
      toast.error('Could not update status', 'Rooms are not available for these dates.')
      return
    }
    toast.success(`Booking ${label}`, booking.name)
    onChanged()
  }

  const changeStatusInline = async (status: Booking['status']) => {
    if (status === booking.status) return
    const updated = await updateBookingStatus(booking.id, status)
    if (!updated) {
      toast.error('Could not update status', 'Rooms are not available for these dates.')
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

  const saveNote = async () => {
    if (!note.trim()) return
    await addBookingNote(booking.id, note.trim(), 'Admin')
    setNote('')
    toast.success('Internal note added')
    onChanged()
  }

  const noteCount = booking.notes?.length ?? 0
  const filledGuestCount = (booking.guests ?? []).filter(
    (g) => g.idNumber || g.idType !== 'nid'
  ).length

  const handlePrint = () => {
    const ok = printBookingInvoice(booking)
    if (!ok) toast.error('Pop-up blocked', 'Allow pop-ups for this site to print invoices.')
  }

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
            {lines.map((l) => l.roomName).join(' · ')}
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          title="Print invoice / Save as PDF"
          className="shrink-0 h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white inline-flex items-center justify-center transition-colors"
        >
          <FaPrint className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-5">
        <HeaderStat
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          label={isConferenceOnly ? 'Event dates' : 'Check-in'}
          value={isConferenceOnly ? eventDatesLabel || formatShortDate(booking.checkIn) : formatShortDate(booking.checkIn)}
        />
        <HeaderStat
          icon={<Moon className="w-3.5 h-3.5" />}
          label={isConferenceOnly ? 'Event days' : 'Nights'}
          value={`${nights}`}
        />
        <HeaderStat
          icon={<Users className="w-3.5 h-3.5" />}
          label="Guests"
          value={`${booking.totalGuests}`}
        />
        <HeaderStat
          icon={<Wallet className="w-3.5 h-3.5" />}
          label={fin.outstanding > 0 ? 'Outstanding' : 'Total'}
          value={formatBDT(fin.outstanding > 0 ? fin.outstanding : fin.total)}
          accent={fin.outstanding > 0 ? 'warning' : 'default'}
        />
      </div>
    </div>
  )

  const toolbar = (
    <Tabs<TabKey>
      layoutId="booking-drawer-tabs"
      value={tab}
      onChange={setTab}
      className="w-full justify-between"
      items={[
        { value: 'overview', label: <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Overview</span> },
        { value: 'payment', label: <span className="inline-flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Payment</span> },
        { value: 'guests', label: <span className="inline-flex items-center gap-1.5"><IdCard className="w-3.5 h-3.5" /> Guests</span>, count: filledGuestCount || undefined },
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
            <span className="text-xs text-stone-400 px-1">View & edit only (manager)</span>
          )}
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
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="px-6 py-5"
        >
          {tab === 'overview' && (
            <OverviewTab
              booking={booking}
              lines={lines}
              nights={nights}
              isConferenceOnly={isConferenceOnly}
              eventDatesLabel={eventDatesLabel}
              onChangeStatus={changeStatusInline}
            />
          )}
          {tab === 'payment' && <PaymentSection booking={booking} onChanged={onChanged} />}
          {tab === 'guests' && (
            <GuestDetailsSection booking={booking} onSaved={onChanged} />
          )}
          {tab === 'notes' && (
            <NotesTab
              booking={booking}
              note={note}
              onChangeNote={setNote}
              onSave={saveNote}
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
  eventDatesLabel: string
  onChangeStatus: (status: Booking['status']) => void
}

const OverviewTab = ({
  booking,
  lines,
  nights,
  isConferenceOnly,
  eventDatesLabel,
  onChangeStatus,
}: OverviewTabProps) => (
  <div className="space-y-4 text-sm">
    <Card padded={false} className="p-4">
      <Field label="Booking status">
        <Select
          value={booking.status}
          onChange={(e) => onChangeStatus(e.target.value as Booking['status'])}
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
          <li className="flex items-center gap-2 text-stone-700">
            <Mail className="w-4 h-4 text-stone-400 shrink-0" />
            <a
              href={`mailto:${booking.email}`}
              className="font-medium hover:text-forest-700 truncate"
            >
              {booking.email || '—'}
            </a>
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

      <Card padded={false} className="p-5">
        <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3 inline-flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3" /> {isConferenceOnly ? 'Event' : 'Stay'}
        </h3>
        {isConferenceOnly ? (
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
            <Moon className="w-3 h-3" /> {nights} {isConferenceOnly ? `event day${nights === 1 ? '' : 's'}` : `night${nights === 1 ? '' : 's'}`}
          </span>
          <span className="text-xs text-stone-500 inline-flex items-center gap-1">
            <Users className="w-3 h-3" /> {booking.totalGuests} guests
          </span>
        </div>
      </Card>
    </div>

    <Card padded={false} className="p-5">
      <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3 inline-flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" /> Rooms ({lines.length})
      </h3>
      <ul className="space-y-2">
        {lines.map((line) => (
          <li
            key={`${booking.id}-${line.roomType}-${line.roomName}`}
            className="flex items-center justify-between bg-cream/70 px-3 py-2.5 rounded-xl"
          >
            <div className="min-w-0">
              <p className="font-medium text-forest-700 truncate">{line.roomName}</p>
              <p className="text-xs text-stone-500">
                {line.adults} adult{line.adults === 1 ? '' : 's'}
                {line.children > 0 ? ` · ${line.children} child${line.children === 1 ? '' : 'ren'}` : ''}
              </p>
            </div>
            <Badge tone="forest" size="sm">
              {line.totalGuests} guests
            </Badge>
          </li>
        ))}
      </ul>
    </Card>

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
}

const NotesTab = ({ booking, note, onChangeNote, onSave }: NotesTabProps) => (
  <Card padded={false} className="p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
        <MessageSquare className="w-3 h-3" /> Internal notes
      </h3>
      {booking.notes && booking.notes.length > 0 && (
        <Badge tone="neutral" size="sm">
          {booking.notes.length}
        </Badge>
      )}
    </div>

    {booking.notes && booking.notes.length > 0 ? (
      <ul className="space-y-2 mb-4">
        {[...booking.notes]
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
          .map((n) => (
            <li key={n.id} className="bg-cream/70 rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-between text-xs text-stone-500">
                <span className="font-medium text-forest-700">{n.createdBy}</span>
                <span>{formatDateTime(n.createdAt)}</span>
              </div>
              <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{n.note}</p>
            </li>
          ))}
      </ul>
    ) : (
      <div className="rounded-xl bg-cream/60 border border-dashed border-stone-200 px-4 py-6 text-center mb-4">
        <MessageSquare className="w-5 h-5 text-stone-400 mx-auto mb-2" />
        <p className="text-xs text-stone-500">No internal notes yet. Add one below.</p>
      </div>
    )}

    <Field label="Add internal note">
      <Textarea
        value={note}
        onChange={(e) => onChangeNote(e.target.value)}
        placeholder="Visible to staff only — preferences, payment details, follow-ups…"
        rows={3}
      />
    </Field>
    <div className="mt-2 flex justify-end">
      <Button
        size="sm"
        leftIcon={<Save className="w-3.5 h-3.5" />}
        onClick={onSave}
        disabled={!note.trim()}
      >
        Save note
      </Button>
    </div>
  </Card>
)
