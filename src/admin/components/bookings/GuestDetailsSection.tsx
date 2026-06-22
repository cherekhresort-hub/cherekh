import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Save,
  Pencil,
  IdCard,
  ShieldAlert,
  X,
  ChevronDown,
  Users,
  User,
  CheckCircle2,
} from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Field, Input, Select, Textarea } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { useToast } from '../ui/Toast'
import {
  getBookingGuestInfo,
  updateBookingGuestInfo,
  type Booking,
  type EmergencyContact,
  type GuestIdType,
  type GuestRecord,
} from '../../../utils/bookings'
import {
  bookingIsConferenceOnly,
  getGuestDetailSlotCount,
} from '../../../utils/bookingHelpers'
import { cn } from '../../utils/cn'

const ID_TYPE_LABELS: Record<GuestIdType, string> = {
  nid: 'National ID (NID)',
  passport: 'Passport',
  'driving-license': 'Driving License',
  'birth-certificate': 'Birth Certificate',
  other: 'Other',
}

const emptyGuest = (): GuestRecord => ({
  name: '',
  idType: 'nid',
  idNumber: '',
  idIssuedBy: '',
  nationality: 'Bangladeshi',
  address: '',
  city: '',
  country: 'Bangladesh',
})

const emptyEmergency = (): EmergencyContact => ({ name: '', phone: '', relation: '' })

const buildSlots = (booking: Booking): GuestRecord[] => {
  const total = getGuestDetailSlotCount(booking)
  const saved = getBookingGuestInfo(booking).guests
  const slots: GuestRecord[] = []
  for (let i = 0; i < total; i++) {
    slots.push({ ...emptyGuest(), ...(saved[i] ?? {}) })
  }
  if (slots[0] && !slots[0].name) slots[0].name = booking.name
  return slots
}

const isGuestFilled = (g: GuestRecord): boolean =>
  Boolean((g.idNumber && g.idNumber.trim()) || (g.idType && g.idType !== 'nid') || (g.name && g.name.trim()))

const isEmergencyFilled = (e: EmergencyContact): boolean =>
  Boolean((e.name && e.name.trim()) || (e.phone && e.phone.trim()))

interface GuestDetailsSectionProps {
  booking: Booking
  onSaved: () => void
}

