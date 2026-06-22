import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  /** Render a fully custom header in place of title/subtitle (keeps close X). */
  header?: ReactNode
  /** Sticky band rendered between header and scrolling content. */
  toolbar?: ReactNode
  side?: 'right' | 'left'
  width?: 'sm' | 'md' | 'lg' | 'xl'
  children: ReactNode
  footer?: ReactNode
  /** Remove default padding around children — useful for full-bleed sections. */
  contentPadding?: boolean
}

const widthMap = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
}

export const Drawer = ({
  open,
  onClose,
  title,
  subtitle,
  header,
  toolbar,
  side = 'right',
  width = 'md',
  children,
  footer,
  contentPadding = true,
}: DrawerProps) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const isLeft = side === 'left'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: isLeft ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: isLeft ? '-100%' : '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={cn(
              'absolute top-0 bottom-0 w-full bg-white shadow-pop flex flex-col',
              widthMap[width],
              isLeft ? 'left-0' : 'right-0'
            )}
          >
            {header ? (
              <div className="relative">
                {header}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute top-4 right-4 text-stone-500 hover:text-stone-800 rounded-lg p-1.5 hover:bg-white/70 backdrop-blur-sm transition-colors z-10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between gap-4">
                <div>
                  {title && <h2 className="text-lg font-serif text-forest-700">{title}</h2>}
                  {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="text-stone-500 hover:text-stone-800 rounded-lg p-1 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {toolbar && (
              <div className="sticky top-0 z-10 px-6 py-3 border-b border-stone-100 bg-white/90 backdrop-blur-md">
                {toolbar}
              </div>
            )}
            <div className={cn('flex-1 overflow-y-auto', contentPadding && 'px-6 py-5')}>
              {children}
            </div>
            {footer && <div className="px-6 py-4 border-t border-stone-100 bg-stone-50">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}
