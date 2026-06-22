import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, ExternalLink, Leaf, Heart, Mountain, MapPin } from 'lucide-react'
import AboutSection from '../components/ui/about-section'
import CherekhMeaning from '../components/CherekhMeaning'
import { useResortContact } from '../contexts/SiteSettingsProvider'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-resort-heading/70">
      {children}
    </p>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-2xl font-serif text-resort-heading sm:mb-6 sm:text-3xl">{children}</h2>
}

const values = [
  {
    icon: Mountain,
    title: 'Nature first',
    text: 'Sustainable practices that protect Thanchi for future generations.',
  },
  {
    icon: Heart,
    title: 'Authentic hospitality',
    text: 'Warm service rooted in the welcoming spirit of our community.',
  },
  {
    icon: Leaf,
    title: 'Cultural respect',
    text: 'Honoring local heritage through meaningful guest experiences.',
  },
] as const

const locationPoints = [
  'Pristine rivers and natural waterfalls nearby',
  'Close to indigenous communities and cultural sites',
  'Hill views and lush landscapes',
  'Ideal base for trekking and adventure',
] as const

const About = () => {
  const resortContact = useResortContact()

  return (
    <div className="bg-resort-bg min-h-screen">
      <AboutSection />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-14 sm:space-y-20">
        <motion.section {...fadeUp}>
          <SectionLabel>Our story</SectionLabel>
          <SectionTitle>A sanctuary in the hills</SectionTitle>
          <div className="space-y-4 text-stone-600 text-[15px] sm:text-base leading-relaxed">
            <p>
              Nestled in Thanchi, Bandarban, Cherekh Center offers a serene escape where modern
              comfort meets the natural beauty of the hills.
            </p>
            <p>
              We created a place for guests to reconnect with nature while enjoying thoughtful
              hospitality, surrounded by greenery, rivers, and mountain vistas.
            </p>
            <p>
              Working with local communities, we aim to preserve this region&apos;s beauty and
              heritage. Whether you seek adventure or quiet rest, you are welcome here.
            </p>
          </div>
        </motion.section>

        <hr className="border-stone-200/80" />

        <motion.section {...fadeUp}>
          <SectionLabel>Heritage</SectionLabel>
          <SectionTitle>What is a cherekh?</SectionTitle>
          <CherekhMeaning className="mt-6" />
        </motion.section>

        <hr className="border-stone-200/80" />

        <motion.section {...fadeUp}>
          <SectionLabel>Values</SectionLabel>
          <SectionTitle>What we stand for</SectionTitle>
          <ul className="space-y-6">
            {values.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream border border-stone-200/80 text-resort-heading">
                  <Icon className="w-4 h-4" aria-hidden />
                </span>
                <div>
                  <h3 className="font-medium text-resort-heading mb-1">{title}</h3>
                  <p className="text-sm sm:text-[15px] text-stone-600 leading-relaxed">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>

        <hr className="border-stone-200/80" />

        <motion.section {...fadeUp} className="space-y-6">
          <div>
            <SectionLabel>Location</SectionLabel>
            <SectionTitle>Find us in Thanchi</SectionTitle>
            <p className="text-stone-600 text-[15px] sm:text-base leading-relaxed mb-5">
              One of Bandarban&apos;s most serene destinations, your base for culture, rivers, and
              hill country.
            </p>
            <ul className="space-y-2.5 mb-6">
              {locationPoints.map((point) => (
                <li key={point} className="flex gap-2.5 text-sm sm:text-[15px] text-stone-600">
                  <span className="text-resort-heading mt-1.5 h-1 w-1 shrink-0 rounded-full bg-resort-heading" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="flex items-start gap-2 text-sm text-stone-600">
              <MapPin className="w-4 h-4 text-resort-cta shrink-0 mt-0.5" aria-hidden />
              <span>Cherekh Center, Thanchi, Bandarban, Bangladesh</span>
            </p>
          </div>

          <div className="rounded-xl overflow-hidden border border-stone-200/80 bg-cream">
            <div className="relative w-full aspect-video">
              <iframe
                src={resortContact.location.mapsEmbedUrl}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Cherekh Center on Google Maps"
              />
            </div>
            <div className="px-4 py-3 border-t border-stone-100 flex justify-center sm:justify-start">
              <a
                href={resortContact.location.mapsPlaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
              >
                Open in Google Maps
                <ExternalLink className="w-3.5 h-3.5" aria-hidden />
              </a>
            </div>
          </div>
        </motion.section>

        <motion.section
          {...fadeUp}
          className="bg-cream rounded-xl border border-stone-200/80 p-6 sm:p-8 text-center sm:text-left"
        >
          <h2 className="text-xl font-serif text-resort-heading mb-2">Plan your stay</h2>
          <p className="text-sm text-stone-600 mb-6 max-w-md sm:max-w-none">
            Check availability and book online, or get in touch with our team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/booking"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-resort-heading text-white text-sm font-medium rounded-lg hover:bg-resort-heading/90 transition-colors"
            >
              Book now
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link
              to="/rooms"
              className="inline-flex items-center justify-center px-6 py-3 border border-stone-200 text-resort-heading text-sm font-medium rounded-lg hover:bg-sand-100 transition-colors"
            >
              View rooms
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  )
}

export default About
