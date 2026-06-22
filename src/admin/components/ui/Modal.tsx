import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeMap = {
  sm: 'max-w-[100vw] sm:max-w-sm',
  md: 'max-w-[100vw] sm:max-w-lg',
  lg: 'max-w-[100vw] sm:max-w-2xl',
  xl: 'max-w-[100vw] sm:max-w-4xl',
}

export const Modal = ({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) => {
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-x-hidden">
          <motion.div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative w-full bg-white shadow-pop overflow-hidden flex flex-col',
              'min-w-0',
              'rounded-t-3xl rounded-b-none sm:rounded-3xl',
              'max-h-[100dvh] sm:max-h-[90vh]',
              sizeMap[size]
            )}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {(title || description) && (
              <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-stone-100 flex items-start justify-between gap-4">
                <div>
                  {title && <h2 className="text-lg font-serif text-forest-700">{title}</h2>}
                  {description && <p className="text-sm text-stone-500 mt-1">{description}</p>}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-stone-500 hover:text-stone-800 transition-colors rounded-lg p-1 hover:bg-stone-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto min-h-0">{children}</div>
            {footer && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-stone-100 bg-stone-50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
