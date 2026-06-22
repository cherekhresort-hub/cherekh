import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Phone, MessageCircle, MapPin, ArrowUpRight } from 'lucide-react'
import ContactForm from '../components/ContactForm'
import { useResortContact } from '../contexts/SiteSettingsProvider'
import { formatTime12h } from '../utils/contactFromSettings'

const ContactDetail = ({
  label,
  value,
  href,
  external,
}: {
  label: string
  value: string
  href: string
  external?: boolean
}) => (
  <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 gap-y-0.5 border-b border-stone-100 py-3.5 last:border-0">
    <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
    <dd>
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="group inline-flex items-start gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
      >
        <span className="break-all">{value}</span>
        {external ? (
          <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-resort-cta" aria-hidden />
        ) : null}
      </a>
    </dd>
  </div>
)

const Contact = () => {
  const resortContact = useResortContact()
  const { location } = resortContact

  return (
    <div className="min-h-screen bg-resort-bg">
      <div className="mx-auto max-w-5xl px-4 page-content-inset sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-10 max-w-xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Contact
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-resort-heading sm:text-4xl">
            Get in touch
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
            Call or message us for the fastest reply. You can also send a stay inquiry below, and we
            will contact you by phone or WhatsApp.
          </p>
        </motion.header>

        <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm">
              <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Direct contact
                </h2>
              </div>
              <dl className="px-5 sm:px-6">
                <ContactDetail
                  label="Phone"
                  value={resortContact.phoneDisplay}
                  href={resortContact.telHref}
                />
                <ContactDetail
                  label="WhatsApp"
                  value="Message us"
                  href={resortContact.whatsappHref}
                  external
                />
                <ContactDetail
                  label="Email"
                  value={resortContact.email}
                  href={resortContact.mailtoHref}
                />
              </dl>

              <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Location
                </h2>
                <p className="text-sm leading-relaxed text-stone-600 whitespace-pre-line">
                  {resortContact.address}
                </p>
                <a
                  href={location.mapsDirectionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
                >
                  Get directions
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </a>
              </div>

              <div className="border-t border-stone-100 px-5 py-4 sm:px-6">
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Hours
                </h2>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-stone-500">Check-in</span>
                  <span className="font-medium text-resort-heading">
                    {formatTime12h(resortContact.checkInTime)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between gap-4 text-sm">
                  <span className="text-stone-500">Check-out</span>
                  <span className="font-medium text-resort-heading">
                    {formatTime12h(resortContact.checkOutTime)}
                  </span>
                </div>
              </div>

              <div className="border-t border-stone-100 bg-sand-100/60 px-5 py-4 text-sm text-stone-600 sm:px-6">
                Prefer to book online?{' '}
                <Link to="/booking" className="font-medium text-resort-heading hover:text-resort-cta">
                  Reserve a room
                </Link>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href={resortContact.telHref}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-stone-200 bg-cream px-4 py-2.5 text-sm font-medium text-resort-heading transition-colors hover:border-resort-heading/30 hover:bg-sand-100"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Call
              </a>
              <a
                href={resortContact.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-resort-heading px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-resort-heading/90"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp
              </a>
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="lg:col-span-3"
            aria-labelledby="inquiry-heading"
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm">
              <div className="border-b border-stone-100 px-5 py-5 sm:px-8">
                <h2
                  id="inquiry-heading"
                  className="font-serif text-xl font-semibold text-resort-heading sm:text-2xl"
                >
                  Send an inquiry
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Share your dates and we will follow up within 24 hours.
                </p>
              </div>
              <div className="px-5 py-6 sm:px-8 sm:py-8">
                <ContactForm />
              </div>
            </div>
          </motion.section>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mt-10 sm:mt-12"
          aria-labelledby="map-heading"
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="map-heading" className="font-serif text-lg font-semibold text-resort-heading">
              Find us
            </h2>
            <a
              href={location.mapsPlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
            >
              <MapPin className="h-4 w-4" aria-hidden />
              Open in Maps
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm">
            <div className="relative aspect-[16/10] w-full min-h-[200px] sm:aspect-video">
              <iframe
                src={location.mapsEmbedUrl}
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Cherekh Center location on Google Maps"
              />
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default Contact
