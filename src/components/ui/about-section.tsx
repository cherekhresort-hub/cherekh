'use client'

import { TimelineContent } from './timeline-animation'
import { VerticalCutReveal } from './vertical-cut-reveal'
import { ArrowRight, MapPin } from 'lucide-react'
import { FaFacebookF, FaInstagram, FaYoutube } from 'react-icons/fa'
import { useResortContact } from '../../contexts/SiteSettingsProvider'

export default function AboutSection() {
  const resortContact = useResortContact()

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        delay: i * 0.12,
        duration: 0.45,
      },
    }),
    hidden: {
      filter: 'blur(8px)',
      y: -16,
      opacity: 0,
    },
  }

  const scaleVariants = {
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        delay: i * 0.12,
        duration: 0.45,
      },
    }),
    hidden: {
      filter: 'blur(8px)',
      opacity: 0,
      scale: 0.98,
    },
  }

  return (
    <section className="bg-resort-bg px-4 pt-4 pb-8 sm:px-6 sm:pt-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative">
          <TimelineContent
            as="figure"
            animationNum={4}
            customVariants={scaleVariants}
            className="relative group"
          >
            <div className="h-[240px] w-full overflow-hidden rounded-3xl sm:h-[340px] lg:h-[420px]">
              <img
                src="/cherekhImages/homepageHero/Cover_4.jpg"
                alt="Cherekh Center in Thanchi"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          </TimelineContent>

          <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <TimelineContent
              as="div"
              animationNum={5}
              customVariants={revealVariants}
              className="flex flex-wrap gap-4"
            >
              <div className="mb-1 flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-bold text-red-500">9</span>
                <span className="text-gray-600">guest rooms</span>
                <span className="text-gray-300">|</span>
              </div>
              <div className="mb-1 flex items-center gap-2 text-xs sm:text-sm">
                <span className="font-bold text-red-500">80-100</span>
                <span className="text-gray-600">conference capacity</span>
              </div>
            </TimelineContent>
            <TimelineContent
              as="div"
              animationNum={6}
              customVariants={revealVariants}
              className="flex items-center gap-2 text-xs sm:text-sm"
            >
              <MapPin className="h-4 w-4 text-red-500" />
              <span className="text-gray-600">Thanchi, Bandarban</span>
            </TimelineContent>
          </div>
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <h1 className="mb-6 text-2xl font-semibold !leading-[110%] text-gray-900 sm:text-4xl md:text-5xl">
              <VerticalCutReveal
                splitBy="words"
                staggerDuration={0.08}
                staggerFrom="first"
                transition={{
                  type: 'spring',
                  stiffness: 250,
                  damping: 30,
                  delay: 0.2,
                }}
              >
                A peaceful hill retreat with local warmth and thoughtful comfort.
              </VerticalCutReveal>
            </h1>

            <TimelineContent
              as="div"
              animationNum={9}
              customVariants={revealVariants}
              className="grid gap-5 text-gray-600 sm:text-sm md:grid-cols-2 md:text-base"
            >
              <TimelineContent
                as="p"
                animationNum={10}
                customVariants={revealVariants}
                className="leading-relaxed"
              >
                Cherekh comes from a Marma word meaning a rest shelter. We carry that spirit by
                welcoming guests with clean rooms, calm views, and a relaxed pace close to nature.
              </TimelineContent>
              <TimelineContent
                as="p"
                animationNum={11}
                customVariants={revealVariants}
                className="leading-relaxed"
              >
                From trekking days to quiet family stays, our team helps you plan a smoother trip
                in Thanchi with practical local support and transparent booking.
              </TimelineContent>
            </TimelineContent>
          </div>

          <div className="md:col-span-1">
            <div className="text-right">
              <TimelineContent
                as="div"
                animationNum={12}
                customVariants={revealVariants}
                className="mb-1 text-2xl font-bold text-red-500"
              >
                CHEREKH
              </TimelineContent>
              <TimelineContent
                as="div"
                animationNum={13}
                customVariants={revealVariants}
                className="mb-6 text-sm text-gray-600"
              >
                Resort, Restaurant, Community Center
              </TimelineContent>

              <TimelineContent
                as="p"
                animationNum={14}
                customVariants={revealVariants}
                className="mb-4 font-medium text-gray-900"
              >
                Ready to plan your stay in Bandarban?
              </TimelineContent>

              <TimelineContent
                as="a"
                href="/booking"
                animationNum={15}
                customVariants={revealVariants}
                className="ml-auto inline-flex w-fit items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-3 font-semibold text-white shadow-lg shadow-neutral-900 transition-all duration-300 ease-in-out hover:gap-4 hover:bg-neutral-950"
              >
                BOOK NOW <ArrowRight />
              </TimelineContent>

              <TimelineContent
                as="div"
                animationNum={16}
                customVariants={revealVariants}
                className="mt-6 flex justify-end gap-2 sm:mt-7 sm:gap-3"
              >
                <a
                  href={resortContact.social.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200/80 bg-cream text-resort-heading transition-colors hover:bg-sand-100 sm:h-9 sm:w-9"
                >
                  <FaFacebookF className="h-3.5 w-3.5" />
                </a>
                <a
                  href={resortContact.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200/80 bg-cream text-resort-heading transition-colors hover:bg-sand-100 sm:h-9 sm:w-9"
                >
                  <FaInstagram className="h-3.5 w-3.5" />
                </a>
                <a
                  href={resortContact.social.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200/80 bg-cream text-resort-heading transition-colors hover:bg-sand-100 sm:h-9 sm:w-9"
                >
                  <FaYoutube className="h-3.5 w-3.5" />
                </a>
              </TimelineContent>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

