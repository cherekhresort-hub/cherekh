import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Compass, MapPin, Users } from 'lucide-react'
import { inHouseExperiences, thanchiVisitPlaces, type InHouseExperience } from '../data/experienceCatalog'

const planningPoints = [
  {
    icon: Compass,
    label: 'Cultural evenings and events held at Cherekh Center',
  },
  {
    icon: MapPin,
    label: 'Day trips and treks across the Thanchi hills',
  },
  {
    icon: Users,
    label: 'Reception can help arrange guides, boats, and itineraries',
  },
]

const homepageInHouseIds = [
  'cultural-nights',
  'spacious-rooms',
  'reception-planning',
  'complimentary-breakfast',
  'restaurant',
] as const

const homepageInHouse = homepageInHouseIds
  .map((id) => inHouseExperiences.find((item) => item.id === id))
  .filter((item): item is InHouseExperience => item !== undefined)

const [featuredExperience, ...companionExperiences] = homepageInHouse

const visitReveal = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: Math.min(index * 0.025, 0.3),
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">{children}</p>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl sm:text-2xl font-serif text-resort-heading">{children}</h2>
)

const ExperienceCard = ({
  experience,
  index,
}: {
  experience: InHouseExperience
  index: number
}) => (
  <motion.article
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, boxShadow: '0 16px 32px -6px rgba(0,0,0,0.10)' }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
    className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-cream"
  >
    <div className="aspect-[4/3] overflow-hidden bg-stone-100 sm:aspect-[16/10]">
      <img
        src={experience.image}
        alt={experience.title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
      />
    </div>
    <div className="flex flex-1 flex-col p-2.5 sm:p-4">
      <div className="mb-1.5 flex flex-wrap items-center gap-1 sm:mb-2 sm:gap-1.5">
        <span className="rounded-full bg-resort-bg px-1.5 py-0.5 text-[8px] font-medium text-resort-heading sm:px-2 sm:text-[10px]">
          {experience.difficulty}
        </span>
        <span className="text-[8px] text-stone-500 sm:text-[10px]">{experience.duration}</span>
      </div>
      <h3 className="text-xs font-medium leading-snug text-resort-heading sm:text-sm">{experience.title}</h3>
      <p className="mt-1 line-clamp-2 flex-1 text-[10px] leading-relaxed text-stone-500 sm:line-clamp-3 sm:text-xs">
        {experience.description}
      </p>
      {experience.href && experience.ctaLabel ? (
        <Link
          to={experience.href}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-resort-heading hover:text-resort-cta transition-colors sm:mt-3 sm:text-xs"
        >
          {experience.ctaLabel}{' '}
          <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Link>
      ) : null}
    </div>
  </motion.article>
)

const ExperiencesNearbySection = () => {
  return (
    <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Experiences in Cherekh</SectionLabel>
            <SectionTitle>In-house experiences &amp; places to visit</SectionTitle>
            <p className="mt-2 text-sm text-stone-600 max-w-2xl">
              Cultural nights, on-site dining, comfortable rooms, complimentary breakfast, and
              front-desk support, plus nearby Thanchi destinations to explore from Cherekh.
            </p>
          </div>
          <Link
            to="/experiences"
            className="group inline-flex items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors shrink-0"
          >
            All experiences{' '}
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-6 space-y-4 sm:space-y-5">
          {featuredExperience ? (
            <motion.article
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative min-h-[240px] overflow-hidden rounded-xl border border-stone-200/80 bg-stone-900 sm:min-h-[300px]"
            >
              <img
                src={featuredExperience.image}
                alt={featuredExperience.title}
                className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                    {featuredExperience.difficulty}
                  </span>
                  <span className="text-[10px] text-white/80">{featuredExperience.duration}</span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-white sm:text-2xl">
                  {featuredExperience.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
                  {featuredExperience.description}
                </p>
              </div>
            </motion.article>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-5">
            {companionExperiences.map((experience, index) => (
              <ExperienceCard key={experience.id} experience={experience} index={index} />
            ))}
          </div>
        </div>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 overflow-hidden rounded-xl border border-stone-200/80 bg-cream"
          aria-label="Plan with us"
        >
          <div className="grid gap-4 px-4 py-4 sm:px-5 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-6">
            <ul className="space-y-3">
              {planningPoints.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-2 text-sm text-stone-600">
                  <Icon
                    className="mt-0.5 h-4 w-4 shrink-0 text-resort-heading/70"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-resort-heading px-4 py-2 text-xs font-medium text-white hover:bg-resort-heading/90 transition-colors"
              >
                Contact
              </Link>
              <Link
                to="/rooms/reception"
                className="inline-flex items-center justify-center rounded-lg border border-stone-200 bg-resort-bg px-4 py-2 text-xs font-medium text-resort-heading hover:border-stone-300 transition-colors"
              >
                About reception
              </Link>
            </div>
          </div>
        </motion.aside>

        <div className="mt-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              Explore the area
            </p>
            <h3 className="mt-1 font-serif text-lg font-semibold text-resort-heading sm:text-xl">
              What to visit in Thanchi
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Approximate distances from Thanchi Bazaar / Cherekh Center.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
            {thanchiVisitPlaces.map((place, index) => (
              <motion.article
                key={place.id}
                custom={index}
                variants={visitReveal}
                initial="hidden"
                whileInView="visible"
                whileHover={{ y: -4 }}
                viewport={{ once: true, margin: '-24px' }}
                transition={{
                  y: { type: 'spring', stiffness: 400, damping: 28 },
                }}
                className="group/visit flex min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-cream shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-stone-200/60"
              >
                <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                  <img
                    src={place.image}
                    alt={place.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover/visit:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug text-resort-heading transition-colors duration-300 group-hover/visit:text-resort-cta sm:text-sm">
                      {place.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-stone-500 transition-colors duration-300 group-hover/visit:text-stone-600 sm:line-clamp-3 sm:text-xs">
                      {place.description}
                    </p>
                    {place.travelTime ? (
                      <p className="mt-1 hidden text-[10px] text-stone-400 transition-colors duration-300 group-hover/visit:text-stone-500 sm:block sm:text-xs">
                        {place.travelTime}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold tabular-nums text-resort-heading transition-colors duration-300 group-hover/visit:text-resort-cta sm:text-sm">
                    {place.distanceFromThanchi}
                  </span>
                </div>
              </motion.article>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-24px' }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="mt-4 text-center sm:text-left"
          >
            <Link
              to="/experiences"
              className="group inline-flex items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
            >
              View full experiences page{' '}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default ExperiencesNearbySection
