import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import FaqSection from '../components/FaqSection'
import Button from '../components/Button'

const FAQ_COVER = '/cherekhImages/faqCover.webp'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
}

const Faq = () => {
  return (
    <div className="bg-resort-bg min-h-screen">
      <section className="relative h-48 sm:h-64 md:h-80 flex items-end overflow-hidden">
        <img
          src={FAQ_COVER}
          alt="Cherekh Center in Thanchi, Bandarban"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/30" />
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pb-6 sm:pb-8 text-center sm:text-left">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] uppercase tracking-[0.18em] text-white/70 mb-2"
          >
            Help &amp; information
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white"
          >
            Frequently asked questions
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm sm:text-base text-white/90 mt-2 max-w-2xl"
          >
            Answers about rooms, booking, conference facilities, and staying at Cherekh Center in
            Thanchi, Bandarban.
          </motion.p>
        </div>
      </section>

      <div className="px-4 sm:px-6 lg:px-8">
        <FaqSection showHeader={false} className="border-0 max-w-3xl mx-auto" id="faq" />
      </div>

      <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8">
        <motion.div
          {...fadeUp}
          className="max-w-3xl mx-auto rounded-2xl border border-stone-200 bg-cream p-6 sm:p-8 text-center shadow-soft"
        >
          <h2 className="text-lg sm:text-xl font-serif text-resort-heading">Still have questions?</h2>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            Our team is happy to help with room choices, travel plans, or event bookings.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
            <Button to="/contact" variant="primary" className="text-sm px-6 py-2.5 w-full sm:w-auto">
              Contact us
            </Button>
            <Button to="/booking" variant="outline" className="text-sm px-6 py-2.5 w-full sm:w-auto">
              Book your stay
            </Button>
          </div>
          <Link
            to="/"
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
          >
            Back to home <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </section>
    </div>
  )
}

export default Faq
