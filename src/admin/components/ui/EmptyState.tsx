import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      'flex flex-col items-center justify-center text-center px-6 py-12 rounded-2xl bg-cream/60 border border-dashed border-stone-200',
      className
    )}
  >
    {icon && (
      <div className="w-14 h-14 rounded-2xl bg-white shadow-soft flex items-center justify-center text-forest-600 mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-base font-semibold text-forest-700">{title}</h3>
    {description && <p className="text-sm text-stone-500 mt-1 max-w-md">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </motion.div>
)
