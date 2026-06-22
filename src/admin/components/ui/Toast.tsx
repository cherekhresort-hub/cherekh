import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '../../utils/cn'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  notify: (message: string, opts?: { description?: string; variant?: ToastVariant }) => void
  success: (message: string, description?: string) => void
  error: (message: string, description?: string) => void
  info: (message: string, description?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5" />,
  error: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'border-forest-100 text-forest-700 bg-forest-50',
  error:   'border-red-100 text-red-700 bg-red-50',
  info:    'border-sky-100 text-sky-700 bg-sky-50',
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback<ToastContextValue['notify']>((message, opts) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const toast: Toast = { id, message, description: opts?.description, variant: opts?.variant ?? 'info' }
    setToasts((prev) => [...prev, toast])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const value = useMemo<ToastContextValue>(() => ({
    notify,
    success: (m, d) => notify(m, { description: d, variant: 'success' }),
    error:   (m, d) => notify(m, { description: d, variant: 'error' }),
    info:    (m, d) => notify(m, { description: d, variant: 'info' }),
  }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[22rem] max-w-[calc(100vw-2rem)]">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className={cn(
                'flex items-start gap-3 bg-white border rounded-2xl shadow-card p-4',
                variantClasses[t.variant]
              )}
            >
              <div className="mt-0.5 shrink-0">{icons[t.variant]}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t.message}</p>
                {t.description && <p className="text-xs text-stone-600 mt-0.5">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-stone-400 hover:text-stone-700 p-1"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
