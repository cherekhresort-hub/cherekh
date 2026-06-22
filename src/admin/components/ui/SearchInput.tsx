import { Search, X } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
}

export const SearchInput = ({ className, value, onClear, ...props }: SearchInputProps) => (
  <div className={cn('relative', className)}>
    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
    <input
      type="search"
      value={value}
      className={cn(
        'w-full h-10 pl-10 pr-9 bg-white border border-stone-200 rounded-xl text-sm text-stone-700',
        'placeholder:text-stone-400',
        'focus:outline-none focus:ring-2 focus:ring-forest-300 focus:border-forest-300 transition-colors'
      )}
      {...props}
    />
    {value && onClear && (
      <button
        type="button"
        onClick={onClear}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 rounded-md hover:bg-stone-100"
        aria-label="Clear search"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
)
