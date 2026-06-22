import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bath,
  BedDouble,
  Bell,
  Coffee,
  Droplets,
  Snowflake,
  Trees,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { facilityCatalog, ROOM_BASE_AMENITIES, roomCatalog } from '../data/roomCatalog'

const amenityIcons: Record<(typeof ROOM_BASE_AMENITIES)[number], LucideIcon> = {
  'Complimentary Breakfast': Coffee,
  '24 Hour Electricity': Zap,
  'En-suite Bathroom': Bath,
  'Hot Water': Droplets,
  'Room Service': Bell,
  'Balcony with Garden View': Trees,
}

const doubleBedCount = roomCatalog.filter((room) => room.bedCategory === 'double').length
const coupleBedCount = roomCatalog.filter((room) => room.bedCategory === 'couple').length
const acRoomCount = roomCatalog.filter((room) => room.amenities.includes('Air Conditioning')).length

const facilities = Object.values(facilityCatalog)

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">{children}</p>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl sm:text-2xl font-serif text-resort-heading">{children}</h2>
)

const StayIncludesSection = () => {
  return (
    <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8 bg-resort-bg border-y border-stone-200/60">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Your stay includes</SectionLabel>
            <SectionTitle>Rooms, comforts &amp; on-site facilities</SectionTitle>
            <p className="mt-2 text-sm text-stone-600 max-w-2xl">
              Nine rooms across two floors with breakfast, en-suite bath, hot water, and garden-view
              balconies. Plus restaurant dining, 24/7 reception, conference space, and lounge areas.
            </p>
          </div>
          <Link
            to="/rooms"
            className="group inline-flex items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors shrink-0"
          >
            Explore rooms &amp; facilities{' '}
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-8 grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* In every room */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 rounded-xl border border-stone-200/80 bg-cream p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <BedDouble className="w-4 h-4 text-resort-heading" strokeWidth={1.75} />
              <h3 className="text-sm font-medium text-resort-heading tracking-wide">
                In every room
              </h3>
            </div>
            <ul className="space-y-2.5">
              {ROOM_BASE_AMENITIES.map((amenity, index) => {
                const Icon = amenityIcons[amenity]
                return (
                  <motion.li
                    key={amenity}
                    initial={{ opacity: 0, x: -6 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.04 }}
                    className="flex items-start gap-2.5 text-sm text-stone-700"
                  >
                    <Icon
                      className="w-4 h-4 mt-0.5 shrink-0 text-resort-heading/70"
                      strokeWidth={1.75}
                    />
                    <span>{amenity}</span>
                  </motion.li>
                )
              })}
            </ul>

            <div className="mt-5 pt-5 border-t border-stone-200/70">
              <p className="text-[11px] uppercase tracking-[0.14em] text-stone-500 mb-2">
                Room choices
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-50 px-3 py-1 text-xs text-stone-700 border border-stone-200/80">
                  <BedDouble className="w-3 h-3 text-resort-heading/70" />
                  {doubleBedCount} double-bed · 3 guests · max 4
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-50 px-3 py-1 text-xs text-stone-700 border border-stone-200/80">
                  <BedDouble className="w-3 h-3 text-resort-heading/70" />
                  {coupleBedCount} couple-bed · up to 2 guests
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-50 px-3 py-1 text-xs text-stone-700 border border-stone-200/80">
                  <Snowflake className="w-3 h-3 text-resort-heading/70" />
                  AC in {acRoomCount} rooms
                </span>
              </div>
            </div>
          </motion.div>

          {/* On the property */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-2.5 sm:gap-4">
            {facilities.map((facility, index) => (
              <motion.div
                key={facility.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, boxShadow: '0 16px 32px -6px rgba(0,0,0,0.10)' }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
                className="group relative overflow-hidden rounded-xl border border-stone-200/80 bg-cream min-w-0"
              >
                <div className="aspect-[4/3] sm:aspect-[16/9] overflow-hidden bg-stone-100">
                  <img
                    src={facility.images[0]}
                    alt={facility.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="p-2.5 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-medium text-resort-heading leading-snug">
                    {facility.name}
                  </h3>
                  <p className="mt-1 text-[10px] sm:text-xs text-stone-500 leading-relaxed line-clamp-2">
                    {facility.description}
                  </p>
                  <ul className="mt-2 hidden sm:flex flex-wrap gap-1.5">
                    {facility.features.slice(0, 3).map((feature) => (
                      <li
                        key={feature}
                        className="rounded-md bg-resort-bg px-2 py-0.5 text-[10px] text-stone-600"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={facility.ctaHref}
                    className="group/link mt-2 sm:mt-3 inline-flex items-center gap-1 text-[10px] sm:text-xs font-medium text-resort-heading hover:text-resort-cta transition-colors"
                  >
                    {facility.ctaLabel}{' '}
                    <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default StayIncludesSection
