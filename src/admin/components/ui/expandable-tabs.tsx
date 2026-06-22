import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useOnClickOutside } from 'usehooks-ts'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../utils/cn'

interface Tab {
  title: string
  icon: LucideIcon
  badge?: number
  type?: never
}

interface Separator {
  type: 'separator'
  title?: never
  icon?: never
}

export type ExpandableTabItem = Tab | Separator

interface ExpandableTabsProps {
  tabs: ExpandableTabItem[]
  className?: string
  activeColor?: string
  /** Controlled selection (e.g. from current route). Disables outside-click deselect. */
  selectedIndex?: number | null
  onChange?: (index: number | null) => void
}

const buttonVariants = {
  initial: {
    gap: 0,
    paddingLeft: '.5rem',
    paddingRight: '.5rem',
  },
  animate: (isSelected: boolean) => ({
    gap: isSelected ? '.5rem' : 0,
    paddingLeft: isSelected ? '1rem' : '.5rem',
    paddingRight: isSelected ? '1rem' : '.5rem',
  }),
}

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: 'auto', opacity: 1 },
  exit: { width: 0, opacity: 0 },
}

const transition = { delay: 0.1, type: 'spring', bounce: 0, duration: 0.6 }

export function ExpandableTabs({
  tabs,
  className,
  activeColor = 'text-forest-700',
  selectedIndex: selectedIndexProp,
  onChange,
}: ExpandableTabsProps) {
  const [internalSelected, setInternalSelected] = React.useState<number | null>(null)
  const outsideClickRef = React.useRef<HTMLDivElement>(null)
  const isControlled = selectedIndexProp !== undefined
  const selected = isControlled ? selectedIndexProp : internalSelected

  useOnClickOutside(outsideClickRef, () => {
    if (isControlled) return
    setInternalSelected(null)
    onChange?.(null)
  })

  const handleSelect = (index: number) => {
    if (!isControlled) {
      setInternalSelected(index)
    }
    onChange?.(index)
  }

  const Separator = () => (
    <div className="mx-1 h-6 w-px shrink-0 bg-stone-200" aria-hidden="true" />
  )

  return (
    <div
      ref={outsideClickRef}
      className={cn(
        'flex items-center gap-1 rounded-2xl border border-stone-200/80 bg-white p-1 shadow-soft',
        className
      )}
    >
      {tabs.map((tab, index) => {
        if (tab.type === 'separator') {
          return <Separator key={`separator-${index}`} />
        }

        const Icon = tab.icon
        const isSelected = selected === index
        const showBadge = tab.badge !== undefined && tab.badge > 0

        return (
          <motion.button
            key={`${tab.title}-${index}`}
            type="button"
            variants={buttonVariants}
            initial={false}
            animate="animate"
            custom={isSelected}
            onClick={() => handleSelect(index)}
            transition={transition}
            aria-current={isSelected ? 'page' : undefined}
            aria-label={tab.title}
            className={cn(
              'relative flex shrink-0 items-center rounded-xl px-2 py-2 text-sm font-medium transition-colors duration-300',
              isSelected
                ? cn('bg-forest-50', activeColor)
                : 'text-stone-500 hover:bg-stone-50 hover:text-forest-700'
            )}
          >
            <span className="relative">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
              {showBadge && (
                <span className="absolute -top-1.5 -right-2 inline-flex items-center justify-center min-w-[0.9rem] h-[0.9rem] px-0.5 text-[8px] font-semibold rounded-full bg-resort-cta text-white">
                  {tab.badge! > 99 ? '99+' : tab.badge}
                </span>
              )}
            </span>
            <AnimatePresence initial={false}>
              {isSelected && (
                <motion.span
                  variants={spanVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={transition}
                  className="overflow-hidden whitespace-nowrap"
                >
                  {tab.title}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )
      })}
    </div>
  )
}
