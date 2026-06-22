import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ResponsiveImage from './ResponsiveImage'
import { homeCoverGallery } from '../data/homeGallery'
import { galleryThumbSources, heroImageSources } from '../utils/responsiveImage'

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">{children}</p>
)

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl sm:text-2xl font-serif text-resort-heading">{children}</h2>
)

const HomeGallery = () => {
  const [index, setIndex] = useState(0)
  const total = homeCoverGallery.length
  const current = homeCoverGallery[index]

  const goTo = useCallback(
    (next: number) => {
      if (total === 0) return
      setIndex(((next % total) + total) % total)
    },
    [total]
  )

  const goPrev = useCallback(() => goTo(index - 1), [goTo, index])
  const goNext = useCallback(() => goTo(index + 1), [goTo, index])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') goPrev()
      if (event.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goNext, goPrev])

  if (!current) return null

  return (
    <section
      className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8 bg-resort-bg border-y border-stone-200/60"
      aria-labelledby="home-gallery-heading"
      aria-roledescription="carousel"
    >
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-6 sm:mb-8">
          <SectionLabel>Gallery</SectionLabel>
          <SectionTitle>
            <span id="home-gallery-heading">Life at Cherekh Center</span>
          </SectionTitle>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            Rooms, views, and the calm of Thanchi. Swipe or use the thumbnails to browse.
          </p>
        </div>

        {/* Main slide */}
        <div className="relative rounded-2xl overflow-hidden bg-stone-100 shadow-sm border border-stone-200/80">
          <div className="relative aspect-[16/10] sm:aspect-[2/1]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.src}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0"
              >
                <ResponsiveImage
                  {...heroImageSources(current.src, current.alt)}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index === 0 ? 'high' : 'low'}
                />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-5 py-3 sm:py-4 flex items-end justify-between gap-3">
              <div className="min-w-0">
                {current.caption && (
                  <p className="text-sm sm:text-base font-medium text-white truncate">
                    {current.caption}
                  </p>
                )}
                <p className="text-xs text-white/75 mt-0.5">
                  {index + 1} of {total}
                </p>
              </div>
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-cream/90 text-resort-heading shadow-md hover:bg-cream transition-colors"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-cream/90 text-resort-heading shadow-md hover:bg-cream transition-colors"
                  aria-label="Next photo"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        {total > 1 && (
          <div
            className="mt-3 sm:mt-4 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory [scrollbar-width:thin]"
            role="tablist"
            aria-label="Gallery thumbnails"
          >
            {homeCoverGallery.map((image, thumbIndex) => {
              const isActive = thumbIndex === index
              return (
                <button
                  key={image.src}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={image.caption ?? image.alt}
                  onClick={() => setIndex(thumbIndex)}
                  className={`snap-start shrink-0 w-[4.25rem] sm:w-[5.25rem] aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                    isActive
                      ? 'border-resort-cta ring-2 ring-resort-cta/25 opacity-100'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <ResponsiveImage
                    {...galleryThumbSources(image.src, image.caption ?? image.alt)}
                    thumb
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    width={176}
                    height={132}
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default HomeGallery
