import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaUsers, FaCoffee } from 'react-icons/fa'
import { Check } from 'lucide-react'
import { resolveRoomDisplayPricing } from '../utils/pricing'
import ResponsiveImage from './ResponsiveImage'
import RoomPriceDisplay from './RoomPriceDisplay'
import { cardImageSources } from '../utils/responsiveImage'

interface RoomCardProps {
  id: string
  name: string
  image: string
  roomNumber?: string
  bedType?: string
  features: string[]
  price?: number
  listPrice?: number
  guests?: number
  maxGuests?: number
  count?: number
  capacity?: string
  status?: string
  type?: 'room' | 'facility'
  compact?: boolean
  /** Facility cards: custom button label and destination */
  ctaLabel?: string
  ctaHref?: string
  selectable?: boolean
  selected?: boolean
  onSelectToggle?: (id: string) => void
}

const RoomCard = ({
  id,
  name,
  image,
  roomNumber,
  bedType,
  features,
  price,
  listPrice,
  guests,
  maxGuests,
  count,
  capacity,
  status,
  type = 'room',
  compact = false,
  ctaLabel,
  ctaHref,
  selectable = false,
  selected = false,
  onSelectToggle,
}: RoomCardProps) => {
  const displayPricing =
    price !== undefined && price > 0 ? resolveRoomDisplayPricing(price, listPrice) : null

  const facilityHref =
    ctaHref ?? (id === 'conference' ? '/conference-room' : `/rooms/${id}`)
  const facilityCtaLabel = ctaLabel ?? 'Learn More'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, boxShadow: '0 20px 40px -8px rgba(0,0,0,0.13)' }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-cream rounded-xl sm:rounded-2xl overflow-hidden shadow-lg transition-shadow duration-300 ${
        selected ? 'ring-2 ring-resort-cta ring-offset-2' : ''
      }`}
    >
      <div
        className={`relative overflow-hidden ${
          compact ? 'h-32 sm:h-48 md:h-64' : 'h-64'
        }`}
      >
        <ResponsiveImage
          {...cardImageSources(image, name)}
          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
          loading="lazy"
          decoding="async"
        />
        {status && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 px-2 py-0.5 sm:px-3 sm:py-1 bg-yellow-500 text-white rounded-full text-xs sm:text-sm font-medium">
            {status}
          </div>
        )}
        {type === 'room' && selected && (
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex h-7 w-7 items-center justify-center rounded-full bg-resort-cta text-white shadow-md sm:h-8 sm:w-8">
            <Check className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
        {type === 'room' && displayPricing?.promoActive && (
          <div className="absolute top-2 left-2 sm:top-4 sm:left-4 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-resort-cta text-white rounded-full text-[10px] sm:text-xs font-semibold shadow-md">
            {displayPricing.discountPercent}% OFF
          </div>
        )}
      </div>
      <div className={compact ? 'p-3 sm:p-4 md:p-6' : 'p-6'}>
        <h3
          className={`font-serif text-resort-heading mb-1 sm:mb-2 ${
            compact ? 'text-base sm:text-xl md:text-2xl' : 'text-2xl'
          }`}
        >
          {name}
        </h3>
        {roomNumber && (
          <p className="text-xs sm:text-sm font-medium text-resort-cta mb-1">
            Room No. {roomNumber}
          </p>
        )}
        {bedType && (
          <p className={`text-gray-600 mb-1 sm:mb-2 ${compact ? 'text-xs sm:text-sm' : ''}`}>
            {bedType}
          </p>
        )}
        {type === 'room' && guests !== undefined && (
          <p
            className={`flex items-center gap-1.5 text-gray-600 mb-1 sm:mb-2 ${
              compact ? 'text-xs sm:text-sm' : 'text-sm'
            }`}
          >
            <FaUsers
              className={`flex-shrink-0 text-resort-heading ${compact ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-4 h-4'}`}
              aria-hidden="true"
            />
            <span>
              <span className="font-medium text-resort-heading">{guests}</span>{' '}
              {guests === 1 ? 'guest' : 'guests'} included
              {maxGuests !== undefined && (
                <>
                  {' · '}
                  Max <span className="font-medium text-resort-heading">{maxGuests}</span>{' '}
                  {maxGuests === 1 ? 'guest' : 'guests'}
                </>
              )}
            </span>
          </p>
        )}
        {type === 'room' && (
          <p
            className={`flex items-center gap-1.5 text-gray-600 mb-1 sm:mb-2 ${
              compact ? 'text-xs sm:text-sm' : 'text-sm'
            }`}
          >
            <FaCoffee
              className={`flex-shrink-0 text-resort-heading ${compact ? 'w-3 h-3 sm:w-3.5 sm:h-3.5' : 'w-4 h-4'}`}
              aria-hidden="true"
            />
            <span>Complimentary breakfast</span>
          </p>
        )}
        {count && (
          <p className={`text-gray-600 mb-1 sm:mb-2 ${compact ? 'text-xs sm:text-sm' : ''}`}>
            <span className="font-medium">{count}</span> {count === 1 ? 'room' : 'rooms'} available
          </p>
        )}
        {capacity && (
          <p className={`text-gray-600 mb-1 sm:mb-2 ${compact ? 'text-xs sm:text-sm' : ''}`}>
            Capacity: <span className="font-medium">{capacity}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4">
          {features
            .filter((feature) => !/^Up to \d+ Guests$/.test(feature))
            .slice(0, compact ? 2 : 3)
            .map((feature, index) => (
            <span
              key={index}
              className={`px-2 py-0.5 sm:px-3 sm:py-1 bg-resort-bg text-gray-700 rounded-full text-xs sm:text-sm ${
                compact ? 'hidden sm:inline-flex' : ''
              }`}
            >
              {feature}
            </span>
          ))}
        </div>
        <div
          className={
            compact
              ? 'mt-2 sm:mt-3 flex flex-col gap-2'
              : 'mt-3 sm:mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'
          }
        >
          {type === 'room' && price !== undefined && price > 0 ? (
            <>
              <RoomPriceDisplay
                price={price}
                listPrice={listPrice}
                size={compact ? 'xs' : 'md'}
                showBadge={!compact}
                className={compact ? 'min-w-0' : undefined}
              />
              <div className={`flex gap-2 ${compact ? 'w-full' : 'w-full sm:w-auto'}`}>
                {selectable && onSelectToggle && (
                  <button
                    type="button"
                    onClick={() => onSelectToggle(id)}
                    aria-pressed={selected}
                    aria-label={selected ? `Deselect ${name}` : `Select ${name}`}
                    className={`flex-1 rounded-full font-medium text-center transition-colors duration-200 ${
                      compact ? 'px-3 py-2 text-xs sm:text-sm' : 'px-5 py-2 text-sm'
                    } ${
                      selected
                        ? 'bg-resort-heading text-white hover:bg-resort-heading/90'
                        : 'border border-stone-300 text-resort-heading hover:border-resort-cta hover:text-resort-cta'
                    }`}
                  >
                    {selected ? 'Selected' : 'Select'}
                  </button>
                )}
                <Link
                  to={id === 'conference' ? '/conference-room' : `/rooms/${id}`}
                  className={`shrink-0 bg-resort-cta text-white rounded-full hover:bg-resort-cta/90 transition-colors duration-200 font-medium text-center ${
                    selectable
                      ? `flex-1 ${compact ? 'px-3 py-2 text-xs sm:text-sm' : 'px-5 py-2 text-sm'}`
                      : compact
                        ? 'w-full px-3 py-2 text-xs sm:text-sm'
                        : 'w-full sm:w-auto px-6 py-2'
                  }`}
                  aria-label={`View details for ${name}`}
                >
                  View Details
                </Link>
              </div>
            </>
          ) : (
            <Link
              to={facilityHref}
              className={`w-full bg-resort-cta text-white rounded-full hover:bg-resort-cta/90 transition-colors duration-200 font-medium text-center ${
                compact ? 'px-3 py-1.5 text-xs sm:px-6 sm:py-2 sm:text-sm' : 'px-6 py-2'
              }`}
              aria-label={`${facilityCtaLabel}, ${name}`}
            >
              {facilityCtaLabel}
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default RoomCard
