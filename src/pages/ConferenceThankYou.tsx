import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { type Booking } from '../utils/bookings'
import { resolveBookingForThankYou } from '../lib/resolveBookingConfirmation'
import {
  formatEventDayLabel,
  formatEventDatesDisplay,
  getBookingEventDates,
  getBookingEventTimeline,
} from '../utils/bookingHelpers'
import { formatBookingId } from '../utils/bookingId'
import {
  BookingThankYouLayout,
  BookingThankYouLoading,
  type ThankYouDetailSection,
} from '../components/BookingThankYouLayout'

const parseConferenceNotes = (specialRequests?: string) => {
  if (!specialRequests) return {}
  const lines = specialRequests.split('\n')
  const parsed: Record<string, string> = {}
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    parsed[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return parsed
}

const ConferenceThankYou = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const bookingId = searchParams.get('id')
  const emailParam = searchParams.get('email')
  const stateBooking = (location.state as { booking?: Booking } | null)?.booking ?? null
  const [booking, setBooking] = useState<Booking | null>(
    stateBooking?.id === bookingId ? stateBooking : null
  )
  const [loading, setLoading] = useState(!(stateBooking?.id === bookingId))

  useEffect(() => {
    if (!bookingId) {
      navigate('/conference-room/booking')
      return
    }

    let cancelled = false

    ;(async () => {
      const resolved = await resolveBookingForThankYou(bookingId, {
        stateBooking,
        email: emailParam,
      })
      if (cancelled) return
      if (!resolved || resolved.roomType !== 'conference') {
        setLoading(false)
        navigate('/conference-room/booking')
        return
      }
      setBooking(resolved)
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [bookingId, emailParam, navigate, stateBooking])

  if (loading) {
    return <BookingThankYouLoading />
  }

  if (!booking) {
    return null
  }

  const eventDates = getBookingEventDates(booking)
  const days = eventDates.length
  const eventTimeline = getBookingEventTimeline(booking)
  const parsedNotes = parseConferenceNotes(booking.specialRequests)
  const additionalNotes = parsedNotes['Additional Notes']
  const eventType = parsedNotes['Event Type']
  const organization = parsedNotes['Organization']

  const sections: ThankYouDetailSection[] = [
    {
      title: 'Event',
      rows: [
        {
          label: 'Dates',
          value: formatEventDatesDisplay(eventDates),
          hint: formatEventDayLabel(days),
        },
        {
          label: 'Venue',
          value: 'Conference Room',
        },
        {
          label: 'Attendees',
          value: String(booking.totalGuests),
        },
        ...(eventType && eventType !== 'Not specified'
          ? [{ label: 'Type', value: eventType }]
          : []),
        ...(organization && organization !== 'Not specified' && organization !== 'Not applicable'
          ? [{ label: 'Organization', value: organization }]
          : []),
      ],
    },
    {
      title: 'Contact',
      rows: [
        { label: 'Name', value: booking.name },
        { label: 'Email', value: booking.email },
        { label: 'Phone', value: booking.phone },
      ],
    },
  ]

  const noteRows = [
    eventTimeline ? { label: 'Timeline', value: eventTimeline } : null,
    additionalNotes && additionalNotes !== 'None'
      ? { label: 'Notes', value: additionalNotes }
      : null,
  ].filter((row): row is { label: string; value: string } => row !== null)

  if (noteRows.length > 0) {
    sections.push({ title: 'Details', rows: noteRows })
  }

  const statusLabel =
    booking.status.charAt(0).toUpperCase() + booking.status.slice(1)

  return (
    <BookingThankYouLayout
      printAreaId="conference-print-area"
      title="Event request received"
      message="Thank you for choosing Cherekh Center. Your conference and event request has been submitted successfully. We will review the details and contact you within 24 hours to confirm your reservation."
      referenceId={formatBookingId(booking.id)}
      sections={sections}
      note={`Status: ${statusLabel}. Please retain this reference number for your records.`}
      secondaryAction={{ to: '/conference-room', label: 'Conference room' }}
    />
  )
}

export default ConferenceThankYou