export const GuestDetailsSection = ({ booking, onSaved }: GuestDetailsSectionProps) => {
  const toast = useToast()
  const conferenceOnly = bookingIsConferenceOnly(booking)
  const slotCount = getGuestDetailSlotCount(booking)
  const [editing, setEditing] = useState(false)
  const [guests, setGuests] = useState<GuestRecord[]>(() => buildSlots(booking))
  const [emergency, setEmergency] = useState<EmergencyContact>(
    () => getBookingGuestInfo(booking).emergencyContact ?? emptyEmergency()
  )
  const [openGuest, setOpenGuest] = useState<number>(0)

  useEffect(() => {
    setGuests(buildSlots(booking))
    setEmergency(getBookingGuestInfo(booking).emergencyContact ?? emptyEmergency())
    setEditing(false)
    setOpenGuest(0)
  }, [booking])

  const filledCount = useMemo(() => guests.filter(isGuestFilled).length, [guests])
  const hasAnyData = filledCount > 0 || isEmergencyFilled(emergency)

  const updateGuest = <K extends keyof GuestRecord>(idx: number, key: K, value: GuestRecord[K]) =>
    setGuests((prev) => prev.map((g, i) => (i === idx ? { ...g, [key]: value } : g)))

  const updateEmergency = <K extends keyof EmergencyContact>(key: K, value: EmergencyContact[K]) =>
    setEmergency((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    const guestsToSave = guests.slice(0, slotCount)
    await updateBookingGuestInfo(booking.id, {
      guests: guestsToSave,
      emergencyContact: emergency,
    })
    toast.success(
      conferenceOnly ? 'Event host details saved' : 'Guest details saved',
      conferenceOnly
        ? undefined
        : `${filledCount} of ${guestsToSave.length} guests on file`
    )
    setEditing(false)
    onSaved()
  }

  const handleCancel = () => {
    setGuests(buildSlots(booking))
    setEmergency(getBookingGuestInfo(booking).emergencyContact ?? emptyEmergency())
    setEditing(false)
  }

  return (
    <Card padded={false} className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {conferenceOnly ? 'Event host (admin)' : 'Guest details (admin)'}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {conferenceOnly
              ? filledCount > 0
                ? 'Event host on file'
                : 'Record ID for the event host / organiser'
              : `${filledCount} of ${guests.length} guest${guests.length === 1 ? '' : 's'} recorded`}
          </p>
        </div>
        {!editing ? (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Pencil className="w-3.5 h-3.5" />}
            onClick={() => setEditing(true)}
          >
            {hasAnyData ? 'Edit' : 'Add'}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" leftIcon={<X className="w-3.5 h-3.5" />} onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" leftIcon={<Save className="w-3.5 h-3.5" />} onClick={handleSave}>
              Save all
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-5">
          <ul className="space-y-2">
            {guests.map((guest, idx) => {
              const open = openGuest === idx
              const filled = isGuestFilled(guest)
              return (
                <li
                  key={idx}
                  className={cn(
                    'border rounded-2xl overflow-hidden transition-colors',
                    open ? 'border-forest-200 bg-white' : 'border-stone-200 bg-stone-50/60'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenGuest(open ? -1 : idx)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          'w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-medium',
                          filled ? 'bg-forest-700 text-white' : 'bg-stone-200 text-stone-600'
                        )}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-forest-700 truncate">
                          {conferenceOnly
                            ? 'Event host'
                            : `Guest ${idx + 1}`}
                          {!conferenceOnly && idx === 0 && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-stone-500 font-medium">
                              Primary
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-stone-500 truncate">
                          {guest.name || 'No name yet'}
                          {guest.idNumber ? ` · ${ID_TYPE_LABELS[guest.idType ?? 'nid']} ${guest.idNumber}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {filled && <CheckCircle2 className="w-4 h-4 text-forest-600" />}
                      <ChevronDown className={cn('w-4 h-4 text-stone-500 transition-transform', open && 'rotate-180')} />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3 border-t border-stone-100">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                            <Field label="Full name">
                              <Input
                                value={guest.name ?? ''}
                                onChange={(e) => updateGuest(idx, 'name', e.target.value)}
                                placeholder="As shown on ID"
                              />
                            </Field>
                            <Field label="Nationality">
                              <Input
                                value={guest.nationality ?? ''}
                                onChange={(e) => updateGuest(idx, 'nationality', e.target.value)}
                                placeholder="Bangladeshi"
                              />
                            </Field>
                            <Field label="ID type">
                              <div className="relative">
                                <Select
                                  value={guest.idType ?? 'nid'}
                                  onChange={(e) => updateGuest(idx, 'idType', e.target.value as GuestIdType)}
                                  className="pr-8"
                                >
                                  {(Object.keys(ID_TYPE_LABELS) as GuestIdType[]).map((k) => (
                                    <option key={k} value={k}>{ID_TYPE_LABELS[k]}</option>
                                  ))}
                                </Select>
                                <ChevronDown className="w-3.5 h-3.5 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              </div>
                            </Field>
                            <Field label="ID number">
                              <Input
                                value={guest.idNumber ?? ''}
                                onChange={(e) => updateGuest(idx, 'idNumber', e.target.value)}
                                placeholder="e.g. 1234567890123"
                              />
                            </Field>
                            <Field label="Issued by / country">
                              <Input
                                value={guest.idIssuedBy ?? ''}
                                onChange={(e) => updateGuest(idx, 'idIssuedBy', e.target.value)}
                                placeholder="Bangladesh"
                              />
                            </Field>
                          </div>

                          <div>
                            <h4 className="text-[10px] uppercase tracking-wide text-stone-400 font-medium mb-1.5">
                              Address
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <Field label="Address" className="sm:col-span-2">
                                <Textarea
                                  rows={2}
                                  value={guest.address ?? ''}
                                  onChange={(e) => updateGuest(idx, 'address', e.target.value)}
                                  placeholder="Street, area, postal code"
                                />
                              </Field>
                              <Field label="City">
                                <Input
                                  value={guest.city ?? ''}
                                  onChange={(e) => updateGuest(idx, 'city', e.target.value)}
                                  placeholder="Dhaka"
                                />
                              </Field>
                              <Field label="Country">
                                <Input
                                  value={guest.country ?? ''}
                                  onChange={(e) => updateGuest(idx, 'country', e.target.value)}
                                  placeholder="Bangladesh"
                                />
                              </Field>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              )
            })}
          </ul>

          <div className="border-t border-stone-100 pt-4">
            <h4 className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-2 inline-flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" /> Emergency contact
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Contact name">
                <Input
                  value={emergency.name ?? ''}
                  onChange={(e) => updateEmergency('name', e.target.value)}
                  placeholder="Full name"
                />
              </Field>
              <Field label="Contact phone">
                <Input
                  value={emergency.phone ?? ''}
                  onChange={(e) => updateEmergency('phone', e.target.value)}
                  placeholder="+880 …"
                />
              </Field>
              <Field label="Relation" className="sm:col-span-2">
                <Input
                  value={emergency.relation ?? ''}
                  onChange={(e) => updateEmergency('relation', e.target.value)}
                  placeholder="Spouse, parent, friend…"
                />
              </Field>
            </div>
          </div>
        </div>
      ) : hasAnyData ? (
        <ReadOnlyView guests={guests} emergency={emergency} conferenceOnly={conferenceOnly} />
      ) : (
        <div className="rounded-xl bg-cream/60 border border-dashed border-stone-200 px-4 py-6 text-center">
          <IdCard className="w-5 h-5 text-stone-400 mx-auto mb-2" />
          <p className="text-xs text-stone-500">
            {conferenceOnly ? (
              <>
                No event host details yet. Click <strong>Add</strong> to record NID/passport for the
                organiser ({booking.totalGuests} attendees expected).
              </>
            ) : (
              <>
                No guest details captured. Click <strong>Add</strong> to record NID/passport for each
                of the {slotCount} guest{slotCount === 1 ? '' : 's'}.
              </>
            )}
          </p>
        </div>
      )}
    </Card>
  )
}

const ReadOnlyView = ({
  guests,
  emergency,
  conferenceOnly = false,
}: {
  guests: GuestRecord[]
  emergency: EmergencyContact
  conferenceOnly?: boolean
}) => (
  <div className="space-y-4">
    <ul className="space-y-2">
      {guests.map((g, idx) => {
        const filled = isGuestFilled(g)
        return (
          <li key={idx} className="bg-cream/60 rounded-xl px-3 py-2.5">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-medium shrink-0',
                  filled ? 'bg-forest-700 text-white' : 'bg-stone-200 text-stone-600'
                )}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <p className="font-medium text-forest-700">
                    {g.name || (conferenceOnly ? 'Event host' : `Guest ${idx + 1}`)}
                  </p>
                  {!conferenceOnly && idx === 0 && <Badge tone="forest" size="sm">Primary</Badge>}
                  {!filled && <Badge tone="amber" size="sm">Missing</Badge>}
                </div>
                {filled ? (
                  <p className="text-xs text-stone-600 mt-0.5">
                    {ID_TYPE_LABELS[g.idType ?? 'nid']}
                    {g.idNumber ? ` · ${g.idNumber}` : ''}
                    {g.nationality ? ` · ${g.nationality}` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-stone-400 mt-0.5">No ID details yet.</p>
                )}
                {(g.address || g.city || g.country) && (
                  <p className="text-xs text-stone-500 mt-0.5">
                    {[g.address, g.city, g.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <User className="w-3.5 h-3.5 text-stone-300 mt-1" />
            </div>
          </li>
        )
      })}
    </ul>

    {isEmergencyFilled(emergency) && (
      <div>
        <h5 className="text-[11px] uppercase tracking-wide text-stone-400 font-medium mb-1.5 inline-flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3" /> Emergency contact
        </h5>
        <div className="bg-cream/60 rounded-xl px-3 py-2">
          <p className="text-sm text-forest-700 font-medium">{emergency.name || '—'}</p>
          <p className="text-xs text-stone-600">
            {[emergency.phone, emergency.relation].filter(Boolean).join(' · ') || 'No phone'}
          </p>
        </div>
      </div>
    )}
  </div>
)
