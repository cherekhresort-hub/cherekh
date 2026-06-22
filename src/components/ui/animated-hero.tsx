import { motion } from 'framer-motion'
import { MoveRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AnimatedHeroText } from './animated-hero-text'
import Button from '../Button'
import { cn } from '../../lib/utils'

const DEFAULT_WORDS = ['peaceful', 'scenic', 'welcoming', 'restful', 'memorable']

export interface AnimatedHeroContentProps {
  subtitle?: string
  words?: string[]
  compact?: boolean
  showButtons?: boolean
  className?: string
}

export const AnimatedHeroContent = ({
  subtitle = 'A quiet hill retreat surrounded by nature in Thanchi, Bandarban.',
  words = DEFAULT_WORDS,
  compact = true,
  showButtons = true,
  className,
}: AnimatedHeroContentProps) => {
  return (
    <div className={cn('text-center px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto', className)}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(compact && 'hidden sm:block')}
      >
        <Link
          to="/about"
          className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-white/90 backdrop-blur-sm hover:bg-white/20 hover:text-white transition-colors mb-4 sm:mb-5"
        >
          What Cherekh means
          <MoveRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </motion.div>

      <h1
        className={
          compact
            ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-semibold text-white mb-3 lg:mb-4 leading-tight'
            : 'text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 leading-tight'
        }
      >
        <span className="block">Cherekh Center</span>
        <span className="mt-1 block text-center leading-normal">
          A <AnimatedHeroText words={words} /> stay in the hills
        </span>
      </h1>

      <motion.p
        key={subtitle}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className={cn(
          compact
            ? 'hidden sm:block text-sm sm:text-base text-white/85 mb-5 max-w-xl mx-auto leading-relaxed'
            : 'text-lg sm:text-2xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed'
        )}
      >
        {subtitle}
      </motion.p>

      {showButtons && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={cn(
            'flex justify-center gap-3',
            compact ? 'flex-row' : 'flex-col sm:flex-row gap-4'
          )}
        >
          <Button
            to="/booking"
            variant="primary"
            className={compact ? 'text-sm px-5 py-2' : undefined}
          >
            Book a stay
          </Button>
          <Button
            to="/rooms"
            variant="outline"
            className={
              compact
                ? 'text-sm px-5 py-2 !border-white/60 !text-white bg-white/10 backdrop-blur-sm hover:!bg-white hover:!text-resort-heading hover:!border-white'
                : '!border-white !text-white bg-white/10 backdrop-blur-sm hover:!bg-white hover:!text-resort-heading hover:!border-white'
            }
          >
            View rooms
          </Button>
        </motion.div>
      )}
    </div>
  )
}

export { AnimatedHeroText } from './animated-hero-text'
export type { AnimatedHeroTextProps } from './animated-hero-text'
