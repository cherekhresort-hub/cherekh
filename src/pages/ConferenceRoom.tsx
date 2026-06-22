import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, Phone, MessageCircle } from 'lucide-react'
import Button from '../components/Button'
import { getRoomById, formatCurrency } from '../utils/rooms'
import { conferenceImages } from '../data/roomCatalog'
import { useResortContact } from '../contexts/SiteSettingsProvider'

const EVENT_TYPES = [
  'Weddings & engagements',
  'Birthdays & anniversaries',
  'Corporate meetings & retreats',
  'Seminars, workshops & training',
]

const ConferenceRoom = () => {
  const resortContact = useResortContact()
  const [roomPrice, setRoomPrice] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    const storedRoom = getRoomById('conference')
    if (storedRoom) {
      setRoomPrice(storedRoom.price)
    }
  }, [])

  const capacity = '80–100 guests'

  return (
    <div className="min-h-screen bg-resort-bg">
      <div className="mx-auto max-w-5xl px-4 page-content-inset sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-10 max-w-2xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Venue
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-resort-heading sm:text-4xl">
            Conference Room
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
            A spacious hall for meetings, celebrations, and corporate events, with modern AV,
            flexible seating, and optional catering.
          </p>
        </motion.header>

        <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="space-y-6 lg:col-span-3"
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm">
              <div className="relative aspect-[16/10] w-full">
                <img
                  src={conferenceImages[selectedImage]}
                  alt={`Conference Room, photo ${selectedImage + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                />
              </div>
              {conferenceImages.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto border-t border-stone-100 p-3">
                  {conferenceImages.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImage(index)}
                      aria-label={`View photo ${index + 1} of ${conferenceImages.length}`}
                      aria-pressed={selectedImage === index}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border transition-colors ${
                        selectedImage === index
                          ? 'border-resort-heading ring-1 ring-resort-heading/30'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm px-5 py-5 sm:px-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                About the space
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-[15px]">
                Our conference hall accommodates 80–100 people and is equipped for business sessions,
                seminars, and private celebrations. AV equipment, projector, sound system, and Wi‑Fi
                are included. Catering and event planning support are available on request.
              </p>

              <h2 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                Included
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  'Audio / visual equipment',
                  'Projector & screen',
                  'Sound system',
                  'High-speed Wi‑Fi',
                  'Flexible seating',
                  'Catering available',
                ].map((item) => (
                  <li key={item} className="text-sm text-stone-600">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm px-5 py-5 sm:px-6">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                Suitable for
              </h2>
              <ul className="mt-3 space-y-2">
                {EVENT_TYPES.map((type) => (
                  <li key={type} className="text-sm text-stone-600">
                    {type}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm lg:sticky lg:top-24">
              <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Reserve
                </h2>
              </div>

              <dl className="px-5 sm:px-6">
                <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 border-b border-stone-100 py-3.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Capacity
                  </dt>
                  <dd className="flex items-center gap-1.5 text-sm font-medium text-resort-heading">
                    <Users className="h-4 w-4 text-stone-400" aria-hidden />
                    {capacity}
                  </dd>
                </div>
                {roomPrice !== null && roomPrice > 0 ? (
                  <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 border-b border-stone-100 py-3.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                      Rate
                    </dt>
                    <dd className="text-sm font-medium text-resort-heading">
                      {formatCurrency(roomPrice)}
                      <span className="font-normal text-stone-500"> / event day</span>
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="border-t border-stone-100 px-5 py-5 sm:px-6">
                <p className="text-sm text-stone-600">
                  Submit your dates online. We will confirm availability and pricing within 24 hours
                  by phone or WhatsApp.
                </p>
                <Link to="/conference-room/booking" className="mt-4 block">
                  <Button variant="primary" className="w-full">
                    Book your event
                  </Button>
                </Link>
              </div>

              <div className="border-t border-stone-100 bg-sand-100/60 px-5 py-4 sm:px-6">
                <p className="text-xs font-medium uppercase tracking-wide text-stone-500">
                  Questions?
                </p>
                <a
                  href={resortContact.telHref}
                  className="mt-1 block text-sm font-medium text-resort-heading hover:text-resort-cta"
                >
                  {resortContact.phoneDisplay}
                </a>
              </div>

              <div className="flex gap-2 border-t border-stone-100 px-5 py-4 sm:px-6">
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
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}

export default ConferenceRoom
