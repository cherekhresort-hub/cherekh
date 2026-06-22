import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Phone, MessageCircle } from 'lucide-react'
import { saveBooking } from '../utils/bookings'
import {
  getRoomById,
  areRoomsAvailableForBooking,
  areConferenceEventDatesAvailable,
  formatCurrency,
} from '../utils/rooms'
import { getTodayDate, toLocalDateString } from '../utils/dates'
import { cacheBookingConfirmation } from '../lib/bookingConfirmationCache'
import {
  BookingPersistError,
  BookingInventoryConflictError,
  BookingRateLimitError,
} from '../lib/bookingsStore'
import WhatsAppChat from '../components/WhatsAppChat'
import { MorphButton } from '../components/ui/morph-button'
import { CalendarCheck } from 'lucide-react'
import EventDatesPicker from '../components/EventDatesPicker'
import { withRateLimit, RateLimitPresets } from '../utils/rateLimiter'
import { getCSRFToken, validateFormSubmission, createProtectedFormData } from '../utils/csrf'
import { isValidEmail, normalizeEmail } from '../utils/validation'
import { useResortContact } from '../contexts/SiteSettingsProvider'
import {
  deriveConferenceBounds,
  formatEventDayLabel,
  normalizeEventDates,
} from '../utils/bookingHelpers'
import {
  waitMinSubmitDuration,
  waitMinStepDuration,
  yieldToPaint,
} from '../utils/bookingSubmitTiming'

type SubmitPhase = 'idle' | 'checking' | 'reserving' | 'success' | 'conflict' | 'error'

const SUBMIT_BUTTON_MESSAGES = {
  checking: 'Checking availability for your dates…',
  reserving: 'Securing your event…',
  success: 'Request sent!',
} as const

const inputClass =
  'w-full rounded-lg border border-stone-200 bg-cream px-3.5 py-2.5 text-sm text-resort-heading placeholder:text-stone-400 focus:border-resort-cta focus:outline-none focus:ring-2 focus:ring-resort-cta/20 transition-shadow'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500'

