import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MapPin, Navigation, ExternalLink, Phone } from 'lucide-react'
import { useResortContact } from '../contexts/SiteSettingsProvider'

const travelTips = [
  'We are in Thanchi, Bandarban, a scenic hill area in south-eastern Bangladesh.',
  'Most guests travel from Bandarban town toward Thanchi by road (jeep or reserved transport).',
  'Roads are hilly; plan extra time during monsoon season.',
  'Call or WhatsApp us before you travel. We can help coordinate local directions or pickup.',
] as const

const HowToReachUs = () => {
  const resortContact = useResortContact()
  const { location } = resortContact

  return (
    <section
      className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8 border-t border-stone-200/60"
      aria-labelledby="how-to-reach-heading"
    >
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mx-auto text-center mb-6 sm:mb-8">
          <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">Location</p>
          <h2
            id="how-to-reach-heading"
            className="text-xl sm:text-2xl font-serif text-resort-heading"
          >
            How to reach us
          </h2>
          <p className="mt-3 text-sm sm:text-base text-stone-600 leading-relaxed">
            {location.addressLines.join(' · ')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 sm:gap-6 items-start">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-2 space-y-4"
          >
            <ul className="space-y-3">
              {travelTips.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm text-stone-600 leading-relaxed">
                  <MapPin
                    className="w-4 h-4 text-resort-cta shrink-0 mt-0.5"
                    aria-hidden
                  />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:flex-col">
              <a
                href={location.mapsDirectionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-resort-cta text-white text-sm font-semibold hover:bg-resort-cta/90 active:scale-[0.99] transition-all shadow-sm"
              >
                <Navigation className="w-4 h-4" aria-hidden />
                Get directions
              </a>
              <a
                href={location.mapsPlaceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl border-2 border-resort-heading text-resort-heading text-sm font-semibold hover:bg-resort-heading hover:text-white active:scale-[0.99] transition-all"
              >
                <ExternalLink className="w-4 h-4" aria-hidden />
                Open in Google Maps
              </a>
            </div>

            <a
              href={resortContact.telHref}
              className="inline-flex items-center gap-2 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
            >
              <Phone className="w-4 h-4" aria-hidden />
              {resortContact.phoneDisplay}, ask for directions
            </a>

            <p className="text-xs text-stone-500">
              More details on our{' '}
              <Link to="/contact" className="text-resort-heading font-medium hover:underline">
                contact page
              </Link>
              .
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-3 rounded-2xl overflow-hidden shadow-sm border border-stone-200/80 bg-cream"
          >
            <div className="relative w-full aspect-[4/3] sm:aspect-video min-h-[240px]">
              <iframe
                src={location.mapsEmbedUrl}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Cherekh Center on Google Maps"
              />
            </div>
            <div className="p-3 sm:p-4 border-t border-stone-100 bg-sand-100/50">
              <p className="text-xs sm:text-sm text-stone-500 text-center">
                Tap <strong className="text-resort-heading">Get directions</strong> to open
                turn-by-turn navigation in Google Maps from your current location.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default HowToReachUs
