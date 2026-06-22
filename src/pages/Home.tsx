import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Hero from '../components/Hero'
import CheckAvailability from '../components/CheckAvailability'
import RoomCard from '../components/RoomCard'
import Button from '../components/Button'
import HomeGallery from '../components/HomeGallery'
import StayIncludesSection from '../components/StayIncludesSection'
import ExperiencesNearbySection from '../components/ExperiencesNearbySection'
import ReviewsSection from '../components/ReviewsSection'
import CherekhMeaning from '../components/CherekhMeaning'
import HowToReachUs from '../components/HowToReachUs'
import FaqSection from '../components/FaqSection'
import { FAQ_HOMEPAGE_ITEMS } from '../data/faqCatalog'
import { useRoomCardList } from '../hooks/useRoomCardList'
import { useRoomSelection } from '../hooks/useRoomSelection'

const featuredRoomIds = ['206', '105', '103', '204']

const heroSlides = [
  {
    image: '/cherekhImages/homepageHero/Cover.jpg',
    title: 'Cherekh Center',
    subtitle: 'A quiet hill retreat surrounded by nature',
  },
  {
    image: '/cherekhImages/homepageHero/Cover_2.jpg',
    title: 'Rooms with a view',
    subtitle: 'Comfortable stays surrounded by nature',
  },
  {
    image: '/cherekhImages/homepageHero/Cover_3.jpg',
    title: 'Comfort for every trip',
    subtitle: 'Ideal for couples, families, and group getaways',
  },
  {
    image: '/cherekhImages/homepageHero/Cover_4.jpg',
    title: 'Stay close to local experiences',
    subtitle: 'Dining, hill trails, and riverside moments in one place',
  },
  {
    image: '/cherekhImages/homepageHero/Cover_5.jpg',
    title: 'Wake up to hill light',
    subtitle: 'Scenic mornings, fresh air, and restful stays',
  },
  {
    image: '/cherekhImages/homepageHero/Cover_6.jpg',
    title: 'Stay your way',
    subtitle: 'Flexible room choices with direct online booking',
  },
  {
    image: '/cherekhImages/homepageHero/Cover_7.jpg',
    title: 'Moments worth sharing',
    subtitle: 'Perfect for peaceful escapes and memorable trips',
  },
]

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <motion.p variants={fadeUp} className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">
    {children}
  </motion.p>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <motion.h2 variants={fadeUp} className="text-xl sm:text-2xl font-serif text-resort-heading">
    {children}
  </motion.h2>
)

const Home = () => {
  const featuredRooms = useRoomCardList(featuredRoomIds)
  const { toggle, isSelected } = useRoomSelection()

  return (
    <div className="bg-resort-bg">
      {/* 1. Brand & first impression */}
      <Hero compact slides={heroSlides} />

      {/* 2. Booking intent: dates before the long scroll */}
      <CheckAvailability compact />

      {/* 3. Core product: rooms */}
      <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
            >
              <SectionLabel>Accommodation</SectionLabel>
              <SectionTitle>Choose your room</SectionTitle>
              <motion.p variants={fadeUp} className="mt-2 text-sm text-stone-600 max-w-lg">
                AC and Non-AC rooms for couples, families, and groups, book online in minutes.
              </motion.p>
            </motion.div>
            <Link
              to="/rooms"
              className="group inline-flex items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
            >
              All rooms{' '}
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mt-8">
            {featuredRooms.map((room) => (
              <RoomCard
                key={room.id}
                {...room}
                compact
                selectable
                selected={isSelected(room.id)}
                onSelectToggle={toggle}
              />
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to="/booking" variant="primary" className="text-sm px-6 py-2.5">
              Check availability
            </Button>
            <Button to="/rooms" variant="outline" className="text-sm px-5 py-2">
              Compare all rooms
            </Button>
          </div>
        </div>
      </section>

      {/* 4. Visual proof: property & surroundings */}
      <HomeGallery />

      {/* 5. Value: amenities and on-site facilities */}
      <StayIncludesSection />

      {/* 6. Lifestyle: in-house experiences & Thanchi day trips */}
      <ExperiencesNearbySection />

      {/* 7. Social proof: guest reviews */}
      <ReviewsSection />

      {/* 8. Brand story: why Cherekh */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-t border-stone-200/60">
        <div className="max-w-3xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="text-center"
          >
            <SectionLabel>Heritage</SectionLabel>
            <SectionTitle>
              <Link to="/about" className="hover:text-resort-cta transition-colors">
                What Cherekh means
              </Link>
            </SectionTitle>
            <motion.p variants={fadeUp} className="mt-4 text-sm sm:text-base text-stone-600 leading-relaxed">
              Cherekh Center takes its name from the Marma word for a community rest shelter,
              a place of welcome, cool water, and pause on the journey through Bandarban.
            </motion.p>
          </motion.div>

          <div className="mt-10 sm:mt-12 pt-10 sm:pt-12 border-t border-stone-200/60">
            <CherekhMeaning centered showReadMore hideTitle />
          </div>
        </div>
      </section>

      {/* 9. Practical planning: directions & travel tips */}
      <HowToReachUs />

      {/* 10. Objections: common questions before booking */}
      <FaqSection items={FAQ_HOMEPAGE_ITEMS} />

      {/* 11. Final conversion */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-sand-100 border-t border-sand-200/80">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2"
          >
            Ready to visit?
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="text-xl sm:text-2xl font-serif text-resort-heading mt-2 mb-3"
          >
            Reserve your stay in Thanchi
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-sm sm:text-base text-stone-600 mb-6 leading-relaxed"
          >
            Pick your dates, choose a room, and complete booking on our website, complimentary
            breakfast included.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3"
          >
            <Button
              to="/booking"
              variant="primary"
              className="text-sm px-8 py-2.5 w-full sm:w-auto"
            >
              Book now
            </Button>
            <Button
              to="/faq"
              variant="primary"
              className="text-sm px-8 py-2.5 w-full sm:w-auto"
            >
              Questions? Read FAQs
            </Button>
            <Button
              to="/contact"
              variant="primary"
              className="text-sm px-8 py-2.5 w-full sm:w-auto"
            >
              Contact us
            </Button>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}

export default Home