const ConferenceRoomBooking = () => {
  const navigate = useNavigate()
  const resortContact = useResortContact()

  const [eventDates, setEventDates] = useState<string[]>([])
  const [formData, setFormData] = useState({
    attendees: '1',
    roomType: 'conference',
    eventType: '',
    name: '',
    email: '',
    phone: '',
    organization: '',
    eventTimeline: '',
    specialRequests: '',
  })

  const [dateErrors, setDateErrors] = useState({
    eventDates: '',
    attendees: '',
  })
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null)
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle')
  const [submitMessage, setSubmitMessage] = useState('')

  const isSubmitting =
    submitPhase === 'checking' || submitPhase === 'reserving' || submitPhase === 'success'
  const submitLoadingText =
    submitPhase === 'checking' || submitPhase === 'reserving' || submitPhase === 'success'
      ? SUBMIT_BUTTON_MESSAGES[submitPhase]
      : undefined

  const conferenceRoom = getRoomById('conference')
  const maxAttendees = conferenceRoom?.capacity || 100
  const eventDayCount = eventDates.length
  const hideOrganizationField =
    formData.eventType === 'Wedding' ||
    formData.eventType === 'Engagement' ||
    formData.eventType === 'Birthday' ||
    formData.eventType === 'Anniversary'

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setFullYear(maxDate.getFullYear() + 1)
    return toLocalDateString(maxDate)
  }

  useEffect(() => {
    if (hideOrganizationField && formData.organization) {
      setFormData((prev) => ({ ...prev, organization: '' }))
    }
  }, [hideOrganizationField, formData.organization])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    if (name === 'attendees') {
      if (value !== '' && !/^\d+$/.test(value)) {
        return
      }
      if (value !== '') {
        const attendeeCount = parseInt(value, 10)
        if (attendeeCount > maxAttendees) {
          setDateErrors({
            ...dateErrors,
            attendees: `Maximum capacity is ${maxAttendees} attendees`,
          })
          return
        }
      }
      setDateErrors({ ...dateErrors, attendees: '' })
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    const protectedData = createProtectedFormData({ ...formData, eventDates })
    if (!validateFormSubmission(protectedData)) {
      setSubmitMessage('Security validation failed. Please refresh the page and try again.')
      setSubmitPhase('error')
      return
    }

    const email = normalizeEmail(formData.email)
    if (!isValidEmail(email)) {
      setSubmitMessage('Please enter a valid email address.')
      setSubmitPhase('error')
      return
    }

    const normalizedDates = normalizeEventDates(eventDates)
    if (normalizedDates.length === 0) {
      setDateErrors({
        eventDates: 'Add at least one event date',
        attendees: '',
      })
      return
    }

    const today = getTodayDate()
    if (normalizedDates.some((d) => d < today)) {
      setDateErrors({
        eventDates: 'Event dates cannot be in the past',
        attendees: '',
      })
      return
    }

    const attendeeCount = parseInt(formData.attendees, 10)
    if (!Number.isFinite(attendeeCount) || attendeeCount < 1) {
      setSubmitMessage('Please specify the number of attendees.')
      setSubmitPhase('error')
      return
    }

    if (attendeeCount > maxAttendees) {
      setSubmitMessage(`Maximum capacity is ${maxAttendees} attendees.`)
      setSubmitPhase('error')
      return
    }

    if (isAvailable === false) {
      setSubmitMessage(
        'The conference room is not available for the selected dates. Please choose different dates.'
      )
      setSubmitPhase('conflict')
      return
    }

    const { checkIn, checkOut } = deriveConferenceBounds(normalizedDates)
    const startedAt = Date.now()
    setSubmitMessage('')
    setSubmitPhase('checking')
    await yieldToPaint()
    const checkingStartedAt = Date.now()

    try {
      await withRateLimit(RateLimitPresets.BOOKING_FORM, async () => {
        const conferenceStillFree = await areRoomsAvailableForBooking(
          checkIn,
          checkOut,
          ['conference'],
          { conferenceEventDates: normalizedDates }
        )

        await waitMinStepDuration(checkingStartedAt)

        if (!conferenceStillFree) {
          setIsAvailable(false)
          await waitMinSubmitDuration(startedAt)
          setSubmitMessage(
            'The conference room is no longer available for these dates. Please choose different dates.'
          )
          setSubmitPhase('conflict')
          return
        }

        setSubmitPhase('reserving')
        await yieldToPaint()
        const reservingStartedAt = Date.now()

        const organizationLabel = hideOrganizationField
          ? 'Not applicable'
          : formData.organization || 'Not specified'
        const eventNotes = formData.specialRequests || 'None'
        const booking = await saveBooking({
          checkIn,
          checkOut,
          eventDates: normalizedDates,
          adults: attendeeCount,
          children: 0,
          totalGuests: attendeeCount,
          roomType: 'conference',
          roomName: 'Conference Room',
          name: formData.name,
          email,
          phone: formData.phone,
          expectedArrivalTime: formData.eventTimeline || undefined,
          specialRequests: [
            `Event Type: ${formData.eventType || 'Not specified'}`,
            `Organization: ${organizationLabel}`,
            `Attendees: ${attendeeCount}`,
            `Additional Notes: ${eventNotes}`,
          ].join('\n'),
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
        navigate(`/conference-thank-you?${thankYouParams.toString()}`, { state: { booking } })
      })
    } catch (error: unknown) {
      await waitMinSubmitDuration(startedAt)
      const message = error instanceof Error ? error.message : ''

      if (message.includes('Rate limit exceeded') || error instanceof BookingRateLimitError) {
        setSubmitMessage(
          message ||
            'Rate limit exceeded. Please try again in about an hour or contact us by phone or WhatsApp.'
        )
        setSubmitPhase('error')
      } else if (error instanceof BookingInventoryConflictError) {
        setIsAvailable(false)
        setSubmitMessage(error.message)
        setSubmitPhase('conflict')
      } else if (error instanceof BookingPersistError) {
        setSubmitMessage(error.message)
        setSubmitPhase('error')
      } else {
        console.error('Error saving conference booking:', error)
        setSubmitMessage('There was an error submitting your booking. Please try again.')
        setSubmitPhase('error')
      }
    }
  }

  useEffect(() => {
    const check = async () => {
      const normalized = normalizeEventDates(eventDates)
      if (normalized.length === 0) {
        setIsAvailable(null)
        return
      }

      const available = await areConferenceEventDatesAvailable(normalized)
      setIsAvailable(available)
    }
    void check()
  }, [eventDates])

  return (
    <div className="min-h-screen bg-resort-bg">
      <div className="mx-auto max-w-5xl px-4 page-content-inset sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-10 max-w-xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Booking
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-resort-heading sm:text-4xl">
            Book your event
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
            Choose your dates and share event details. We will confirm availability within 24 hours
            by phone or WhatsApp.
          </p>
        </motion.header>

        <div className="grid gap-8 lg:grid-cols-5 lg:gap-10">
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="lg:col-span-2"
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm">
              <div className="border-b border-stone-100 px-5 py-4 sm:px-6">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Venue summary
                </h2>
              </div>
              <dl className="px-5 sm:px-6">
                <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 border-b border-stone-100 py-3.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Capacity
                  </dt>
                  <dd className="text-sm font-medium text-resort-heading">80–100 attendees</dd>
                </div>
                {conferenceRoom && conferenceRoom.price > 0 ? (
                  <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 border-b border-stone-100 py-3.5">
                    <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                      Rate
                    </dt>
                    <dd className="text-sm font-medium text-resort-heading">
                      {formatCurrency(conferenceRoom.price)}
                      <span className="font-normal text-stone-500"> / event day</span>
                    </dd>
                  </div>
                ) : null}
                <div className="grid grid-cols-[minmax(0,5.5rem)_1fr] gap-x-4 py-3.5">
                  <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">
                    Includes
                  </dt>
                  <dd className="text-sm text-stone-600">
                    AV equipment, projector, sound system, Wi‑Fi
                  </dd>
                </div>
              </dl>
              <div className="border-t border-stone-100 bg-sand-100/60 px-5 py-4 text-sm text-stone-600 sm:px-6">
                Availability is subject to confirmation.{' '}
                <Link to="/conference-room" className="font-medium text-resort-heading hover:text-resort-cta">
                  View venue details
                </Link>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <a
                href={resortContact.telHref}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-stone-200 bg-cream px-4 py-2.5 text-sm font-medium text-resort-heading transition-colors hover:border-resort-heading/30 hover:bg-sand-100"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Call
              </a>
              <a
                href={resortContact.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-resort-heading px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-resort-heading/90"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp
              </a>
            </div>
          </motion.aside>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="lg:col-span-3"
            aria-labelledby="event-form-heading"
          >
            <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm">
              <div className="border-b border-stone-100 px-5 py-5 sm:px-8">
                <h2
                  id="event-form-heading"
                  className="font-serif text-xl font-semibold text-resort-heading sm:text-2xl"
                >
                  Event details
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  Bookings can be made up to one year in advance.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
                <input type="hidden" name="_csrf" value={getCSRFToken()} />

                <EventDatesPicker
                  dates={eventDates}
                  onChange={(dates) => {
                    setEventDates(dates)
                    setDateErrors((prev) => ({ ...prev, eventDates: '' }))
                    setSubmitPhase('idle')
                    setSubmitMessage('')
                  }}
                  minDate={getTodayDate()}
                  maxDate={getMaxDate()}
                  error={dateErrors.eventDates}
                />

                {eventDayCount > 0 && isAvailable === false ? (
                  <p className="text-sm text-red-600">
                    Conference room is not available for one or more selected dates.
                  </p>
                ) : null}
                {eventDayCount > 0 && isAvailable === true ? (
                  <p className="text-sm text-stone-600">
                    Available for {formatEventDayLabel(eventDayCount).toLowerCase()}.
                  </p>
                ) : null}

                <div>
                  <label htmlFor="conference-attendees" className={labelClass}>
                    Attendees
                  </label>
                  <input
                    type="number"
                    id="conference-attendees"
                    name="attendees"
                    value={formData.attendees}
                    onChange={handleChange}
                    max={maxAttendees}
                    required
                    className={`${inputClass} ${dateErrors.attendees ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`}
                  />
                  {dateErrors.attendees ? (
                    <p className="mt-1 text-sm text-red-600">{dateErrors.attendees}</p>
                  ) : (
                    <p className="mt-1 text-xs text-stone-500">Up to {maxAttendees} attendees</p>
                  )}
                  {conferenceRoom && conferenceRoom.price > 0 && eventDayCount > 0 ? (
                    <p className="mt-2 text-sm font-medium text-resort-heading">
                      Estimated {formatCurrency(conferenceRoom.price * eventDayCount)}{' '}
                      <span className="font-normal text-stone-500">
                        ({formatEventDayLabel(eventDayCount)} × {formatCurrency(conferenceRoom.price)})
                      </span>
                    </p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="conference-event-type" className={labelClass}>
                    Event type <span className="normal-case tracking-normal text-stone-400">(optional)</span>
                  </label>
                  <select
                    id="conference-event-type"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="">Select event type</option>
                    <option value="Wedding">Wedding</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Conference">Conference</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Training">Training</option>
                    <option value="Presentation">Presentation</option>
                    <option value="Corporate Event">Corporate Event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                    Contact
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="conference-name" className={labelClass}>
                        Full name
                      </label>
                      <input
                        type="text"
                        id="conference-name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        autoComplete="name"
                        className={inputClass}
                      />
                    </div>

                    {!hideOrganizationField ? (
                      <div>
                        <label htmlFor="conference-organization" className={labelClass}>
                          Organization <span className="normal-case tracking-normal text-stone-400">(optional)</span>
                        </label>
                        <input
                          type="text"
                          id="conference-organization"
                          name="organization"
                          value={formData.organization}
                          onChange={handleChange}
                          className={inputClass}
                        />
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="conference-email" className={labelClass}>
                          Email
                        </label>
                        <input
                          type="email"
                          id="conference-email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
                          autoComplete="email"
                          inputMode="email"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="conference-phone" className={labelClass}>
                          Phone
                        </label>
                        <input
                          type="tel"
                          id="conference-phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          autoComplete="tel"
                          inputMode="tel"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="conference-timeline" className={labelClass}>
                    Event timeline <span className="normal-case tracking-normal text-stone-400">(optional)</span>
                  </label>
                  <textarea
                    id="conference-timeline"
                    name="eventTimeline"
                    value={formData.eventTimeline}
                    onChange={handleChange}
                    rows={3}
                    className={`${inputClass} min-h-[80px] resize-y`}
                    placeholder="e.g. 9:00 AM setup · 10:00 AM–5:00 PM program"
                  />
                </div>

                <div>
                  <label htmlFor="conference-requests" className={labelClass}>
                    Special requests <span className="normal-case tracking-normal text-stone-400">(optional)</span>
                  </label>
                  <textarea
                    id="conference-requests"
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleChange}
                    rows={4}
                    className={`${inputClass} min-h-[96px] resize-y`}
                    placeholder="Equipment, catering, seating, or other requirements"
                  />
                </div>

                <div className="border-t border-stone-100 pt-5">
                  <p className="text-xs text-stone-500">
                    By submitting, you agree to Cherekh Center&apos;s{' '}
                    <Link to="/terms" className="text-resort-heading hover:text-resort-cta">
                      Terms & Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/cancellation-policy" className="text-resort-heading hover:text-resort-cta">
                      Cancellation & Event Policy
                    </Link>
                    .
                  </p>

                  <div className="mt-4 flex flex-col items-center gap-3">
                    <MorphButton
                      type="submit"
                      text="Book your event"
                      icon={<CalendarCheck className="h-5 w-5" aria-hidden />}
                      showArrow={!isSubmitting}
                      isLoading={isSubmitting}
                      loadingText={submitLoadingText}
                      fullWidth
                      disabled={isAvailable === false || eventDayCount === 0}
                      className="text-base"
                    />
                    {submitMessage ? (
                      <p
                        className={`text-center text-sm leading-relaxed ${
                          submitPhase === 'conflict' || submitPhase === 'error'
                            ? 'text-red-600'
                            : 'text-stone-600'
                        }`}
                        role={
                          submitPhase === 'error' || submitPhase === 'conflict' ? 'alert' : undefined
                        }
                      >
                        {submitMessage}
                      </p>
                    ) : null}
                  </div>
                </div>
              </form>
            </div>
          </motion.section>
        </div>
      </div>
      <WhatsAppChat message="Hello! I need help with my conference room booking at Cherekh Center." />
    </div>
  )
}

export default ConferenceRoomBooking
