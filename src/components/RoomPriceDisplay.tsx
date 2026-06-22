import { formatCurrency } from '../utils/rooms'
import { resolveRoomDisplayPricing } from '../utils/pricing'

interface RoomPriceDisplayProps {
  price: number
  listPrice?: number
  suffix?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showBadge?: boolean
  className?: string
}

const sizeClasses = {
  xs: {
    list: 'text-[10px] leading-tight',
    sale: 'text-base leading-tight',
    suffix: 'text-[10px] leading-tight',
    badge: 'text-[10px] px-1.5 py-0.5',
  },
  sm: {
    list: 'text-xs sm:text-sm',
    sale: 'text-lg sm:text-xl',
    suffix: 'text-xs sm:text-sm',
    badge: 'text-[10px] sm:text-xs px-1.5 py-0.5',
  },
  md: {
    list: 'text-sm',
    sale: 'text-2xl',
    suffix: 'text-sm',
    badge: 'text-xs px-2 py-0.5',
  },
  lg: {
    list: 'text-base',
    sale: 'text-4xl',
    suffix: 'text-base',
    badge: 'text-xs px-2.5 py-1',
  },
}

const RoomPriceDisplay = ({
  price,
  listPrice,
  suffix = 'per night',
  size = 'md',
  showBadge = true,
  className = '',
}: RoomPriceDisplayProps) => {
  const display = resolveRoomDisplayPricing(price, listPrice)
  const styles = sizeClasses[size]

  return (
    <div className={className}>
      {showBadge && display.promoActive && (
        <span
          className={`inline-block mb-1.5 rounded-full bg-resort-cta text-white font-semibold ${styles.badge}`}
        >
          {display.discountPercent}% OFF
        </span>
      )}
      <div
        className={`flex items-baseline gap-x-2 gap-y-0.5 ${
          size === 'xs' ? 'flex-col items-start' : 'flex-wrap'
        }`}
      >
        {display.promoActive && (
          <span className={`text-gray-400 line-through ${styles.list}`}>
            {formatCurrency(display.listPrice)}
          </span>
        )}
        <span className={`font-bold text-resort-heading ${styles.sale}`}>
          {formatCurrency(display.salePrice)}
        </span>
      </div>
      {suffix && <p className={`text-gray-600 mt-0.5 ${styles.suffix}`}>{suffix}</p>}
    </div>
  )
}

export default RoomPriceDisplay
