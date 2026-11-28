import { Link } from 'react-router-dom'
import { ChevronRight, MessageSquareText, Phone } from 'lucide-react'
import type { ContactInquiry } from '../../../lib/contactInquiries'
import { relativeFromNow, formatShortDate } from '../../utils/date'
import { Card, CardDescription, CardTitle } from '../ui/Card'
import { cn } from '../../utils/cn'

interface NewInquiriesSectionProps {
  inquiries: ContactInquiry[]
  loading?: boolean
}

const stayLabel = (inquiry: ContactInquiry): string => {
  if (!inquiry.checkIn && !inquiry.checkOut) return 'Dates not specified'
  if (inquiry.checkIn && inquiry.checkOut) {
    return `${formatShortDate(inquiry.checkIn)} → ${formatShortDate(inquiry.checkOut)}`
  }
  return formatShortDate(inquiry.checkIn || inquiry.checkOut)
}

export const NewInquiriesSection = ({ inquiries, loading }: NewInquiriesSectionProps) => {
  if (loading && inquiries.length === 0) {
    return (
      <Card padded={false} className="overflow-hidden">
        <div className="px-5 py-4 space-y-2 animate-pulse">
          <div className="h-4 w-40 rounded bg-stone-100" />
          <div className="h-3 w-56 rounded bg-stone-100" />
        </div>
      </Card>
    )
  }

  if (inquiries.length === 0) {
    return (
      <Link
        to="/admin/inquiries"
        className="block rounded-2xl border border-stone-100 bg-white px-5 py-4 shadow-soft hover:shadow-card transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-400"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center shrink-0">
              <MessageSquareText className="w-4 h-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-forest-700">New inquiries</p>
              <p className="text-xs text-stone-500 mt-0.5">No unread contact-form messages</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
        </div>
      </Link>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-forest-700">New inquiries</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Website contact requests waiting for a first response
          </p>
        </div>
        <Link
          to="/admin/inquiries?status=new"
          className="text-xs font-medium text-forest-700 hover:text-forest-900 inline-flex items-center gap-1"
        >
          View all new
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <Card padded={false} className="overflow-hidden border-amber-200/70">
        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-amber-100/80 bg-amber-50/40">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <MessageSquareText className="w-4 h-4" strokeWidth={1.75} />
            </span>
            Awaiting reply
          </CardTitle>
          <CardDescription className="mt-0">
            <span
              className={cn(
                'min-w-[1.75rem] h-7 px-2 rounded-full text-xs font-semibold tabular-nums inline-flex items-center justify-center',
                'bg-amber-100 text-amber-800'
              )}
            >
              {inquiries.length}
            </span>
          </CardDescription>
        </div>

        <ul className="divide-y divide-stone-50">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id}>
              <Link
                to={`/admin/inquiries?id=${encodeURIComponent(inquiry.id)}`}
                className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-cream/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-forest-700 truncate">{inquiry.name}</p>
                  <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                    {stayLabel(inquiry)}
                    {inquiry.guests ? ` · ${inquiry.guests} guests` : ''}
                  </p>
                  {inquiry.message ? (
                    <p className="text-[11px] text-stone-500 mt-1 line-clamp-1">{inquiry.message}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right space-y-1">
                  <p className="text-[11px] text-amber-800 font-medium">{relativeFromNow(inquiry.createdAt)}</p>
                  {inquiry.phone ? (
                    <p className="text-[11px] text-stone-500 inline-flex items-center gap-1 justify-end">
                      <Phone className="w-3 h-3" />
                      {inquiry.phone}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
