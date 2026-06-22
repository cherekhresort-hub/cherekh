import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaCalendarAlt, FaUsers, FaSearch } from 'react-icons/fa'
import RoomCard from './RoomCard'
import { getAvailableRooms, getRooms, AvailabilityLoadError } from '../utils/rooms'
import { roomCatalog, MAX_SINGLE_ROOM_CAPACITY } from '../data/roomCatalog'
import { addDaysToDateString, getTodayDate, toLocalDateString } from '../utils/dates'
import {
  BOOKING_PARTY_SPLIT_KEY,
  pickRoomIdsForParty,
  type BookingPartySplitHint,
} from '../utils/bookingParty'
import { useRoomSelection } from '../hooks/useRoomSelection'
import { saveSelectedRoomsHint, buildBookingUrl } from '../utils/roomSelection'
import CountBadge from './CountBadge'

const DEFAULT_GUEST_COUNT = 2
const MAX_GUEST_COUNT = 100

const getMaxDate = () => {
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() + 1)
  return toLocalDateString(maxDate)
}

type AvailableRoomCard = {
  id: string
  roomNumber: string
  name: string
  image: string
  bedType: string
  features: string[]
  price: number
  listPrice: number
  guests: number
  maxGuests: number
}

interface CheckAvailabilityProps {
  compact?: boolean
}

