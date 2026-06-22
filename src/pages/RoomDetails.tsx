import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import Button from '../components/Button'
import RoomPriceDisplay from '../components/RoomPriceDisplay'
import { getRoomById, formatCurrency, getAvailableRooms } from '../utils/rooms'
import { loadRoomRates, ROOM_RATES_CHANGED_EVENT } from '../lib/roomRatesDb'
import {
  facilityCatalog,
  getCatalogRoomById,
  getGuestPolicyLabel,
  calculateExtraGuestCountForParty,
} from '../data/roomCatalog'
import { addDaysToDateString, getTodayDate, toLocalDateString } from '../utils/dates'
import { withRateLimit, RateLimitPresets } from '../utils/rateLimiter'
import { validateFormSubmission, createProtectedFormData } from '../utils/csrf'

const FACILITY_IDS = ['conference', 'restaurant', 'reception', 'waiting-lounge']

interface RoomDisplay {
  name: string
  images: string[]
  description: string
  amenities: string[]
  bedType?: string
  size?: string
  guests?: number
  includedGuests?: number
  maxExtraGuests?: number
  extraGuestPrice?: number
  maxGuests?: number
  guestPolicyLabel?: string
  count?: number
  roomNumber?: string
  label?: string
  floor?: number
  capacity?: string
  status?: string
  youtubeVideoId?: string
}

const RoomDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [roomPrice, setRoomPrice] = useState<number | null>(null)
  const [roomListPrice, setRoomListPrice] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [bookingData, setBookingData] = useState({
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
  })
  const [bookingErrors, setBookingErrors] = useState({
    checkIn: '',
    checkOut: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const syncPrice = () => {
      if (!id) return
      const storedRoom = getRoomById(id)
      if (storedRoom) {
        setRoomPrice(storedRoom.price)
        setRoomListPrice(storedRoom.listPrice)
      }
    }

    syncPrice()
    void loadRoomRates().then(syncPrice)
    window.addEventListener(ROOM_RATES_CHANGED_EVENT, syncPrice)
    return () => window.removeEventListener(ROOM_RATES_CHANGED_EVENT, syncPrice)
  }, [id])

  const getMinCheckInDate = () => getTodayDate()

  const getMaxCheckInDate = () => {
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 1)
    return toLocalDateString(maxDate)
  }

  const getMinCheckOutDate = () => {
    if (!bookingData.checkIn) return getMinCheckInDate()
    return addDaysToDateString(bookingData.checkIn, 1)
  }

  const handleBookingChange = (
    field: 'checkIn' | 'checkOut' | 'adults' | 'children',
    value: string | number
  ) => {
    setBookingData((prev) => ({
      ...prev,
      [field]: value,
    }))

    setBookingErrors((prev) => ({
      ...prev,
      [field]: '',
    }))

    if (field === 'checkIn' && bookingData.checkOut) {
      const newCheckIn = new Date(value as string)
      const currentCheckOut = new Date(bookingData.checkOut)
      if (currentCheckOut <= newCheckIn) {
        setBookingData((prev) => ({
          ...prev,
          checkOut: '',
        }))
      }
    }
  }

  const handleQuickBook = async () => {
    const today = getMinCheckInDate()

    if (!bookingData.checkIn) {
      setBookingErrors((prev) => ({ ...prev, checkIn: 'Please select check-in date' }))
      return
    }

    if (bookingData.checkIn < today) {
      setBookingErrors((prev) => ({ ...prev, checkIn: 'Check-in date cannot be in the past' }))
      return
    }

    if (!bookingData.checkOut) {
      setBookingErrors((prev) => ({ ...prev, checkOut: 'Please select check-out date' }))
      return
    }

    if (bookingData.checkOut <= bookingData.checkIn) {
      setBookingErrors((prev) => ({ ...prev, checkOut: 'Check-out must be after check-in' }))
      return
    }

    if (id && !FACILITY_IDS.includes(id)) {
      const availableRooms = await getAvailableRooms(bookingData.checkIn, bookingData.checkOut)
      const roomAvailable = availableRooms.some((r) => r.id === id)

      if (!roomAvailable) {
        alert('This room is not available for the selected dates. Please choose different dates.')
        return
      }
    }

    const protectedData = createProtectedFormData(bookingData)
    if (!validateFormSubmission(protectedData)) {
      alert('Security validation failed. Please refresh the page and try again.')
      return
    }

    setIsSubmitting(true)
    try {
      await withRateLimit(RateLimitPresets.BOOKING_FORM, async () => {
        const params = new URLSearchParams({
          roomType: id || '',
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          adults: String(bookingData.adults),
          children: String(bookingData.children),
        })
        navigate(`/booking?${params.toString()}`)
      })
    } catch (error: any) {
      if (error.message && error.message.includes('Rate limit exceeded')) {
        alert(error.message)
      } else {
        alert('Unable to proceed with booking. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const catalogRoom = id ? getCatalogRoomById(id) : undefined
  const facility =
  id && FACILITY_IDS.includes(id)
      ? facilityCatalog[id as keyof typeof facilityCatalog]
      : undefined

  const room: RoomDisplay | null = catalogRoom
    ? {
        name: catalogRoom.name,
        images: catalogRoom.images,
        bedType: catalogRoom.bedType,
        size: catalogRoom.size,
        guests: catalogRoom.includedGuests,
        includedGuests: catalogRoom.includedGuests,
        maxExtraGuests: catalogRoom.maxExtraGuests,
        extraGuestPrice: catalogRoom.extraGuestPrice,
        maxGuests: catalogRoom.capacity,
        guestPolicyLabel: getGuestPolicyLabel(catalogRoom),
        count: catalogRoom.totalRooms,
        description: catalogRoom.description,
        amenities: catalogRoom.amenities,
        roomNumber: catalogRoom.roomNumber,
        label: catalogRoom.label,
        floor: catalogRoom.floor,
        youtubeVideoId: catalogRoom.youtubeVideoId,
      }
    : facility
      ? {
          name: facility.name,
          images: facility.images,
          description: facility.description,
          amenities: facility.amenities,
          capacity: 'capacity' in facility ? (facility.capacity as string | undefined) : undefined,
          status: 'status' in facility ? (facility.status as string | undefined) : undefined,
        }
      : null

  if (!room) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-serif text-resort-heading mb-4">Room Not Found</h1>
        <Button to="/rooms" variant="primary">
          Back to Rooms
        </Button>
      </div>
    )
  }

  const isBookableRoom = id && !FACILITY_IDS.includes(id)
  const extraGuestCount =
    isBookableRoom && room.includedGuests !== undefined && room.maxExtraGuests !== undefined
      ? calculateExtraGuestCountForParty(
          bookingData.adults,
          bookingData.children,
          room.includedGuests,
          room.maxExtraGuests
        )
      : 0
  const extraGuestFee = extraGuestCount * (room.extraGuestPrice ?? 1000)
  const nightlyTotal = (roomPrice ?? 0) + extraGuestFee

  return (
    <div>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5 mb-8">
        <div className="relative h-96 md:h-[600px] rounded-2xl overflow-hidden">
          <img
            src={room.images[selectedImage]}
            alt={room.name}
            className="w-full h-full object-cover"
            loading="eager"
          />
          {room.status && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="absolute top-4 right-4 px-4 py-2 bg-yellow-500 text-white rounded-full text-sm font-medium shadow-lg"
            >
              {room.status}
            </motion.div>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {room.images.map((image: string, index: number) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`relative h-24 md:h-32 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index
                  ? 'border-resort-cta ring-2 ring-resort-cta/50'
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <img
                src={image}
                alt={`${room.name} ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </section>

      {room.youtubeVideoId && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-serif text-resort-heading mb-2 text-center">
              Room Video Tour
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Take a virtual walkthrough of {room.name}
            </p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative w-full max-w-4xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-xl bg-black"
            >
              <iframe
                src={`https://www.youtube.com/embed/${room.youtubeVideoId}`}
                title={`${room.name} video tour`}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-serif text-resort-heading mb-4"
            >
              {room.name}
            </motion.h1>

            {room.label && (
              <p className="text-lg text-resort-cta font-medium mb-2">{room.label}</p>
            )}
            {room.guestPolicyLabel && (
              <p className="text-sm text-gray-600 mb-4">{room.guestPolicyLabel}</p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-wrap gap-4 mb-6 text-gray-600"
            >
              {room.roomNumber && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  Room No. {room.roomNumber}
                </span>
              )}
              {room.floor && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Floor {room.floor}
                </span>
              )}
              {room.size && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  {room.size}
                </span>
              )}
              {room.guests && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {room.guests} Guests Included
                </span>
              )}
              {room.maxGuests && room.maxGuests > (room.guests ?? 0) && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Up to {room.maxGuests} Guests Total
                </span>
              )}
              {room.capacity && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Capacity: {room.capacity}
                </span>
              )}
              {room.bedType && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {room.bedType}
                </span>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-sm text-resort-heading font-medium mb-4"
            >
              Complimentary breakfast included with every room.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-gray-700 leading-relaxed mb-8"
            >
              {room.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-2xl font-serif text-resort-heading mb-4">Amenities</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {room.amenities.map((amenity: string, index: number) => (
                  <div key={index} className="flex items-center text-gray-700">
                    <svg
                      className="w-5 h-5 text-resort-heading mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {amenity}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-cream rounded-2xl shadow-xl p-6 sticky top-24"
            >
              <div className="mb-6">
                {roomPrice !== null && roomPrice > 0 ? (
                  <>
                    <RoomPriceDisplay
                      price={roomPrice}
                      listPrice={roomListPrice ?? undefined}
                      size="lg"
                      suffix={
                        extraGuestCount > 0
                          ? `per night (+ ${formatCurrency(extraGuestFee)} extra guests)`
                          : 'per night'
                      }
                    />
                    {extraGuestCount > 0 && (
                      <p className="text-sm text-gray-600 mt-2">
                        Total per night: {formatCurrency(nightlyTotal)}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-serif text-resort-heading mb-2">
                      See Room Details
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="text-gray-600"
                    >
                      Learn more about this space and request a custom quote
                    </motion.div>
                  </>
                )}
              </div>

              {isBookableRoom ? (
                <>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-resort-heading mb-2">
                        Check-in *
                      </label>
                      <input
                        type="date"
                        value={bookingData.checkIn}
                        onChange={(e) => handleBookingChange('checkIn', e.target.value)}
                        min={getMinCheckInDate()}
                        max={getMaxCheckInDate()}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-resort-heading focus:border-transparent outline-none ${
                          bookingErrors.checkIn ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {bookingErrors.checkIn && (
                        <p className="mt-1 text-xs text-red-600">{bookingErrors.checkIn}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-resort-heading mb-2">
                        Check-out *
                      </label>
                      <input
                        type="date"
                        value={bookingData.checkOut}
                        onChange={(e) => handleBookingChange('checkOut', e.target.value)}
                        min={getMinCheckOutDate()}
                        disabled={!bookingData.checkIn}
                        required
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-resort-heading focus:border-transparent outline-none ${
                          bookingErrors.checkOut ? 'border-red-500' : 'border-gray-300'
                        } ${!bookingData.checkIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {bookingErrors.checkOut && (
                        <p className="mt-1 text-xs text-red-600">{bookingErrors.checkOut}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-resort-heading mb-2">
                        Adults (12+) *
                      </label>
                      <select
                        value={bookingData.adults}
                        onChange={(e) => handleBookingChange('adults', parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-heading focus:border-transparent outline-none"
                      >
                        {Array.from({ length: room.maxGuests || room.guests || 2 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-resort-heading mb-2">
                        Children (under 12, free)
                      </label>
                      <select
                        value={bookingData.children}
                        onChange={(e) =>
                          handleBookingChange('children', parseInt(e.target.value, 10))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-heading focus:border-transparent outline-none"
                      >
                        {Array.from(
                          {
                            length:
                              Math.max(
                                0,
                                (room.maxGuests || room.guests || 2) - bookingData.adults
                              ) + 1,
                          },
                          (_, i) => (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleQuickBook}
                    disabled={isSubmitting || !bookingData.checkIn || !bookingData.checkOut}
                    className="w-full px-6 py-3 bg-resort-cta text-white rounded-full hover:bg-resort-cta/90 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Processing...' : 'Book Now'}
                  </button>

                  <p className="text-sm text-gray-600 text-center mt-4">
                    Free cancellation more than 7 days before check-in. 50% refund 3-7 days prior.
                    Less than 3 days is non-refundable.
                  </p>
                </>
              ) : (
                <div className="space-y-4">
                  {id === 'conference' ? (
                    <Button to="/conference-room/booking" variant="primary" className="w-full">
                      Book Conference Room
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-600 text-center">
                      This is a facility, not a bookable room.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default RoomDetails
