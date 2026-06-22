import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaPlus, FaTrash } from 'react-icons/fa'
import { saveBooking } from '../utils/bookings'
import {
  getRooms,
  getAvailableRooms,
  areRoomsAvailableForBooking,
  AvailabilityLoadError,
  formatCurrency,
} from '../utils/rooms'
import { addDaysToDateString, getTodayDate, toLocalDateString } from '../utils/dates'
import { CONFERENCE_ROOM_ID, MAX_SINGLE_ROOM_CAPACITY } from '../data/roomCatalog'
import {
  BOOKING_PARTY_SPLIT_KEY,
  buildRoomLinesForParty,
  type BookingPartySplitHint,
} from '../utils/bookingParty'
import { consumeSelectedRoomsHint, peekSelectedRoomsHint } from '../utils/roomSelection'
import { cacheBookingConfirmation } from '../lib/bookingConfirmationCache'
import {
  BookingPersistError,
  BookingInventoryConflictError,
  BookingRateLimitError,
} from '../lib/bookingsStore'
import {
  createRoomLine,
  roomToOption,
  getLineTotalGuests,
  calculateStayNights,
  calculateBookingEstimate,
  formatBookingDurationLabel,
  deriveConferenceBounds,
  normalizeEventDates,
  ARRIVAL_TIME_OPTIONS,
  type RoomOption,
  type RoomBookingLine,
} from '../utils/bookingHelpers'
import EventDatesPicker from '../components/EventDatesPicker'
import RoomPriceDisplay from '../components/RoomPriceDisplay'
import WhatsAppChat from '../components/WhatsAppChat'
import {
  waitMinSubmitDuration,
  waitMinStepDuration,
  yieldToPaint,
} from '../utils/bookingSubmitTiming'
import { MorphButton } from '../components/ui/morph-button'
import { CalendarCheck } from 'lucide-react'
import { withRateLimit, RateLimitPresets } from '../utils/rateLimiter'
import { getCSRFToken, validateFormSubmission, createProtectedFormData } from '../utils/csrf'
import { isValidEmail, normalizeEmail } from '../utils/validation'
import { useResortContact } from '../contexts/SiteSettingsProvider'
import { formatTime12h } from '../utils/contactFromSettings'

type SubmitPhase = 'idle' | 'checking' | 'reserving' | 'success' | 'conflict' | 'error'

const SUBMIT_BUTTON_MESSAGES = {
  checking: 'Checking availability for your dates…',
  reserving: 'Securing your room…',
  success: 'Request sent!',
} as const

