import * as React from 'react'
import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Transition,
} from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface MorphButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string
  isLoading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  showArrow?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
  fullWidth?: boolean
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-flex h-5 w-5 shrink-0', className)} aria-hidden>
      <span className="absolute inset-0 rounded-full border-2 border-current/25" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-current" />
    </span>
  )
}

const MorphButton = React.forwardRef<HTMLButtonElement, MorphButtonProps>(
  (
    {
      text,
      isLoading = false,
      loadingText,
      icon,
      showArrow = false,
      variant = 'primary',
      fullWidth = false,
      className,
      onClick,
      disabled,
      type = 'button',
    },
    ref
  ) => {
    const transition: Transition = {
      type: 'spring',
      stiffness: 150,
      damping: 25,
      mass: 1,
    }

    const springHover = {
      whileHover: { y: -3, scale: 1.02 },
      whileTap: { scale: 0.98, y: 0 },
      transition: { type: 'spring' as const, stiffness: 420, damping: 22 },
    }

    const variantStyles = {
      primary:
        'bg-resort-cta text-white border-resort-cta shadow-lg shadow-resort-cta/25 hover:bg-resort-cta/95 hover:shadow-xl hover:shadow-resort-cta/30',
      secondary:
        'bg-cream text-resort-heading border-stone-200 hover:bg-sand-100 shadow-md',
      ghost:
        'bg-transparent text-resort-heading border-transparent hover:bg-stone-100',
    }

    const isDisabled = disabled || isLoading
    const showLoadingLabel = isLoading && Boolean(loadingText)

    return (
      <MotionConfig transition={transition}>
        <motion.button
          ref={ref}
          layout={!showLoadingLabel}
          type={type}
          className={cn(
            'relative group flex items-center justify-center overflow-hidden rounded-full border font-semibold tracking-wide transition-[box-shadow,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-resort-cta/40 focus-visible:ring-offset-2',
            showLoadingLabel
              ? 'h-14 min-h-14 w-full px-5 sm:px-8'
              : isLoading
                ? 'h-12 w-12 px-0'
                : fullWidth
                  ? 'h-12 w-full px-8'
                  : 'h-12 px-8',
            variantStyles[variant],
            isLoading && 'cursor-wait',
            disabled && !isLoading && 'opacity-50 cursor-not-allowed pointer-events-none',
            isLoading && 'pointer-events-none',
            className
          )}
          disabled={isDisabled}
          onClick={(e) => !isLoading && onClick?.(e)}
          aria-busy={isLoading || undefined}
          {...(!isLoading && !disabled ? springHover : {})}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isLoading ? (
              <motion.div
                key={showLoadingLabel ? `loading-${loadingText}` : 'loader'}
                className={cn(
                  'flex w-full items-center justify-center',
                  showLoadingLabel ? 'gap-3' : ''
                )}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                role="status"
                aria-live="polite"
              >
                <LoadingSpinner />
                {showLoadingLabel ? (
                  <span className="text-left text-sm font-semibold leading-snug sm:text-base">
                    {loadingText}
                  </span>
                ) : (
                  <span className="sr-only">Submitting…</span>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="content"
                className="flex items-center justify-center gap-2 whitespace-nowrap"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {icon && <motion.span layout>{icon}</motion.span>}
                <motion.span layout>{text}</motion.span>
                {showArrow && (
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </MotionConfig>
    )
  }
)

MorphButton.displayName = 'MorphButton'

export { MorphButton }
