import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export interface AnimatedHeroTextProps {
  words: string[]
  /** Milliseconds between word changes */
  intervalMs?: number
  className?: string
  wordClassName?: string
}

export const AnimatedHeroText = ({
  words,
  intervalMs = 2000,
  className,
  wordClassName,
}: AnimatedHeroTextProps) => {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (words.length <= 1) return

    const timeoutId = window.setTimeout(() => {
      setActiveIndex((current) => (current === words.length - 1 ? 0 : current + 1))
    }, intervalMs)

    return () => window.clearTimeout(timeoutId)
  }, [activeIndex, intervalMs, words.length])

  if (words.length === 0) return null

  const activeWord = words[activeIndex] ?? words[0]
  const wordClasses = cn(
    'whitespace-nowrap font-semibold text-resort-cta leading-normal',
    wordClassName
  )

  return (
    <span className={cn('inline-grid align-baseline leading-normal', className)} aria-live="polite">
      {/* Slot width + line height track the active word exactly */}
      <span className={cn('invisible col-start-1 row-start-1', wordClasses)} aria-hidden>
        {activeWord}
      </span>

      <span className="col-start-1 row-start-1 overflow-hidden">
        <span className="relative block">
          {words.map((word, index) => (
            <motion.span
              key={word}
              className={cn('absolute left-0 top-0 w-max', wordClasses)}
              initial={false}
              transition={{ type: 'spring', stiffness: 50 }}
              animate={
                activeIndex === index
                  ? { y: '0%', opacity: 1 }
                  : { y: activeIndex > index ? '-100%' : '100%', opacity: 0 }
              }
            >
              {word}
            </motion.span>
          ))}
        </span>
      </span>
    </span>
  )
}
