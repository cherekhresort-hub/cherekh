import { useEffect, useRef, useState, type ComponentType } from 'react'
import type { Settings } from 'react-slick'
import { Volume2, VolumeX } from 'lucide-react'
import Button from './Button'
import ResponsiveImage from './ResponsiveImage'
import { AnimatedHeroContent } from './ui/animated-hero'
import { heroImageSources } from '../utils/responsiveImage'
import { hideHeroSplash } from '../utils/heroSplash'

interface HeroSlide {
  image: string
  /** WebP srcset for images outside the optimize-images pipeline (e.g. video poster frames). */
  srcSet?: string
  title: string
  subtitle?: string
}

export interface HeroVideo {
  /** Wide screens. */
  src: string
  /** Phones (smaller file). */
  mobileSrc?: string
  poster?: string
}

interface HeroProps {
  title?: string
  subtitle?: string
  image?: string
  images?: string[]
  slides?: HeroSlide[]
  video?: HeroVideo
  showButtons?: boolean
  compact?: boolean
}

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches

/** Reduced-motion and data-saver visitors keep the still image slider. */
const canPlayHeroVideo = () => {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return !connection?.saveData
}

/** Set once the visitor presses Mute, so the hero stays quiet for the rest of the visit. */
const HERO_MUTED_KEY = 'cherekh_hero_muted'

const visitorChoseMute = (): boolean => {
  try {
    return sessionStorage.getItem(HERO_MUTED_KEY) === '1'
  } catch {
    return false
  }
}

const rememberMuteChoice = (mutedByVisitor: boolean) => {
  try {
    if (mutedByVisitor) sessionStorage.setItem(HERO_MUTED_KEY, '1')
    else sessionStorage.removeItem(HERO_MUTED_KEY)
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

const HeroVideoLayer = ({ video, isMobile }: { video: HeroVideo; isMobile: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const wantSoundRef = useRef(!visitorChoseMute())
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const src = isMobile && video.mobileSrc ? video.mobileSrc : video.src

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let inView = true

    // Browsers refuse audible autoplay until the visitor interacts with the page; fall back to muted.
    const play = () => {
      el.muted = !wantSoundRef.current
      if (!el.muted) el.volume = 1
      el.play()
        .then(() => setMuted(el.muted))
        .catch(() => {
          if (el.muted) return
          el.muted = true
          setMuted(true)
          void el.play().catch(() => {})
        })
    }

    const sync = () => {
      if (inView && document.visibilityState === 'visible') play()
      else el.pause()
    }

    const unlockSound = (event: Event) => {
      if (!wantSoundRef.current || !el.muted) return
      if (buttonRef.current?.contains(event.target as Node)) return
      el.muted = false
      el.volume = 1
      setMuted(false)
      if (inView && document.visibilityState === 'visible') void el.play().catch(() => {})
    }
    const unlockEvents = ['pointerdown', 'keydown', 'touchend'] as const
    unlockEvents.forEach((name) => document.addEventListener(name, unlockSound, { capture: true }))

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        sync()
      },
      { threshold: 0.25 }
    )
    observer.observe(el)
    document.addEventListener('visibilitychange', sync)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      unlockEvents.forEach((name) => document.removeEventListener(name, unlockSound, { capture: true }))
    }
  }, [])

  const toggleSound = () => {
    const el = ref.current
    if (!el) return
    const nextMuted = !muted
    el.muted = nextMuted
    if (!nextMuted) {
      el.volume = 1
      void el.play().catch(() => {})
    }
    wantSoundRef.current = !nextMuted
    rememberMuteChoice(nextMuted)
    setMuted(nextMuted)
  }

  return (
    <>
      <video
        ref={ref}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          playing ? 'opacity-100' : 'opacity-0'
        }`}
        src={src}
        poster={video.poster}
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => {
          setPlaying(true)
          hideHeroSplash()
        }}
      />
      {playing && (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleSound}
          className="absolute z-20 bottom-20 right-4 sm:bottom-24 sm:right-6 lg:right-8 inline-flex items-center gap-2 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white text-xs sm:text-sm font-medium px-3.5 py-2 border border-white/25 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label={muted ? 'Turn video sound on' : 'Mute video'}
          aria-pressed={!muted}
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span>{muted ? 'Sound on' : 'Mute'}</span>
        </button>
      )}
    </>
  )
}

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
      {...(slide.srcSet
        ? { src: slide.image, alt: slide.title, webpSrcSet: slide.srcSet, sizes: '100vw', width: 1280, height: 720 }
        : heroImageSources(slide.image, slide.title))}
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
  video,
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
  // Viewport-dependent state starts at the build-time values and is resolved after mount,
  // so the first client render matches the prerendered HTML.
  const [isMobile, setIsMobile] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const [viewportResolved, setViewportResolved] = useState(false)
  const [carouselReady, setCarouselReady] = useState(heroSlides.length <= 1)
  const [Slider, setSlider] = useState<ComponentType<{ children?: React.ReactNode } & Settings> | null>(
    null
  )

  useEffect(() => {
    setIsMobile(isMobileViewport())
    setShowVideo(Boolean(video) && canPlayHeroVideo())
    setViewportResolved(true)
  }, [video])

  useEffect(() => {
    const splashTimer = window.setTimeout(hideHeroSplash, 3500)
    return () => window.clearTimeout(splashTimer)
  }, [])

  useEffect(() => {
    if (!showVideo || heroSlides.length <= 1) return
    const timer = window.setInterval(() => {
      setCurrentSlide((i) => (i + 1) % heroSlides.length)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [showVideo, heroSlides.length])

  useEffect(() => {
    // With a video hero the slides only carry rotating subtitles; never fetch the photo carousel.
    if (!viewportResolved || video || isMobile || heroSlides.length <= 1) return

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
  }, [heroSlides.length, isMobile, video, viewportResolved])

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
        {showVideo && video ? (
          <div className={`relative ${heroHeight}`}>
            <HeroSlideImage slide={firstSlide} idx={0} heroHeight={heroHeight} compact={compact} />
            <HeroVideoLayer video={video} isMobile={isMobile} />
            <div className={`absolute inset-0 pointer-events-none ${compact ? 'bg-black/45' : 'bg-black/35'}`} />
          </div>
        ) : carouselReady && Slider ? (
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