const Booking = () => {
  const resortContact = useResortContact()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [pendingRoomsHint] = useState(() => peekSelectedRoomsHint())
  const urlRoomType = searchParams.get('roomType')
  const urlCheckIn = searchParams.get('checkIn')
  const urlCheckOut = searchParams.get('checkOut')
  const urlGuests = searchParams.get('guests')
  const urlAdults = searchParams.get('adults')
  const urlChildren = searchParams.get('children')

  const initialAdults = urlAdults
    ? parseInt(urlAdults, 10) || 1
    : urlGuests
      ? parseInt(urlGuests, 10) || 1
      : pendingRoomsHint?.adults ?? 1
  const initialChildren = urlChildren
    ? Math.max(0, parseInt(urlChildren, 10) || 0)
    : pendingRoomsHint?.children ?? 0

  const [roomOptions, setRoomOptions] = useState<RoomOption[]>([])
  const [roomLines, setRoomLines] = useState<RoomBookingLine[]>(() => [
    createRoomLine(urlRoomType || '', initialAdults, initialChildren),
  ])

  const [formData, setFormData] = useState({
    checkIn: urlCheckIn || pendingRoomsHint?.checkIn || '',
    checkOut: urlCheckOut || pendingRoomsHint?.checkOut || '',
    name: '',
    email: '',
    phone: '',
    expectedArrivalTime: '',
    eventTimeline: '',
    specialRequests: '',
  })

  const [dateErrors, setDateErrors] = useState({
    checkIn: '',
    checkOut: '',
    eventDates: '',
  })
  const [eventDates, setEventDates] = useState<string[]>([])

  const [lineErrors, setLineErrors] = useState<Record<string, string>>({})
  const [roomsError, setRoomsError] = useState('')
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const selectedRoomsAppliedRef = useRef(false)

  const isSubmitting =
    submitPhase === 'checking' || submitPhase === 'reserving' || submitPhase === 'success'
  const submitLoadingText =
    submitPhase === 'checking' || submitPhase === 'reserving' || submitPhase === 'success'
      ? SUBMIT_BUTTON_MESSAGES[submitPhase]
      : undefined

  const hasConferenceLine = useMemo(
    () => roomLines.some((line) => line.roomType === CONFERENCE_ROOM_ID),
    [roomLines]
  )
  const hasGuestRoomLine = useMemo(
    () => roomLines.some((line) => line.roomType && line.roomType !== CONFERENCE_ROOM_ID),
    [roomLines]
  )
  const conferenceOnly = hasConferenceLine && !hasGuestRoomLine
  const bookingNights = conferenceOnly
    ? normalizeEventDates(eventDates).length
    : calculateStayNights(formData.checkIn, formData.checkOut)
  const { lineBreakdown, nightlyTotal, estimatedTotal } = calculateBookingEstimate(
    roomLines,
    roomOptions,
    bookingNights
  )

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 1)
    return toLocalDateString(maxDate)
  }

  const minCheckInDate = getTodayDate()
  const maxCheckInDate = getMaxDate()
  const [minCheckOutDate, setMinCheckOutDate] = useState('')

  useEffect(() => {
    setRoomOptions(getRooms().map(roomToOption))
  }, [])

  useEffect(() => {
    const loadOptions = async () => {
      if (formData.checkIn && formData.checkOut && formData.checkOut > formData.checkIn) {
        try {
        const availableRooms = await getAvailableRooms(formData.checkIn, formData.checkOut)
        setRoomOptions(availableRooms.map(roomToOption))
        setRoomsError('')

        setRoomLines((prev) =>
          prev.map((line) => {
            if (!line.roomType) return line
            const stillAvailable = availableRooms.some((room) => room.id === line.roomType)
            return stillAvailable ? line : { ...line, roomType: '' }
          })
        )
        } catch (e) {
          if (e instanceof AvailabilityLoadError) {
            setRoomsError('Could not load room availability. Please refresh and try again.')
          }
        }
      } else {
        setRoomOptions(getRooms().map(roomToOption))
        setRoomsError('')
      }
    }
    void loadOptions()
  }, [formData.checkIn, formData.checkOut])

  useEffect(() => {
    if (selectedRoomsAppliedRef.current || roomOptions.length === 0) return

    const hint = consumeSelectedRoomsHint()
    if (!hint) return

    const validIds = hint.roomIds.filter((id) => roomOptions.some((room) => room.value === id))
    if (validIds.length === 0) return

    selectedRoomsAppliedRef.current = true

    if (validIds.length === 1) {
      setRoomLines([
        createRoomLine(
          validIds[0],
          hint.adults ?? initialAdults,
          hint.children ?? initialChildren
        ),
      ])
    } else {
      setRoomLines(
        validIds.map((id) => {
          const option = roomOptions.find((room) => room.value === id)
          const adults = Math.min(2, option?.capacity ?? 2)
          return createRoomLine(id, adults, 0)
        })
      )
    }

    if (hint.checkIn || hint.checkOut) {
      setFormData((prev) => ({
        ...prev,
        checkIn: hint.checkIn || prev.checkIn,
        checkOut: hint.checkOut || prev.checkOut,
      }))
    }
  }, [roomOptions, initialAdults, initialChildren])

  useEffect(() => {
    if (selectedRoomsAppliedRef.current) return
    const partyTotal = initialAdults + initialChildren
    if (partyTotal <= MAX_SINGLE_ROOM_CAPACITY || roomOptions.length === 0) return
    if (!formData.checkIn || !formData.checkOut || formData.checkOut <= formData.checkIn) return
    if (roomLines.length > 1) return

    let preferredRoomType = urlRoomType || undefined
    try {
      const raw = sessionStorage.getItem(BOOKING_PARTY_SPLIT_KEY)
      if (raw) {
        const hint = JSON.parse(raw) as BookingPartySplitHint
        if (hint.expires > Date.now()) {
          preferredRoomType = hint.preferredRoomType ?? preferredRoomType
        }
        sessionStorage.removeItem(BOOKING_PARTY_SPLIT_KEY)
      }
    } catch {
      sessionStorage.removeItem(BOOKING_PARTY_SPLIT_KEY)
    }

    const split = buildRoomLinesForParty(
      initialAdults,
      initialChildren,
      roomOptions,
      preferredRoomType
    )
    if (split.length > 1) {
      setRoomLines(split)
    }
  }, [
    formData.checkIn,
    formData.checkOut,
    roomOptions,
    initialAdults,
    initialChildren,
    urlRoomType,
    roomLines.length,
  ])

  useEffect(() => {
    if (formData.checkIn) {
      setMinCheckOutDate(addDaysToDateString(formData.checkIn, 1))

      if (formData.checkOut && formData.checkOut <= formData.checkIn) {
        setFormData((prev) => ({ ...prev, checkOut: '' }))
        setDateErrors((prev) => ({
          ...prev,
          checkOut: 'Check-out date must be at least one day after check-in',
        }))
      } else {
        setDateErrors((prev) => ({ ...prev, checkOut: '' }))
      }
    } else {
      setMinCheckOutDate('')
    }
  }, [formData.checkIn, formData.checkOut])

  const getOptionsForLine = (lineId: string) => {
    const selectedInOtherLines = roomLines
      .filter((line) => line.id !== lineId && line.roomType)
      .map((line) => line.roomType)

    return roomOptions.filter((room) => !selectedInOtherLines.includes(room.value))
  }

  const remainingRoomSlots = roomOptions.filter(
    (room) => !roomLines.some((line) => line.roomType === room.value)
  ).length

  const canAddRoom =
    Boolean(formData.checkIn) &&
    Boolean(formData.checkOut) &&
    formData.checkOut > formData.checkIn &&
    roomOptions.length > 0 &&
    roomLines.length < roomOptions.length &&
    remainingRoomSlots > 0

  const updateLine = (lineId: string, updates: Partial<RoomBookingLine>) => {
    setRoomLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...updates } : line))
    )
    setLineErrors((prev) => {
      const next = { ...prev }
      delete next[lineId]
      return next
    })
    setRoomsError('')
  }

  const handleLineRoomChange = (lineId: string, roomType: string) => {
    const option = roomOptions.find((room) => room.value === roomType)
    const line = roomLines.find((entry) => entry.id === lineId)
    if (!line || !option) {
      updateLine(lineId, { roomType })
      return
    }

    const totalGuests = getLineTotalGuests(line)
    if (totalGuests > option.capacity) {
      updateLine(lineId, {
        roomType,
        adults: Math.min(line.adults, option.capacity),
        children: Math.max(0, option.capacity - Math.min(line.adults, option.capacity)),
      })
      setLineErrors((prev) => ({
        ...prev,
        [lineId]: `Guest count adjusted to fit ${option.label} (max ${option.capacity}).`,
      }))
      return
    }

    updateLine(lineId, { roomType })
  }

  const handleLineGuestChange = (
    lineId: string,
    field: 'adults' | 'children',
    rawValue: string
  ) => {
    const line = roomLines.find((entry) => entry.id === lineId)
    if (!line) return

    const option = roomOptions.find((room) => room.value === line.roomType)
    const maxGuests = option?.capacity ?? 10

    if (rawValue === '') {
      updateLine(lineId, { ...line, [field]: 0 })
      return
    }

    const value = parseInt(rawValue, 10)
    if (Number.isNaN(value) || value < 0) return

    const nextLine = {
      ...line,
      [field]: value,
    }

    const totalGuests = getLineTotalGuests(nextLine)
    if (totalGuests > maxGuests) {
      setLineErrors((prev) => ({
        ...prev,
        [lineId]: `Total guests cannot exceed ${maxGuests} for ${option?.label ?? 'this room'}.`,
      }))
      return
    }

    updateLine(lineId, nextLine)
  }

  const addRoomLine = () => {
    if (!canAddRoom) return
    setRoomLines((prev) => [...prev, createRoomLine()])
  }

  const removeRoomLine = (lineId: string) => {
    if (roomLines.length === 1) return
    setRoomLines((prev) => prev.filter((line) => line.id !== lineId))
    setLineErrors((prev) => {
      const next = { ...prev }
      delete next[lineId]
      return next
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    if (name === 'checkIn') {
      const today = getTodayDate()
      if (value < today) {
        setDateErrors((prev) => ({
          ...prev,
          checkIn: 'Check-in date cannot be in the past',
        }))
        setFormData((prev) => ({ ...prev, checkIn: '', checkOut: '' }))
        return
      }

      setDateErrors((prev) => ({ ...prev, checkIn: '' }))

      if (formData.checkOut && formData.checkOut <= value) {
        setFormData((prev) => ({ ...prev, checkIn: value, checkOut: '' }))
        setDateErrors({
          checkIn: '',
          checkOut: 'Check-out date must be at least one day after check-in',
          eventDates: '',
        })
        return
      }
    }

    if (name === 'checkOut') {
      if (formData.checkIn && value <= formData.checkIn) {
        setDateErrors((prev) => ({
          ...prev,
          checkOut: 'Check-out date must be at least one day after check-in',
        }))
      } else {
        setDateErrors((prev) => ({ ...prev, checkOut: '' }))
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const validateRoomLines = () => {
    const nextLineErrors: Record<string, string> = {}
    let hasError = false

    const filledLines = roomLines.filter((line) => line.roomType)
    if (filledLines.length === 0) {
      setRoomsError('Please add at least one room to your reservation.')
      return false
    }

    const roomIds = filledLines.map((line) => line.roomType)
    if (new Set(roomIds).size !== roomIds.length) {
      setRoomsError('Each room can only be selected once per booking.')
      return false
    }

    filledLines.forEach((line) => {
      const option = roomOptions.find((room) => room.value === line.roomType)
      if (!option) {
        nextLineErrors[line.id] = 'Selected room is no longer available.'
        hasError = true
        return
      }

      if (line.adults < 1) {
        nextLineErrors[line.id] = 'At least 1 adult is required for each room.'
        hasError = true
      }

      const totalGuests = getLineTotalGuests(line)
      if (totalGuests > option.capacity) {
        nextLineErrors[line.id] = `Guest count exceeds capacity for ${option.label}.`
        hasError = true
      }
    })

    setLineErrors(nextLineErrors)
    setRoomsError('')
    return !hasError
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    const protectedData = createProtectedFormData({ ...formData, roomLines })
    if (!validateFormSubmission(protectedData)) {
      alert('Security validation failed. Please refresh the page and try again.')
      return
    }

    const email = normalizeEmail(formData.email)
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.')
      return
    }

    if (conferenceOnly) {
      const normalizedEventDates = normalizeEventDates(eventDates)
      if (normalizedEventDates.length === 0) {
        setDateErrors((prev) => ({
          ...prev,
          eventDates: 'Add at least one event date',
        }))
        return
      }
    } else if (formData.checkOut <= formData.checkIn) {
      setDateErrors({
        checkIn: '',
        checkOut: 'Check-out date must be at least one day after check-in',
        eventDates: '',
      })
      return
    }

    if (!validateRoomLines()) return

    const filledForSubmit = roomLines.filter((line) => line.roomType)
    const roomTypesToBook = filledForSubmit.map((line) => line.roomType)
    const normalizedEventDates = normalizeEventDates(eventDates)
    const submitCheckIn = conferenceOnly
      ? deriveConferenceBounds(normalizedEventDates).checkIn
      : formData.checkIn
    const submitCheckOut = conferenceOnly
      ? deriveConferenceBounds(normalizedEventDates).checkOut
      : formData.checkOut

    const startedAt = Date.now()
    setSubmitMessage('')
    setSubmitPhase('checking')
    await yieldToPaint()
    const checkingStartedAt = Date.now()

    try {
      await withRateLimit(RateLimitPresets.BOOKING_FORM, async () => {
        const stillAvailable = await areRoomsAvailableForBooking(
          submitCheckIn,
          submitCheckOut,
          roomTypesToBook,
          {
            lines: filledForSubmit.map((line) => ({
              roomType: line.roomType,
              adults: line.adults,
              children: line.children,
            })),
            conferenceEventDates: conferenceOnly ? normalizedEventDates : undefined,
          }
        )

        await waitMinStepDuration(checkingStartedAt)

        if (!stillAvailable) {
          if (!conferenceOnly) {
            const available = await getAvailableRooms(formData.checkIn, formData.checkOut)
            setRoomOptions(available.map(roomToOption))
          }
          await waitMinSubmitDuration(startedAt)
          setSubmitMessage(
            'One or more selected rooms are no longer available for these dates. Please choose another room or different dates.'
          )
          setSubmitPhase('conflict')
          return
        }

        setSubmitPhase('reserving')
        await yieldToPaint()
        const reservingStartedAt = Date.now()

        const bookingRooms = roomLines
          .filter((line) => line.roomType)
          .map((line) => {
            const option = roomOptions.find((room) => room.value === line.roomType)!
            const totalGuests = getLineTotalGuests(line)
            return {
              roomType: line.roomType,
              roomName: option.label,
              adults: line.adults,
              children: line.children,
              totalGuests,
            }
          })

        const booking = await saveBooking({
          checkIn: submitCheckIn,
          checkOut: submitCheckOut,
          eventDates: conferenceOnly ? normalizedEventDates : undefined,
          rooms: bookingRooms,
          name: formData.name,
          email,
          phone: formData.phone,
          expectedArrivalTime: formData.expectedArrivalTime || undefined,
          eventTimeline:
            hasConferenceLine && hasGuestRoomLine
              ? formData.eventTimeline || undefined
              : undefined,
          specialRequests: formData.specialRequests,
        })

        await waitMinStepDuration(reservingStartedAt)

        setSubmitPhase('success')
        await yieldToPaint()
        await waitMinSubmitDuration(startedAt)

        cacheBookingConfirmation(booking)
        const thankYouParams = new URLSearchParams({
          id: booking.id,
          email,
        })
        navigate(`/thank-you?${thankYouParams.toString()}`, { state: { booking } })
      })
    } catch (error: unknown) {
      await waitMinSubmitDuration(startedAt)
      const message = error instanceof Error ? error.message : ''

      if (message.includes('Rate limit exceeded') || error instanceof BookingRateLimitError) {
        setSubmitMessage(message || 'Rate limit exceeded. Please try again in about an hour or contact us by phone or WhatsApp.')
        setSubmitPhase('error')
      } else if (error instanceof BookingInventoryConflictError) {
        if (!conferenceOnly) {
          const available = await getAvailableRooms(formData.checkIn, formData.checkOut)
          setRoomOptions(available.map(roomToOption))
        }
        setSubmitMessage(error.message)
        setSubmitPhase('conflict')
      } else if (error instanceof BookingPersistError) {
        setSubmitMessage(error.message)
        setSubmitPhase('error')
      } else {
        console.error('Error saving booking:', error)
        setSubmitMessage('There was an error submitting your booking. Please try again.')
        setSubmitPhase('error')
      }
    }
  }

  const datesSelected = conferenceOnly
    ? normalizeEventDates(eventDates).length > 0
    : Boolean(formData.checkIn) &&
      Boolean(formData.checkOut) &&
      formData.checkOut > formData.checkIn

  return (
    <motion.div>
      <section className="relative h-72 md:h-80 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/cherekhImages/homepageHero/hero01.jpg"
            alt="Book Your Stay"
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        <div className="relative z-10 text-center px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-serif font-bold text-white mb-3"
          >
            Book Your Stay
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-white/90"
          >
            Simple booking in a few easy steps
          </motion.p>
        </div>
      </section>

      <section className="py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-cream rounded-2xl shadow-md p-5 sm:p-6 md:p-8"
          >
            <div className="mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl md:text-3xl font-serif text-resort-heading">
                Reservation Details
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Fill in the details below and submit your request.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">
              <input type="hidden" name="_csrf" value={getCSRFToken()} />

              <section className="space-y-4">
                <h3 className="text-base font-semibold text-resort-heading">1. Select your dates</h3>
                {conferenceOnly ? (
                  <EventDatesPicker
                    dates={eventDates}
                    onChange={(dates) => {
                      setEventDates(dates)
                      setDateErrors((prev) => ({ ...prev, eventDates: '' }))
                    }}
                    minDate={minCheckInDate}
                    maxDate={maxCheckInDate}
                    error={dateErrors.eventDates}
                  />
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-resort-heading mb-2">
                    Check-in Date *
                  </label>
                  <input
                    type="date"
                    name="checkIn"
                    value={formData.checkIn}
                    onChange={handleChange}
                    min={minCheckInDate}
                    max={maxCheckInDate}
                    required
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta ${
                      dateErrors.checkIn ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {dateErrors.checkIn && (
                    <p className="mt-1 text-sm text-red-600">{dateErrors.checkIn}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-resort-heading mb-2">
                    Check-out Date *
                  </label>
                  <input
                    type="date"
                    name="checkOut"
                    value={formData.checkOut}
                    onChange={handleChange}
                    min={minCheckOutDate || minCheckInDate}
                    max={maxCheckInDate}
                    disabled={!formData.checkIn}
                    required
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta ${
                      dateErrors.checkOut ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.checkIn ? 'bg-sand-100 cursor-not-allowed' : ''}`}
                  />
                  {dateErrors.checkOut && (
                    <p className="mt-1 text-sm text-red-600">{dateErrors.checkOut}</p>
                  )}
                  {formData.checkIn && !dateErrors.checkOut && (
                    <p className="mt-1 text-xs text-gray-500">
                      Minimum stay: 1 night.
                    </p>
                  )}
                </div>
              </div>
                )}
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-resort-heading">2. Choose room(s)</h3>
                  {canAddRoom && (
                    <button
                      type="button"
                      onClick={addRoomLine}
                      className="inline-flex items-center gap-2 text-sm font-medium text-resort-cta hover:text-resort-cta/80"
                    >
                      <FaPlus className="w-3 h-3" />
                      Add another room
                    </button>
                  )}
                </div>

                {!datesSelected ? (
                  <div className="p-4 border border-gray-200 rounded-lg bg-sand-50 text-sm text-gray-600">
                    {conferenceOnly
                      ? 'Add at least one event date first.'
                      : 'Select check-in and check-out dates first.'}
                  </div>
                ) : roomOptions.length === 0 ? (
                  <div className="w-full p-4 border border-yellow-300 rounded-lg bg-yellow-50">
                    <p className="text-sm text-yellow-800">
                      No rooms available for the selected dates. Please choose different dates.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {roomLines.map((line, index) => {
                      const options = getOptionsForLine(line.id)
                      const selectedOption = roomOptions.find((room) => room.value === line.roomType)
                      const lineTotalGuests = getLineTotalGuests(line)

                      return (
                        <div
                          key={line.id}
                          className="border border-gray-200 rounded-xl p-4 bg-cream"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-resort-heading">
                              Room {index + 1}
                            </h4>
                            {roomLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRoomLine(line.id)}
                                className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                                aria-label={`Remove room ${index + 1}`}
                              >
                                <FaTrash className="w-3.5 h-3.5" />
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                Select room *
                              </label>
                              <select
                                value={line.roomType}
                                onChange={(e) => handleLineRoomChange(line.id, e.target.value)}
                                required
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta bg-cream"
                              >
                                <option value="">Select a room</option>
                                {options.map((room) => (
                                  <option key={room.value} value={room.value}>
                                    {room.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {selectedOption && (
                              <>
                                <p className="text-sm font-medium text-resort-heading">
                                  {selectedOption.typeSummary}
                                </p>
                                {!selectedOption.isConference && (
                                  <p className="text-sm text-gray-600">
                                    {selectedOption.includedGuests} paying guests included · up to{' '}
                                    {selectedOption.maxExtraGuests} extra at{' '}
                                    {formatCurrency(selectedOption.extraGuestPrice)}/adult/night ·
                                    Children under 12 free · Max {selectedOption.capacity} guests
                                  </p>
                                )}

                                <div className={`grid grid-cols-1 ${selectedOption.isConference ? '' : 'md:grid-cols-2'} gap-4`}>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      {selectedOption.isConference ? 'Attendees *' : 'Adults (12+ years) *'}
                                    </label>
                                    <input
                                      type="number"
                                      value={line.adults || ''}
                                      onChange={(e) =>
                                        handleLineGuestChange(line.id, 'adults', e.target.value)
                                      }
                                      max={selectedOption.capacity}
                                      required
                                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta ${
                                        lineErrors[line.id] ? 'border-red-500' : 'border-gray-300'
                                      }`}
                                    />
                                  </div>
                                  {!selectedOption.isConference && (
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">
                                      Children (under 12, no extra charge)
                                    </label>
                                    <input
                                      type="number"
                                      value={line.children || ''}
                                      onChange={(e) =>
                                        handleLineGuestChange(line.id, 'children', e.target.value)
                                      }
                                      min="0"
                                      max={Math.max(0, selectedOption.capacity - line.adults)}
                                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta ${
                                        lineErrors[line.id] ? 'border-red-500' : 'border-gray-300'
                                      }`}
                                    />
                                  </div>
                                  )}
                                </div>

                                <p className="text-xs text-gray-500">
                                  {lineTotalGuests}{' '}
                                  {selectedOption.isConference
                                    ? lineTotalGuests === 1
                                      ? 'attendee'
                                      : 'attendees'
                                    : lineTotalGuests === 1
                                      ? 'guest'
                                      : 'guests'}{' '}
                                  {selectedOption.isConference ? 'for this event' : 'in this room'}
                                </p>

                                {selectedOption.price > 0 && (
                                  <RoomPriceDisplay
                                    price={selectedOption.price}
                                    listPrice={selectedOption.listPrice}
                                    size="sm"
                                    suffix={selectedOption.isConference ? '/ event day' : '/ night'}
                                  />
                                )}
                              </>
                            )}

                            {lineErrors[line.id] && (
                              <p className="text-sm text-red-600">{lineErrors[line.id]}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {roomsError && <p className="mt-2 text-sm text-red-600">{roomsError}</p>}
                {datesSelected && roomOptions.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Available rooms are shown for the selected dates.
                  </p>
                )}
              </section>

              {lineBreakdown.length > 0 && bookingNights > 0 && (
                <section className="bg-sand-50 rounded-xl p-4 space-y-3">
                  <h3 className="text-base font-semibold text-resort-heading">3. Price summary</h3>
                  {lineBreakdown.map(({ line, option, extraGuestFee, extraGuestCount, stayTotal }) => (
                    <div
                      key={line.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm border-b border-gray-200 pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium text-resort-heading">{option?.label}</p>
                        <p className="text-gray-600">
                          {getLineTotalGuests(line)} guests
                          {extraGuestCount > 0 &&
                            ` · Extra adult fee ${formatCurrency(extraGuestFee)}${
                              option?.isConference ? '/ event day' : '/night'
                            }`}
                        </p>
                      </div>
                      <p className="font-semibold text-resort-heading">
                        {formatCurrency(stayTotal)}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-300">
                    <span className="text-gray-700">
                      Estimated total ({formatBookingDurationLabel(bookingNights, conferenceOnly)})
                    </span>
                    <span className="text-xl font-bold text-resort-cta">
                      {formatCurrency(estimatedTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {conferenceOnly ? 'Per event day subtotal' : 'Nightly subtotal'}:{' '}
                    {formatCurrency(nightlyTotal)} across {lineBreakdown.length}{' '}
                    {lineBreakdown.length === 1 ? 'room' : 'rooms'}
                  </p>
                </section>
              )}

              <section className="border-t border-gray-200 pt-6">
                <h3 className="text-base font-semibold text-resort-heading mb-4">
                  4. {conferenceOnly ? 'Contact information' : 'Guest information'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-resort-heading mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-resort-heading mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                      title="Please enter a valid email address."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta"
                    />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-resort-heading mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta"
                    />
                  </div>
                  {hasGuestRoomLine && (
                    <div>
                      <label className="block text-sm font-medium text-resort-heading mb-2">
                        Expected Arrival Time
                      </label>
                      <select
                        name="expectedArrivalTime"
                        value={formData.expectedArrivalTime}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta bg-cream"
                      >
                        <option value="">Select arrival time (optional)</option>
                        {ARRIVAL_TIME_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Standard check-in from {formatTime12h(resortContact.checkInTime)}. Tell us if
                        you plan to arrive earlier or later.
                      </p>
                    </div>
                  )}
                  {hasConferenceLine && !hasGuestRoomLine && (
                    <div>
                      <label className="block text-sm font-medium text-resort-heading mb-2">
                        Event timeline
                      </label>
                      <textarea
                        name="expectedArrivalTime"
                        value={formData.expectedArrivalTime}
                        onChange={handleChange}
                        rows={3}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta"
                        placeholder="e.g. 9:00 AM setup · 10:00 AM–5:00 PM program · 6:00 PM wrap-up"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Share setup, program, and breakdown times for your event day.
                      </p>
                    </div>
                  )}
                </div>

                {hasConferenceLine && hasGuestRoomLine && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-resort-heading mb-2">
                      Event timeline
                    </label>
                    <textarea
                      name="eventTimeline"
                      value={formData.eventTimeline}
                      onChange={handleChange}
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta"
                      placeholder="e.g. 9:00 AM setup · 10:00 AM–5:00 PM program · 6:00 PM wrap-up"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Conference schedule for your event day(s).
                    </p>
                  </div>
                )}

                <div className="mt-6">
                  <label className="block text-sm font-medium text-resort-heading mb-2">
                    Special Requests
                  </label>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleChange}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta"
                    placeholder="Late check-in, dietary needs, extra bedding, celebration setup, transport help, or any other requests..."
                  />
                </div>
              </section>

              <div className="bg-sand-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Check-in:</span> 2:00 PM |{' '}
                  <span className="font-medium">Check-out:</span> 11:00 AM
                </p>
              </div>

              <div className="border-t border-stone-200/80 pt-6">
                <p className="text-xs text-gray-500 mb-3 text-center">
                  By submitting, you agree to Cherekh Center&apos;s{' '}
                  <Link to="/terms" className="underline hover:text-resort-heading">
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link to="/cancellation-policy" className="underline hover:text-resort-heading">
                    Cancellation Policy
                  </Link>
                  .
                </p>
                <div className="flex flex-col items-center gap-3">
                  <MorphButton
                    type="submit"
                    text="Request your stay"
                    icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
                    showArrow={!isSubmitting}
                    isLoading={isSubmitting}
                    loadingText={submitLoadingText}
                    fullWidth
                    className="text-base sm:text-lg"
                  />
                  {submitMessage ? (
                    <p
                      className={`text-center text-sm leading-relaxed ${
                        submitPhase === 'conflict' || submitPhase === 'error'
                          ? 'text-red-600'
                          : 'text-stone-600'
                      }`}
                      role={submitPhase === 'error' || submitPhase === 'conflict' ? 'alert' : undefined}
                    >
                      {submitMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      </section>
      <WhatsAppChat message="Hello! I need help with my room booking at Cherekh Center." />
    </motion.div>
  )
}

export default Booking
