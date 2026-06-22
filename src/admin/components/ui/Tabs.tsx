import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

export interface TabItem<T extends string = string> {
  value: T
  label: ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  items: TabItem<T>[]
  className?: string
  /** Used as the framer-motion layoutId — make unique per group so multiple
   * Tabs instances on the page don't share the animated indicator. */
  layoutId?: string
}

export const Tabs = <T extends string>({
  value,
  onChange,
  items,
  className,
  layoutId = 'active-tab',
}: TabsProps<T>) => (
  <div className={cn('inline-flex bg-stone-100 rounded-xl p-1 gap-1', className)}>
    {items.map((item) => {
      const active = item.value === value
      return (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'relative px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors',
            'inline-flex items-center gap-2',
            active ? 'text-forest-700' : 'text-stone-600 hover:text-stone-800'
          )}
        >
          {active && (
            <motion.span
              layoutId={layoutId}
              className="absolute inset-0 bg-white rounded-lg shadow-soft"
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            />
          )}
          <span className="relative z-10">{item.label}</span>
          {typeof item.count === 'number' && (
            <span
              className={cn(
                'relative z-10 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs rounded-full',
                active ? 'bg-forest-100 text-forest-700' : 'bg-stone-200 text-stone-700'
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      )
    })}
  </div>
)
