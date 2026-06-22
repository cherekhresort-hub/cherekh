import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import { inHouseExperiences, thanchiVisitPlaces } from '../data/experienceCatalog'

const cardReveal = {
  hidden: { opacity: 0, y: 12 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: Math.min(index * 0.05, 0.2),
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

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

const SectionHeading = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) => (
  <div className="mb-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">{eyebrow}</p>
    <h2 className="mt-1 font-serif text-xl font-semibold text-resort-heading sm:text-2xl">{title}</h2>
    {description ? <p className="mt-2 text-sm text-stone-600">{description}</p> : null}
  </div>
)

const Experiences = () => {
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
            Experiences
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-resort-heading sm:text-4xl">
            Experiences in Cherekh
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
            On-site experiences at Cherekh Center and places to explore around Thanchi, with
            distances from town to help you plan your stay.
          </p>
        </motion.header>

        <div className="space-y-12">
          <section aria-labelledby="in-house-heading">
            <SectionHeading
              eyebrow="At Cherekh"
              title="In-house Cherekh experience"
              description="Dining, rooms, cultural evenings, events, and front-desk support at Cherekh Center."
            />

            <div className="grid grid-cols-2 gap-2.5 sm:gap-6 lg:grid-cols-3">
              {inHouseExperiences.map((experience, index) => (
                <motion.article
                  key={experience.id}
                  custom={index}
                  variants={cardReveal}
                  initial="hidden"
                  whileInView="visible"
                  whileHover={{ y: -6 }}
                  viewport={{ once: true, margin: '-24px' }}
                  transition={{
                    opacity: { duration: 0.35, delay: Math.min(index * 0.05, 0.2) },
                    y: { type: 'spring', stiffness: 320, damping: 26 },
                  }}
                  className="group/experience min-w-0"
                >
                  <div className="flex h-full flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-cream shadow-sm transition-all duration-300 sm:rounded-2xl group-hover/experience:border-resort-heading/20 group-hover/experience:shadow-lg group-hover/experience:shadow-resort-heading/5">
                    <div className="relative aspect-[4/3] overflow-hidden sm:aspect-auto sm:h-44">
                      <img
                        src={experience.image}
                        alt={experience.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover/experience:scale-[1.03]"
                        loading={index === 0 ? 'eager' : 'lazy'}
                      />
                    </div>

                    <div className="flex flex-1 flex-col px-2.5 py-3 sm:px-5 sm:py-4">
                      <div className="mb-1.5 flex flex-wrap items-center gap-1 sm:mb-3 sm:gap-2">
                        <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-stone-600 sm:px-2.5 sm:text-[10px]">
                          {experience.difficulty}
                        </span>
                        <span className="text-[8px] text-stone-500 sm:text-xs">{experience.duration}</span>
                      </div>

                      <h3 className="text-xs font-semibold leading-snug text-resort-heading transition-colors duration-300 group-hover/experience:text-resort-cta sm:font-serif sm:text-lg">
                        {experience.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-stone-600 sm:mt-2 sm:line-clamp-none sm:text-sm">
                        {experience.description}
                      </p>

                      <ul className="mt-4 hidden space-y-1.5 border-t border-stone-100 pt-4 sm:block">
                        {experience.highlights.map((highlight) => (
                          <li key={highlight} className="text-xs text-stone-500">
                            {highlight}
                          </li>
                        ))}
                      </ul>
                      {experience.href && experience.ctaLabel ? (
                        <Link
                          to={experience.href}
                          className="mt-2 inline-flex text-[10px] font-medium text-resort-heading transition-colors hover:text-resort-cta sm:mt-4 sm:text-sm"
                        >
                          {experience.ctaLabel} →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <section aria-labelledby="visit-heading">
            <SectionHeading
              eyebrow="Explore the area"
              title="What to visit in Thanchi"
              description="Approximate distances from Thanchi Bazaar / Cherekh Center. Travel times vary with season, river level, and route."
            />

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
                  className="group/visit flex min-w-0 flex-col overflow-hidden rounded-xl border border-stone-200/80 bg-cream shadow-sm transition-shadow duration-300 hover:shadow-md hover:shadow-stone-200/60 sm:rounded-2xl"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100 sm:aspect-[16/10]">
                    <img
                      src={place.image}
                      alt={place.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover/visit:scale-[1.03]"
                      loading={index < 2 ? 'eager' : 'lazy'}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:gap-2 sm:p-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-semibold leading-snug text-resort-heading transition-colors duration-300 group-hover/visit:text-resort-cta sm:text-sm">
                        {place.name}
                      </h3>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-stone-600 transition-colors duration-300 group-hover/visit:text-stone-700 sm:line-clamp-3 sm:text-xs">
                        {place.description}
                      </p>
                    </div>
                    <dl className="shrink-0">
                      <dt className="hidden text-[9px] font-semibold uppercase tracking-wide text-stone-400 transition-colors duration-300 group-hover/visit:text-stone-500 sm:block sm:text-[10px]">
                        From Thanchi
                      </dt>
                      <dd className="text-[10px] font-semibold tabular-nums text-resort-heading transition-colors duration-300 group-hover/visit:text-resort-cta sm:mt-0.5 sm:text-sm">
                        {place.distanceFromThanchi}
                      </dd>
                      {place.travelTime ? (
                        <dd className="mt-0.5 hidden text-[10px] text-stone-500 transition-colors duration-300 group-hover/visit:text-stone-600 sm:block sm:text-xs">
                          {place.travelTime}
                        </dd>
                      ) : null}
                    </dl>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        </div>

        <motion.footer
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mt-10 overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm px-5 py-6 text-center sm:px-8"
        >
          <p className="font-serif text-lg text-resort-heading">Ready to explore?</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">
            Share your travel dates and we will help you plan in-house experiences and day trips
            around Thanchi.
          </p>
          <div className="mt-4">
            <Button to="/contact" variant="primary">
              Get in touch
            </Button>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}

export default Experiences
