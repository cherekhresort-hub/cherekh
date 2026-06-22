import { useEffect, useState, type ComponentType } from 'react'
import type { Settings } from 'react-slick'
import Button from './Button'
import ResponsiveImage from './ResponsiveImage'
import { AnimatedHeroContent } from './ui/animated-hero'
import { heroImageSources } from '../utils/responsiveImage'
import { hideHeroSplash } from '../utils/heroSplash'

interface HeroSlide {
  image: string
  title: string
  subtitle?: string
}

interface HeroProps {
  title?: string
  subtitle?: string
  image?: string
  images?: string[]
  slides?: HeroSlide[]
  showButtons?: boolean
  compact?: boolean
}

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches

const HeroSlideImage = ({
  slide,
  idx,
  heroHeight,
  compact,
}: {
  slide: HeroSlide
  idx: number
  heroHeight: string
  compact: boolean
}) => (
  <div className={`relative ${heroHeight}`}>
    <ResponsiveImage
      {...heroImageSources(slide.image, slide.title)}
      className="w-full h-full object-cover"
      loading={idx === 0 ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={idx === 0 ? 'high' : 'low'}
      onLoad={idx === 0 ? hideHeroSplash : undefined}
    />
    <div className={`absolute inset-0 ${compact ? 'bg-black/50' : 'bg-black/40'}`} />
  </div>
)

const Hero = ({
  title,
  subtitle,
  image,
  images,
  slides,
  showButtons = true,
  compact = false,
}: HeroProps) => {
  let heroSlides: HeroSlide[] = []

  if (slides && slides.length > 0) {
    heroSlides = slides
  } else if (images && images.length > 0) {
    heroSlides = images.map((img) => ({
      image: img,
      title: title || 'Experience Peace in the Hills of Thanchi',
      subtitle,
    }))
  } else if (image) {
    heroSlides = [
      {
        image,
        title: title || 'Experience Peace in the Hills of Thanchi',
        subtitle,
      },
    ]
  } else {
    heroSlides = [
      {
        image: '/cherekhImages/homepageHero/hero01.jpg',
        title: title || 'Experience Peace in the Hills of Thanchi',
        subtitle,
      },
    ]
  }

  const [currentSlide, setCurrentSlide] = useState(0)
  const [isMobile] = useState(isMobileViewport)
  const [carouselReady, setCarouselReady] = useState(heroSlides.length <= 1 || isMobile)
  const [Slider, setSlider] = useState<ComponentType<{ children?: React.ReactNode } & Settings> | null>(
    null
  )

  useEffect(() => {
    const splashTimer = window.setTimeout(hideHeroSplash, 3500)
    return () => window.clearTimeout(splashTimer)
  }, [])

  useEffect(() => {
    if (isMobile || heroSlides.length <= 1) return

    const timer = window.setTimeout(() => {
      void Promise.all([
        import('react-slick'),
        import('slick-carousel/slick/slick.css'),
        import('slick-carousel/slick/slick-theme.css'),
      ]).then(([mod]) => {
        setSlider(() => mod.default)
        setCarouselReady(true)
      })
    }, 3000)

    return () => window.clearTimeout(timer)
  }, [heroSlides.length, isMobile])

  const settings: Settings = {
    dots: true,
    infinite: true,
    speed: 1000,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    cssEase: 'linear',
    pauseOnHover: false,
    arrows: false,
    dotsClass: 'slick-dots hero-dots',
    beforeChange: (_current: number, next: number) => {
      setCurrentSlide(next)
    },
  }

  const heroHeight = compact
    ? 'h-[52vh] min-h-[22rem] max-h-[32rem] md:max-h-none md:h-[63.3vh] md:min-h-[28.4rem] lg:h-[74.3vh] lg:min-h-[35rem] xl:min-h-[39.4rem]'
    : 'h-screen min-h-[28rem]'

  const activeSubtitle =
    heroSlides[currentSlide]?.subtitle ??
    'Boutique hill accommodation · River valley · Curated stays'

  const firstSlide = heroSlides[0]!

  return (
    <div className={`relative ${heroHeight} flex items-center justify-center overflow-hidden z-[2]`}>
      <div className="absolute inset-0 z-0">
        {carouselReady && Slider ? (
          <Slider {...settings}>
            {heroSlides.map((slide, idx) => (
              <div key={slide.image}>
                <HeroSlideImage slide={slide} idx={idx} heroHeight={heroHeight} compact={compact} />
              </div>
            ))}
          </Slider>
        ) : (
          <HeroSlideImage slide={firstSlide} idx={0} heroHeight={heroHeight} compact={compact} />
        )}
      </div>

      {compact ? (
        <div className="relative z-10 w-full">
          <AnimatedHeroContent subtitle={activeSubtitle} compact showButtons={showButtons} />
        </div>
      ) : (
        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6">
            {heroSlides[currentSlide]?.title}
          </h1>
          {heroSlides[currentSlide]?.subtitle && (
            <p className="text-lg sm:text-2xl text-white/90 mb-8">
              {heroSlides[currentSlide]?.subtitle}
            </p>
          )}
          {showButtons && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button to="/booking" variant="primary">
                Book a stay
              </Button>
              <Button
                to="/rooms"
                variant="outline"
                className="!border-white !text-white bg-white/10 backdrop-blur-sm hover:!bg-white hover:!text-resort-heading hover:!border-white"
              >
                View rooms
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Hero
