import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

const baseField =
  'w-full h-10 px-3.5 bg-white border border-stone-200 rounded-xl text-sm text-stone-800 placeholder:text-stone-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-forest-300 focus:border-forest-300 transition-colors disabled:bg-stone-50 disabled:text-stone-400'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(baseField, className)} {...props} />
  )
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(baseField, 'h-auto py-2.5 min-h-[5rem] resize-y', className)}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(baseField, 'pr-8 appearance-none bg-no-repeat bg-right', className)} {...props}>
      {children}
    </select>
  )
)
Select.displayName = 'Select'

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const Field = ({ label, hint, error, required, children, className }: FieldProps) => (
  <div className={cn('space-y-1.5', className)}>
    {label && (
      <label className="block text-xs font-medium text-stone-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    {children}
    {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
)
