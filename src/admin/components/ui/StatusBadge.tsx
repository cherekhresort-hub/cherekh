import { CheckCircle2, Clock, XCircle, LogOut, CircleDot, Sparkles, Wrench, Sun, Moon, Coffee } from 'lucide-react'
import type { Booking } from '../../../utils/bookings'
import type { CleaningStatus, RoomStatus, StaffShift, StaffStatus } from '../../types'
import { Badge } from './Badge'

export const BookingStatusBadge = ({ status }: { status: Booking['status'] }) => {
  const config = {
    pending:      { tone: 'amber',  icon: <Clock />,         label: 'Pending' },
    confirmed:    { tone: 'forest', icon: <CheckCircle2 />,  label: 'Confirmed' },
    cancelled:    { tone: 'red',    icon: <XCircle />,       label: 'Cancelled' },
    'checked-out':{ tone: 'neutral',icon: <LogOut />,        label: 'Checked out' },
  } as const
  const c = config[status]
  return <Badge tone={c.tone as never} icon={c.icon}>{c.label}</Badge>
}

export const RoomStatusBadge = ({ status }: { status: RoomStatus }) => {
  const config = {
    available:   { tone: 'forest', icon: <CircleDot />, label: 'Available' },
    occupied:    { tone: 'sky',    icon: <CircleDot />, label: 'Occupied' },
    cleaning:    { tone: 'amber',  icon: <Sparkles />,  label: 'Cleaning' },
    maintenance: { tone: 'red',    icon: <Wrench />,    label: 'Maintenance' },
  } as const
  const c = config[status]
  return <Badge tone={c.tone as never} icon={c.icon}>{c.label}</Badge>
}

export const CleaningStatusBadge = ({ status }: { status: CleaningStatus }) => {
  const config = {
    dirty:    { tone: 'amber',  icon: <Sparkles />,     label: 'Dirty' },
    cleaning: { tone: 'sky',    icon: <Sparkles />,     label: 'Cleaning' },
    ready:    { tone: 'forest', icon: <CheckCircle2 />, label: 'Ready' },
  } as const
  const c = config[status]
  return <Badge tone={c.tone as never} icon={c.icon}>{c.label}</Badge>
}

export const ShiftBadge = ({ shift }: { shift: StaffShift }) => {
  const config = {
    morning:   { tone: 'sand',   icon: <Coffee />, label: 'Morning' },
    afternoon: { tone: 'amber',  icon: <Sun />,    label: 'Afternoon' },
    night:     { tone: 'violet', icon: <Moon />,   label: 'Night' },
    off:       { tone: 'neutral',icon: <Clock />,  label: 'Off' },
  } as const
  const c = config[shift]
  return <Badge tone={c.tone as never} icon={c.icon}>{c.label}</Badge>
}

export const StaffStatusBadge = ({ status }: { status: StaffStatus }) => {
  const config = {
    'on-duty':  { tone: 'forest', label: 'On duty' },
    'on-break': { tone: 'amber',  label: 'On break' },
    'off-duty': { tone: 'neutral',label: 'Off duty' },
  } as const
  const c = config[status]
  return <Badge tone={c.tone as never}>{c.label}</Badge>
}
