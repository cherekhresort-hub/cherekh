import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const PHRASES = [
  'Wandering the hallways of Cherekh…',
  'Peeking through every balcony door…',
  'Fluffing pillows in the free rooms…',
  'Asking the hills which rooms are open…',
]

interface RoomSearchLoaderProps {
  compact?: boolean
}

/** Shown while room availability is loading, in place of an empty "no rooms" state. */
const RoomSearchLoader = ({ compact = false }: RoomSearchLoaderProps) => {
  const reduceMotion = useReducedMotion()
  const [phrase, setPhrase] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => setPhrase((i) => (i + 1) % PHRASES.length), 1800)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative overflow-hidden rounded-2xl border border-stone-200/80 bg-cream text-center ${
        compact ? 'px-4 py-6' : 'px-6 py-10 sm:py-12'
      }`}
    >
      <svg
        viewBox="0 0 400 60"
        preserveAspectRatio="none"
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 w-full text-resort-heading/10"
      >
        <motion.path
          d="M0 60 L0 42 Q40 18 80 34 T160 28 Q200 8 240 30 T320 24 Q360 14 400 32 L400 60 Z"
          fill="currentColor"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>

      <motion.p
        className={`relative font-serif italic bg-gradient-to-r from-resort-heading via-resort-cta to-resort-heading bg-clip-text text-transparent ${
          compact ? 'text-xl' : 'text-2xl sm:text-3xl'
        }`}
        style={{ backgroundSize: '200% auto' }}
        animate={reduceMotion ? undefined : { backgroundPosition: ['0% 50%', '200% 50%'] }}
        transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
      >
        Finding your corner of the hills
      </motion.p>

      <div className={`relative mt-2 text-sm text-stone-500 ${compact ? 'h-5' : 'h-6 sm:text-base'}`}>
        <AnimatePresence mode="wait">
          <motion.p
            key={phrase}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.35 }}
          >
            {PHRASES[phrase]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="relative mt-4 flex justify-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="h-1.5 w-1.5 rounded-full bg-resort-cta"
            animate={reduceMotion ? undefined : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: dot * 0.18 }}
          />
        ))}
      </div>
    </div>
  )
}

export default RoomSearchLoader
