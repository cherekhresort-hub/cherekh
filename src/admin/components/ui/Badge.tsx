import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

type BadgeTone =
  | 'neutral'
  | 'forest'
  | 'teal'
  | 'sand'
  | 'red'
  | 'amber'
  | 'sky'
  | 'violet'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  icon?: ReactNode
  size?: 'sm' | 'md'
}

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-700 border-stone-200',
  forest:  'bg-forest-50 text-forest-700 border-forest-100',
  teal:    'bg-teal-50 text-teal-700 border-teal-100',
  sand:    'bg-sand-50 text-sand-700 border-sand-200',
  red:     'bg-red-50 text-red-700 border-red-100',
  amber:   'bg-amber-50 text-amber-700 border-amber-100',
  sky:     'bg-sky-50 text-sky-700 border-sky-100',
  violet:  'bg-violet-50 text-violet-700 border-violet-100',
}

export const Badge = ({ tone = 'neutral', icon, size = 'sm', className, children, ...props }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 border rounded-full font-medium whitespace-nowrap',
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
      tones[tone],
      className
    )}
    {...props}
  >
    {icon && <span className="inline-flex items-center [&_svg]:w-3 [&_svg]:h-3">{icon}</span>}
    {children}
  </span>
)
