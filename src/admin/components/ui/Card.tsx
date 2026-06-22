import { forwardRef, type HTMLAttributes } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '../../utils/cn'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean
  padded?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, padded = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bg-white border border-stone-100 rounded-2xl shadow-soft transition-all',
        padded && 'p-6',
        interactive && 'hover:shadow-card hover:-translate-y-0.5 cursor-pointer',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

type MotionCardProps = HTMLMotionProps<'div'> & { padded?: boolean }

export const MotionCard = ({ className, padded = true, ...props }: MotionCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className={cn(
      'bg-white border border-stone-100 rounded-2xl shadow-soft',
      padded && 'p-6',
      className
    )}
    {...props}
  />
)

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-start justify-between gap-4 mb-4', className)} {...props} />
)

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-base font-semibold text-forest-700', className)} {...props} />
)

export const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-stone-500 mt-1', className)} {...props} />
)