const CheckAvailability = ({ compact = false }: CheckAvailabilityProps) => {
  const navigate = useNavigate()
  const { selectedCount, selectedList, toggle, clear, clearAll, selectRooms, setSearchDates, isSelected } =
    useRoomSelection()
  const formInstanceRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now())
  )
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(String(DEFAULT_GUEST_COUNT))
  const [minCheckOut, setMinCheckOut] = useState('')
  const [errors, setErrors] = useState({ checkIn: '', checkOut: '' })
  const [availableRooms, setAvailableRooms] = useState<AvailableRoomCard[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
  const lastSearchRef = useRef({ checkIn: '', checkOut: '', guests: 0 })

  const resetForm = useCallback(() => {
    setCheckIn('')
    setCheckOut('')
    setGuests(String(DEFAULT_GUEST_COUNT))
    setMinCheckOut('')
    setErrors({ checkIn: '', checkOut: '' })
    setAvailableRooms([])
    setHasSearched(false)
    setAvailabilityError('')
    lastSearchRef.current = { checkIn: '', checkOut: '', guests: 0 }
    clearAll()
  }, [clearAll])

  // Fresh defaults on every full load; also recover from bfcache restores that keep old input values.
  useEffect(() => {
    resetForm()

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) resetForm()
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [resetForm])

  const minCheckInDate = getTodayDate()
  const maxDate = getMaxDate()
  const totalRooms = roomCatalog.length
  const normalizedGuests = (() => {
    const parsed = Number(guests)
    if (Number.isNaN(parsed) || parsed < 1) return 1
    return Math.min(MAX_GUEST_COUNT, parsed)
  })()
  const needsMultipleRooms = normalizedGuests > MAX_SINGLE_ROOM_CAPACITY
  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn)

  useEffect(() => {
    if (checkIn) {
      setMinCheckOut(addDaysToDateString(checkIn, 1))
      if (checkOut && checkOut <= checkIn) {
        setCheckOut('')
      }
    } else {
      setMinCheckOut('')
    }
  }, [checkIn, checkOut])

  // Invalidate results when dates or guests change after a search
  useEffect(() => {
    if (!hasSearched) return
    const last = lastSearchRef.current
    if (
      checkIn !== last.checkIn ||
      checkOut !== last.checkOut ||
      normalizedGuests !== last.guests
    ) {
      setHasSearched(false)
      setAvailableRooms([])
      clear()
    }
  }, [checkIn, checkOut, normalizedGuests, hasSearched, clear])

  const loadAvailableRooms = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setAvailableRooms([])
      return
    }

    const storedRooms = getRooms()
    setAvailabilityError('')
    let available: Awaited<ReturnType<typeof getAvailableRooms>>
    try {
      available = (await getAvailableRooms(checkIn, checkOut)).filter(
        (room) => room.id !== 'conference'
      )
    } catch (e) {
      setAvailableRooms([])
      if (e instanceof AvailabilityLoadError) {
        setAvailabilityError('Could not check availability right now. Please try again in a moment.')
      }
      return
    }

    const roomsToShow = available.map((room) => {
      const catalog = roomCatalog.find((entry) => entry.id === room.id)!
      const stored = storedRooms.find((entry) => entry.id === room.id)
      return {
        id: catalog.id,
        roomNumber: catalog.roomNumber,
        name: catalog.name,
        image: catalog.images[0],
        bedType: catalog.bedType,
        features: catalog.features,
        price: stored?.price ?? catalog.price,
        listPrice: stored?.listPrice ?? Math.round((stored?.price ?? catalog.price) / 0.7),
        guests: catalog.includedGuests,
        maxGuests: catalog.capacity,
      }
    })

    setAvailableRooms(roomsToShow)

    // Prefer couple-bed rooms for exactly 2 guests, else prefer double-bed rooms for >2
    const preferredRoomType = (() => {
      if (normalizedGuests === 2) {
        const couple = roomsToShow.find((r) => {
          const catalog = roomCatalog.find((c) => c.id === r.id)
          return catalog?.bedCategory === 'couple' && r.maxGuests >= 2
        })
        return couple?.id
      }
      if (normalizedGuests > 2) {
        const dbl = roomsToShow.find((r) => {
          const catalog = roomCatalog.find((c) => c.id === r.id)
          return catalog?.bedCategory === 'double' && r.maxGuests >= 1
        })
        return dbl?.id
      }
      return undefined
    })()

    const autoSelected = pickRoomIdsForParty(
      normalizedGuests,
      0,
      roomsToShow.map((room) => ({ id: room.id, capacity: room.maxGuests })),
      preferredRoomType
    )
    selectRooms(autoSelected)
    lastSearchRef.current = { checkIn, checkOut, guests: normalizedGuests }
    setSearchDates({ checkIn, checkOut, guests: normalizedGuests })
  }, [checkIn, checkOut, normalizedGuests, selectRooms, setSearchDates])

  useEffect(() => {
    if (hasSearched) {
      void loadAvailableRooms()
    }
  }, [hasSearched, loadAvailableRooms])

  const handleCheckAvailability = (e: React.FormEvent) => {
    e.preventDefault()

    if (!checkIn) {
      setErrors({ checkIn: 'Please select a check-in date', checkOut: '' })
      return
    }
    if (checkIn < minCheckInDate) {
      setErrors({ checkIn: 'Check-in cannot be in the past', checkOut: '' })
      return
    }
    if (!checkOut) {
      setErrors({ checkIn: '', checkOut: 'Please select a check-out date' })
      return
    }
    if (checkOut <= checkIn) {
      setErrors({ checkIn: '', checkOut: 'Check-out must be after check-in' })
      return
    }
    if (!guests.trim()) {
      setGuests('1')
    }

    setErrors({ checkIn: '', checkOut: '' })
    setHasSearched(true)
    void loadAvailableRooms()
  }

  const handleBookNow = () => {
    const search = { checkIn, checkOut, guests: normalizedGuests }

    if (selectedList.length > 0) {
      saveSelectedRoomsHint({
        roomIds: selectedList,
        checkIn,
        checkOut,
        adults: normalizedGuests,
        children: 0,
      })
      clear()
    } else if (needsMultipleRooms) {
      const hint: BookingPartySplitHint = {
        adults: normalizedGuests,
        children: 0,
        expires: Date.now() + 30 * 60 * 1000,
      }
      sessionStorage.setItem(BOOKING_PARTY_SPLIT_KEY, JSON.stringify(hint))
    } else {
      sessionStorage.removeItem(BOOKING_PARTY_SPLIT_KEY)
    }

    navigate(buildBookingUrl(search))
  }

  return (
    <section
      className={`relative z-20 px-4 sm:px-6 lg:px-8 ${
        compact ? '-mt-10 pb-6' : '-mt-16 sm:-mt-20 pb-8'
      }`}
    >
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className={`bg-cream border border-stone-200/80 shadow-lg ${
            compact ? 'rounded-xl p-4 sm:p-5' : 'rounded-2xl shadow-2xl border-gray-100 p-6 sm:p-8'
          }`}
        >
          <div className={compact ? 'mb-4 text-center' : 'text-center mb-6 sm:mb-8'}>
            <h2
              className={
                compact
                  ? 'text-lg font-serif text-resort-heading'
                  : 'text-2xl sm:text-3xl font-serif text-resort-heading mb-2'
              }
            >
              Check availability
            </h2>
            {!compact && (
              <p className="text-sm sm:text-base text-gray-600">
                Select your dates to see available rooms and book your stay at Cherekh Center
              </p>
            )}
          </div>

          <form
            key={formInstanceRef.current}
            onSubmit={handleCheckAvailability}
            autoComplete="off"
          >
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${
                compact ? 'gap-3' : 'gap-4 lg:gap-5'
              }`}
            >
              <div>
                <label
                  htmlFor="home-check-in"
                  className="flex items-center gap-2 text-sm font-medium text-resort-heading mb-2"
                >
                  <FaCalendarAlt className="w-4 h-4 text-resort-cta" aria-hidden />
                  Check-in
                </label>
                <input
                  id="home-check-in"
                  type="date"
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value)
                    setErrors((prev) => ({ ...prev, checkIn: '' }))
                  }}
                  min={minCheckInDate}
                  max={maxDate}
                  required
                  className={`w-full border rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta ${
                    compact ? 'p-2.5 text-sm' : 'p-3'
                  } ${
                    errors.checkIn ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.checkIn && (
                  <p className="mt-1 text-xs text-red-600">{errors.checkIn}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="home-check-out"
                  className="flex items-center gap-2 text-sm font-medium text-resort-heading mb-2"
                >
                  <FaCalendarAlt className="w-4 h-4 text-resort-cta" aria-hidden />
                  Check-out
                </label>
                <input
                  id="home-check-out"
                  type="date"
                  value={checkOut}
                  onChange={(e) => {
                    setCheckOut(e.target.value)
                    setErrors((prev) => ({ ...prev, checkOut: '' }))
                  }}
                  min={minCheckOut || minCheckInDate}
                  max={maxDate}
                  disabled={!checkIn}
                  required
                  className={`w-full border rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta ${
                    compact ? 'p-2.5 text-sm' : 'p-3'
                  } ${
                    errors.checkOut ? 'border-red-500' : 'border-gray-300'
                  } ${!checkIn ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                {errors.checkOut && (
                  <p className="mt-1 text-xs text-red-600">{errors.checkOut}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="home-guests"
                  className="flex items-center gap-2 text-sm font-medium text-resort-heading mb-2"
                >
                  <FaUsers className="w-4 h-4 text-resort-cta" aria-hidden />
                  Guests
                </label>
                <input
                  id="home-guests"
                  type="number"
                  min={1}
                  max={MAX_GUEST_COUNT}
                  step={1}
                  inputMode="numeric"
                  value={guests}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      setGuests('')
                      return
                    }
                    if (!/^\d+$/.test(raw)) return
                    const next = Number(raw)
                    setGuests(String(Math.max(1, Math.min(MAX_GUEST_COUNT, next))))
                  }}
                  onBlur={(e) => {
                    const next = Number(e.target.value)
                    if (Number.isNaN(next) || next < 1) {
                      setGuests('1')
                      return
                    }
                    if (next > MAX_GUEST_COUNT) {
                      setGuests(String(MAX_GUEST_COUNT))
                      return
                    }
                    setGuests(String(next))
                  }}
                  className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta bg-cream ${
                    compact ? 'p-2.5 text-sm' : 'p-3'
                  }`}
                />
                <p className="mt-1 text-xs text-stone-500">
                  Up to {MAX_SINGLE_ROOM_CAPACITY} guests per room · larger groups can book multiple
                  rooms
                </p>
              </div>

              <div className={`flex flex-col ${compact ? 'sm:pt-7' : 'lg:pt-8'}`}>
                <button
                  type="submit"
                  disabled={!datesValid}
                  className={`w-full flex items-center justify-center gap-2 bg-resort-cta text-white rounded-lg hover:bg-resort-cta/90 transition-colors font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                    compact ? 'px-4 py-2.5 text-sm' : 'px-6 py-3 rounded-full shadow-md'
                  }`}
                >
                  <FaSearch className="w-4 h-4" aria-hidden />
                  Check Availability
                </button>
              </div>
            </div>
          </form>

          <p className={`mt-3 text-stone-500 ${compact ? 'text-[11px]' : 'text-center text-xs'}`}>
            Select check-in and check-out first · Check-in 2:00 PM · Check-out 11:00 AM · Breakfast
            included
          </p>
        </motion.div>

        {hasSearched && datesValid && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-8 sm:mt-10"
          >
            {availabilityError ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                <p className="text-red-800 font-medium mb-2">Availability unavailable</p>
                <p className="text-sm text-red-700">{availabilityError}</p>
              </div>
            ) : availableRooms.length > 0 ? (
              <>
                {needsMultipleRooms && (
                  <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-sm text-blue-900">
                    <p className="font-medium">
                      {normalizedGuests} guests need more than one room
                    </p>
                    <p className="mt-1 text-blue-800">
                      Each room fits up to {MAX_SINGLE_ROOM_CAPACITY} guests. We&apos;ve highlighted
                      rooms that best fit your group — adjust the selection if you prefer different
                      rooms.
                    </p>
                  </div>
                )}
                {selectedCount > 0 && !needsMultipleRooms && (
                  <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
                    <p className="font-medium">
                      {selectedCount} room auto-selected for {normalizedGuests} guest
                      {normalizedGuests === 1 ? '' : 's'}
                    </p>
                    <p className="mt-1 text-emerald-800">
                      Tap another room to change your pick, or continue with{' '}
                      <strong>Book Now</strong>.
                    </p>
                  </div>
                )}
                {selectedCount > 0 && needsMultipleRooms && (
                  <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
                    <p className="font-medium">
                      {selectedCount} rooms auto-selected for {normalizedGuests} guests
                    </p>
                    <p className="mt-1 text-emerald-800">
                      Selected using each room&apos;s maximum capacity. Change any room below before
                      booking.
                    </p>
                  </div>
                )}
                {selectedCount === 0 && availableRooms.length > 0 && (
                  <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                    <p className="font-medium">
                      Not enough room capacity for {normalizedGuests} guests on these dates
                    </p>
                    <p className="mt-1 text-amber-800">
                      Try fewer guests, different dates, or{' '}
                      <Link to="/contact" className="font-medium underline hover:text-amber-950">
                        contact us
                      </Link>{' '}
                      for help.
                    </p>
                  </div>
                )}
                <div className="text-center mb-6 sm:mb-8">
                  <h3 className="text-xl sm:text-2xl font-serif text-resort-heading mb-2">
                    Available Rooms
                  </h3>
                  <p className="text-sm text-gray-600">
                    {availableRooms.length} of {totalRooms} rooms available for your selected dates
                    {selectedCount > 0 &&
                      ` · ${selectedCount} selected for ${normalizedGuests} guest${normalizedGuests === 1 ? '' : 's'}`}
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {availableRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      {...room}
                      type="room"
                      compact
                      selectable
                      selected={isSelected(room.id)}
                      onSelectToggle={toggle}
                    />
                  ))}
                </div>

                <div className="text-center mt-8 space-y-3">
                  {selectedCount > 0 && (
                    <p className="inline-flex items-center gap-2 text-sm text-stone-600">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[#e41e3f] px-1.5 text-xs font-bold tabular-nums text-white shadow-sm">
                        {selectedCount}
                      </span>
                      {selectedCount === 1 ? 'room selected' : 'rooms selected'}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleBookNow}
                    className="relative inline-flex px-8 py-3 bg-resort-cta text-white rounded-full hover:bg-resort-cta/90 transition-colors font-medium shadow-md"
                  >
                    Book Now
                    {selectedCount > 0 && <CountBadge count={selectedCount} />}
                  </button>
                  {selectedCount > 0 && (
                    <button
                      type="button"
                      onClick={clear}
                      className="block mx-auto text-sm text-stone-500 hover:text-stone-700"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                <p className="text-amber-800 font-medium mb-2">No rooms available</p>
                <p className="text-sm text-amber-700">
                  {needsMultipleRooms ? (
                    <>
                      No rooms are free for these dates. Try different dates or{' '}
                      <Link to="/contact" className="underline font-medium hover:text-amber-900">
                        contact us
                      </Link>
                      .
                    </>
                  ) : (
                    <>
                      No rooms are free for these dates. Try different dates or{' '}
                      <Link to="/contact" className="underline font-medium hover:text-amber-900">
                        contact us
                      </Link>
                      .
                    </>
                  )}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  )
}

export default CheckAvailability
