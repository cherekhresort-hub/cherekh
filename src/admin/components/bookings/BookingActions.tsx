import {
  FaBolt,
  FaWhatsapp,
  FaPhone,
  FaRegCopy,
  FaPrint,
} from 'react-icons/fa'
import { Card } from '../ui/Card'
import { useToast } from '../ui/Toast'
import type { Booking } from '../../../utils/bookings'
import {
  buildBookingMessages,
  telHref,
  whatsappHref,
} from '../../utils/bookingMessages'
import { printBookingInvoice } from '../../utils/bookingInvoice'
import { cn } from '../../utils/cn'

interface BookingActionsProps {
  booking: Booking
}

interface ActionItem {
  key: string
  label: string
  description: string
  icon: React.ReactNode
  tone: 'forest' | 'teal' | 'sky' | 'sand' | 'violet' | 'stone'
  onClick: () => void
  disabled?: boolean
  href?: string
}

const TONE_BG: Record<ActionItem['tone'], string> = {
  forest: 'bg-forest-50 text-forest-700 border-forest-100 hover:bg-forest-100',
  teal:   'bg-teal-50 text-teal-700 border-teal-100 hover:bg-teal-100',
  sky:    'bg-sky-50 text-sky-700 border-sky-100 hover:bg-sky-100',
  sand:   'bg-sand-50 text-sand-700 border-sand-200 hover:bg-sand-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100 hover:bg-violet-100',
  stone:  'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100',
}

export const BookingActions = ({ booking }: BookingActionsProps) => {
  const toast = useToast()
  const msg = buildBookingMessages(booking)
  const phone = booking.phone?.trim()

  const print = () => {
    const ok = printBookingInvoice(booking)
    if (!ok) toast.error('Pop-up blocked', 'Allow pop-ups for this site to print invoices.')
  }

  const openExternal = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(msg.summary)
      toast.success('Summary copied', 'Paste it into any message')
    } catch {
      toast.error('Could not copy')
    }
  }

  const actions: ActionItem[] = [
    {
      key: 'print',
      label: 'Invoice PDF',
      description: 'Print or save as PDF',
      icon: <FaPrint className="w-4 h-4" />,
      tone: 'forest',
      onClick: print,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      description: 'Message on WhatsApp',
      icon: <FaWhatsapp className="w-4 h-4" />,
      tone: 'forest',
      onClick: () => openExternal(whatsappHref(phone, msg.whatsappBody)),
      disabled: !phone,
    },
    {
      key: 'call',
      label: 'Call guest',
      description: phone || 'No phone on file',
      icon: <FaPhone className="w-4 h-4" />,
      tone: 'sand',
      onClick: () => openExternal(telHref(phone)),
      disabled: !phone,
    },
    {
      key: 'copy',
      label: 'Copy summary',
      description: 'Booking details to clipboard',
      icon: <FaRegCopy className="w-4 h-4" />,
      tone: 'stone',
      onClick: copySummary,
    },
  ]

  return (
    <Card padded={false} className="p-5">
      <h3 className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-3 inline-flex items-center gap-1.5">
        <FaBolt className="w-3 h-3" /> Actions
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.disabled ? `${action.label} unavailable: ${action.description}` : action.description}
            className={cn(
              'group flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all',
              'focus:outline-none focus:ring-2 focus:ring-forest-300',
              action.disabled
                ? 'bg-stone-50 text-stone-400 border-stone-100 cursor-not-allowed'
                : TONE_BG[action.tone]
            )}
          >
            <span
              className={cn(
                'shrink-0 w-8 h-8 rounded-xl inline-flex items-center justify-center',
                action.disabled
                  ? 'bg-white/60 text-stone-300'
                  : 'bg-white/80 group-hover:bg-white shadow-soft'
              )}
            >
              {action.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">{action.label}</p>
              <p className="text-[11px] opacity-80 truncate">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}
