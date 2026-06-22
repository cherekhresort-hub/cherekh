import CountBadge from './CountBadge'

interface BookNowNavButtonProps {
  onClick: () => void
  selectedCount: number
  className?: string
  size?: 'compact' | 'desktop'
  fullWidth?: boolean
}

const sizeClasses = {
  compact: 'px-3 py-1.5 text-xs',
  desktop: 'px-[0.85rem] py-[0.425rem] text-[0.85rem] leading-tight',
} as const

const BookNowNavButton = ({
  onClick,
  selectedCount,
  className = '',
  size = 'compact',
  fullWidth = false,
}: BookNowNavButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-resort-cta font-medium text-white transition-colors duration-200 hover:bg-resort-cta/90 whitespace-nowrap ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    aria-label={
      selectedCount > 0
        ? `Book ${selectedCount} selected ${selectedCount === 1 ? 'room' : 'rooms'}`
        : 'Book a room at Cherekh Center'
    }
  >
    Book Now
    {selectedCount > 0 && <CountBadge count={selectedCount} />}
  </button>
)

export default BookNowNavButton
