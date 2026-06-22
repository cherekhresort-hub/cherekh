import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import RoomCard from '../components/RoomCard'
import Button from '../components/Button'
import { useRoomCardList } from '../hooks/useRoomCardList'
import { useRoomSelection } from '../hooks/useRoomSelection'
import { roomCatalog, ROOM_BASE_AMENITIES } from '../data/roomCatalog'

const acRoomCount = roomCatalog.filter((room) =>
  room.amenities.includes('Air Conditioning')
).length

const SectionHeading = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) => (
  <div className="mb-6 sm:mb-8">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">{eyebrow}</p>
    <h2 className="mt-1 font-serif text-xl font-semibold text-resort-heading sm:text-2xl">{title}</h2>
    {description ? <p className="mt-2 max-w-2xl text-sm text-stone-600">{description}</p> : null}
  </div>
)

const Rooms = () => {
  const rooms = useRoomCardList()
  const { toggle, isSelected } = useRoomSelection()

  return (
    <div className="min-h-screen bg-resort-bg">
      <div className="mx-auto max-w-7xl px-4 page-content-inset sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 max-w-2xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Accommodation
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-resort-heading sm:text-4xl">
            Rooms &amp; suites
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
            Nine comfortable rooms across two floors in the Thanchi hills, each with en-suite bath,
            garden-view balcony, and complimentary breakfast.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-10 overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm"
        >
          <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:px-6">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-stone-600">
              <span>
                <span className="font-semibold tabular-nums text-resort-heading">{roomCatalog.length}</span>{' '}
                bookable rooms
              </span>
              <span>
                <span className="font-semibold tabular-nums text-resort-heading">{acRoomCount}</span> with AC
              </span>
              <span>Complimentary breakfast included</span>
            </div>
            <Link
              to="/booking"
              className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
            >
              Check availability{' '}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-stone-100 px-5 py-3 sm:px-6">
            {ROOM_BASE_AMENITIES.map((amenity) => (
              <span
                key={amenity}
                className="rounded-full bg-resort-bg px-2.5 py-0.5 text-[10px] font-medium text-stone-600 sm:text-xs"
              >
                {amenity}
              </span>
            ))}
          </div>
        </motion.div>

        <section aria-labelledby="rooms-heading">
          <SectionHeading
            eyebrow="All rooms"
            title="Choose your room"
            description={`Browse all ${roomCatalog.length} rooms by number. Select multiple rooms, then book them together.`}
          />

          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                {...room}
                type="room"
                compact
                selectable
                selected={isSelected(room.id)}
                onSelectToggle={toggle}
              />
            ))}
          </div>
        </section>

        <motion.footer
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mt-14 overflow-hidden rounded-2xl border border-stone-200/80 bg-cream px-5 py-6 text-center shadow-sm sm:mt-16 sm:px-8"
        >
          <p className="font-serif text-lg text-resort-heading">Ready to book?</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">
            Pick your dates, select a room, and complete your reservation online. Complimentary
            breakfast is included with every stay.
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/booking" variant="primary" className="w-full sm:w-auto">
              Book now
            </Button>
            <Button to="/contact" variant="outline" className="w-full sm:w-auto">
              Contact us
            </Button>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}

export default Rooms
