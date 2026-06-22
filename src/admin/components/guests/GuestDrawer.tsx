import { useMemo } from 'react'
import {
  Mail,
  Phone,
  Calendar,
  StickyNote,
  Tag,
  Check,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { Drawer } from '../ui/Drawer'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Avatar } from '../ui/Avatar'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { formatShortDate } from '../../utils/date'
import { formatBDT } from '../../utils/format'
import type { Guest, GuestTag } from '../../types'
import { getBookings, getBookingRooms } from '../../../utils/bookings'
import {
  resetGuestOverride,
  setGuestTagOverride,
} from '../../data/guestOverrides'
import { cn } from '../../utils/cn'

const tagToTone = {
  vip: 'sand',
  returning: 'teal',
  frequent: 'forest',
  new: 'sky',
} as const

const tagToTextTone: Record<GuestTag, string> = {
  vip: 'text-sand-700',
  returning: 'text-teal-700',
  frequent: 'text-forest-700',
  new: 'text-sky-700',
}

const tagToBgTone: Record<GuestTag, string> = {
  vip: 'bg-sand-50 border-sand-200',
  returning: 'bg-teal-50 border-teal-100',
  frequent: 'bg-forest-50 border-forest-100',
  new: 'bg-sky-50 border-sky-100',
}

const TAG_ORDER: GuestTag[] = ['new', 'returning', 'frequent', 'vip']

const TAG_DESCRIPTIONS: Record<GuestTag, string> = {
  new: 'First-time guest',
  returning: '2 or more stays',
  frequent: '5 or more stays',
  vip: '8+ stays or hand-picked',
}

interface GuestDrawerProps {
  guest: Guest | null
  onClose: () => void
  onChanged?: () => void
}

export const GuestDrawer = ({ guest, onClose, onChanged }: GuestDrawerProps) => {
  const toast = useToast()

  const history = useMemo(() => {
    if (!guest) return []
    const bookings = getBookings()
    return bookings
      .filter(
        (b) =>
          b.email.toLowerCase() === guest.email.toLowerCase() &&
          b.name.toLowerCase() === guest.name.toLowerCase()
      )
      .sort((a, b) => b.checkIn.localeCompare(a.checkIn))
  }, [guest])

  if (!guest) return <Drawer open={false} onClose={onClose}>{null}</Drawer>

  const toggleTag = (tag: GuestTag) => {
    const isActive = guest.tags.includes(tag)
    const isDerived = guest.derivedTags.includes(tag)
    // Active + derived  -> force off
    // Active + manual   -> back to auto (which is off)
    // Inactive + manual -> back to auto (which is on)  [shouldn't normally happen]
    // Inactive + auto-off -> force on
    let nextState: 'on' | 'off' | 'auto'
    if (isActive) {
      nextState = isDerived ? 'off' : 'auto'
    } else {
      nextState = isDerived ? 'auto' : 'on'
    }
    setGuestTagOverride(guest.id, tag, nextState, guest.derivedTags, guest.name)
    toast.success(
      nextState === 'off'
        ? `Hidden "${tag}"`
        : nextState === 'on'
          ? `Pinned "${tag}"`
          : `Reset "${tag}" to auto`
    )
    onChanged?.()
  }

  const resetAll = () => {
    if (!confirm('Reset all tag overrides for this guest?')) return
    resetGuestOverride(guest.id, guest.name)
    toast.success('Tags reset to auto')
    onChanged?.()
  }

  return (
    <Drawer open={!!guest} onClose={onClose} title={guest.name} subtitle="Guest profile" width="md">
      <div className="space-y-5 text-sm">
        <div className="flex items-center gap-4">
          <Avatar name={guest.name} color="#1E4D2B" size="lg" />
          <div className="flex-1 min-w-0">
            <p className="font-serif text-lg text-forest-700 truncate">{guest.name}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {guest.tags.length === 0 ? (
                <span className="text-xs text-stone-400 italic">No tags</span>
              ) : (
                guest.tags.map((tag) => (
                  <Badge key={tag} tone={tagToTone[tag]} size="sm">
                    {tag.toUpperCase()}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <Card padded={false} className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Loyalty tags
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Auto-derived from {guest.totalStays} stay{guest.totalStays === 1 ? '' : 's'}.
                Click any tag to pin or hide it.
              </p>
            </div>
            {guest.hasTagOverride && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={resetAll}
              >
                Reset to auto
              </Button>
            )}
          </div>

          <ul className="space-y-1.5">
            {TAG_ORDER.map((tag) => {
              const isActive = guest.tags.includes(tag)
              const isDerived = guest.derivedTags.includes(tag)
              const isOverridden = isActive !== isDerived
              return (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-colors text-left',
                      isActive
                        ? `${tagToBgTone[tag]}`
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          'w-5 h-5 rounded-md border inline-flex items-center justify-center shrink-0',
                          isActive
                            ? `${tagToTextTone[tag]} border-current`
                            : 'border-stone-300 text-transparent'
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            isActive ? tagToTextTone[tag] : 'text-stone-600'
                          )}
                        >
                          {tag.toUpperCase()}
                        </p>
                        <p className="text-[11px] text-stone-500 truncate">
                          {TAG_DESCRIPTIONS[tag]}
                        </p>
                      </div>
                    </div>
                    {isOverridden ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-1.5 py-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        Manual
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-stone-400">
                        Auto
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card padded={false} className="p-5">
          <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3">Contact</h3>
          <ul className="space-y-2.5">
            <li className="flex items-center gap-2 text-stone-700">
              <Mail className="w-4 h-4 text-stone-400" />
              <a href={`mailto:${guest.email}`} className="font-medium break-all hover:text-forest-700">
                {guest.email}
              </a>
            </li>
            <li className="flex items-center gap-2 text-stone-700">
              <Phone className="w-4 h-4 text-stone-400" />
              <a href={`tel:${guest.phone}`} className="font-medium hover:text-forest-700">
                {guest.phone}
              </a>
            </li>
          </ul>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-xs text-stone-500">Stays</p>
            <p className="font-serif text-2xl text-forest-700">{guest.totalStays}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-stone-500">Last stay</p>
            <p className="font-medium text-forest-700 text-sm mt-1">
              {guest.lastStay ? formatShortDate(guest.lastStay) : '—'}
            </p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-stone-500">Spent</p>
            <p className="font-serif text-lg text-forest-700">{formatBDT(guest.totalSpent)}</p>
          </Card>
        </div>

        <Card padded={false} className="p-5">
          <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3">
            Stay history
          </h3>
          {history.length === 0 ? (
            <EmptyState
              title="No bookings"
              description="History will appear after the first reservation."
              icon={<Calendar className="w-5 h-5" />}
            />
          ) : (
            <ul className="space-y-2">
              {history.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between bg-cream/70 rounded-xl px-3 py-2"
                >
                  <div>
                    <p className="text-forest-700 font-medium text-sm">
                      {getBookingRooms(b).map((l) => l.roomName).join(', ')}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatShortDate(b.checkIn)} → {formatShortDate(b.checkOut)}
                    </p>
                  </div>
                  <Badge tone="neutral" size="sm">{b.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {guest.notes && (
          <Card padded={false} className="p-5">
            <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" /> Notes
            </h3>
            <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 rounded-xl px-3 py-2">
              {guest.notes}
            </p>
          </Card>
        )}
      </div>
    </Drawer>
  )
}
