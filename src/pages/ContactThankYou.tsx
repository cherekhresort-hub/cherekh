import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useResortContact } from '../contexts/SiteSettingsProvider'
import { formatDisplayDate } from '../utils/dates'
import Button from '../components/Button'

type InquiryState = {
  name?: string
  checkIn?: string
  checkOut?: string
  guests?: string
}

const ContactThankYou = () => {
  const location = useLocation()
  const resortContact = useResortContact()
  const state = (location.state as InquiryState | null) ?? null
  const hasStayInfo = Boolean(state?.checkIn && state?.checkOut)

  return (
    <div className="min-h-screen bg-resort-bg px-4 page-content-inset sm:px-6 lg:px-8">
      <div className="mx-auto max-w-lg">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm"
        >
          <header className="border-b border-stone-100 px-6 py-8 text-center sm:px-8">
            <div
              className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-resort-heading/15 bg-resort-heading/5"
              aria-hidden
            >
              <Check className="h-5 w-5 text-resort-heading" strokeWidth={2.25} />
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-resort-heading sm:text-[1.75rem]">
              Inquiry received
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-stone-600">
              Thank you{state?.name ? `, ${state.name}` : ''}. We have your message and will contact
              you by phone or WhatsApp within 24 hours.
            </p>
          </header>

          {hasStayInfo ? (
            <div className="px-6 py-4 sm:px-8">
              <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                Your inquiry
              </h2>
              <dl>
                <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 border-b border-stone-100 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Check-in
                  </dt>
                  <dd className="text-sm font-medium text-resort-heading">
                    {formatDisplayDate(state!.checkIn!)}
                  </dd>
                </div>
                <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 border-b border-stone-100 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Check-out
                  </dt>
                  <dd className="text-sm font-medium text-resort-heading">
                    {formatDisplayDate(state!.checkOut!)}
                  </dd>
                </div>
                <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 py-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Guests
                  </dt>
                  <dd className="text-sm font-medium text-resort-heading">{state?.guests}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          <div className="border-t border-stone-100 bg-sand-100/80 px-6 py-4 text-sm text-stone-600 sm:px-8">
            <p>{resortContact.phoneDisplay}</p>
            <p className="mt-1 break-all">{resortContact.email}</p>
          </div>

          <footer className="flex flex-col gap-2 border-t border-stone-100 px-6 py-5 sm:flex-row sm:px-8">
            <Button to="/" variant="primary" className="w-full sm:flex-1">
              Back to home
            </Button>
            <Link
              to="/booking"
              className="w-full rounded-full border border-stone-200 px-6 py-2.5 text-center text-sm font-medium text-resort-heading transition-colors hover:border-resort-heading/30 hover:bg-sand-100 sm:flex-1"
            >
              Book a room
            </Link>
          </footer>
        </motion.article>
      </div>
    </div>
  )
}

export default ContactThankYou
