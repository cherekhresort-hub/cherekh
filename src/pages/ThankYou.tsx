import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { getBookingRooms, type Booking } from '../utils/bookings'
import { resolveBookingForThankYou } from '../lib/resolveBookingConfirmation'
import { formatDisplayDate } from '../utils/dates'
import { getRoomById, formatCurrency } from '../utils/rooms'
import {
  calculateLineNightlyRate,
  calculateStayNights,
  getArrivalTimeLabel,
  getBookingArrivalTime,
  getBookingEventTimeline,
  roomToOption,
} from '../utils/bookingHelpers'
import { formatBookingId } from '../utils/bookingId'
import {
  BookingThankYouLayout,
  BookingThankYouLoading,
  type ThankYouDetailSection,
} from '../components/BookingThankYouLayout'

const ThankYou = () => {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const bookingId = searchParams.get('id')
  const emailParam = searchParams.get('email')
  const stateBooking = (location.state as { booking?: Booking } | null)?.booking ?? null
  const [booking, setBooking] = useState<Booking | null>(
    stateBooking?.id === bookingId ? stateBooking : null
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookingId) {
      setLoading(false)
      navigate('/booking')
      return
    }

    let cancelled = false

    ;(async () => {
      const resolved = await resolveBookingForThankYou(bookingId, {
        stateBooking,
        email: emailParam,
      })
      if (cancelled) return
      if (!resolved) {
        setLoading(false)
        navigate('/booking')
        return
      }
      if (resolved.roomType === 'conference') {
        setLoading(false)
        navigate(
          `/conference-thank-you?id=${bookingId}${emailParam ? `&email=${encodeURIComponent(emailParam)}` : ''}`,
          { state: { booking: resolved }, replace: true }
        )
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

  const bookingRooms = getBookingRooms(booking)
  const nights = calculateStayNights(booking.checkIn, booking.checkOut)
  const roomBreakdown = bookingRooms.map((roomLine) => {
    const room = getRoomById(roomLine.roomType)
    const option = room ? roomToOption(room) : undefined
    const line = {
      id: roomLine.roomType,
      roomType: roomLine.roomType,
      adults: roomLine.adults,
      children: roomLine.children,
    }
    const rates = calculateLineNightlyRate(line, option)
    return {
      ...roomLine,
      stayTotal: rates.nightlyTotal * nights,
    }
  })
  const totalAmount = roomBreakdown.reduce((sum, room) => sum + room.stayTotal, 0)

  const guestSummary = [
    `${booking.adults} ${booking.adults === 1 ? 'adult' : 'adults'}`,
    booking.children > 0
      ? `${booking.children} ${booking.children === 1 ? 'child' : 'children'}`
      : null,
  ]
    .filter(Boolean)
    .join(', ')

  const sections: ThankYouDetailSection[] = [
    {
      title: 'Stay',
      rows: [
        {
          label: 'Check-in',
          value: formatDisplayDate(booking.checkIn),
          hint: 'From 2:00 PM',
        },
        {
          label: 'Check-out',
          value: formatDisplayDate(booking.checkOut),
          hint: 'By 11:00 AM',
        },
        {
          label: 'Duration',
          value: `${nights} ${nights === 1 ? 'night' : 'nights'}`,
        },
        ...(bookingRooms.length === 1
          ? [
              {
                label: 'Room',
                value: bookingRooms[0].roomName,
                hint: `${bookingRooms[0].totalGuests} ${bookingRooms[0].totalGuests === 1 ? 'guest' : 'guests'}`,
              },
            ]
          : bookingRooms.map((roomLine, index) => ({
              label: `Room ${index + 1}`,
              value: roomLine.roomName,
              hint: `${roomLine.totalGuests} ${roomLine.totalGuests === 1 ? 'guest' : 'guests'}`,
            }))),
        {
          label: 'Guests',
          value: guestSummary,
        },
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

  const arrivalTime = getBookingArrivalTime(booking)
  const eventTimeline = getBookingEventTimeline(booking)
  const noteRows = [
    arrivalTime
      ? { label: 'Arrival', value: getArrivalTimeLabel(arrivalTime) }
      : null,
    eventTimeline ? { label: 'Timeline', value: eventTimeline } : null,
    booking.specialRequests
      ? { label: 'Requests', value: booking.specialRequests }
      : null,
  ].filter((row): row is { label: string; value: string } => row !== null)

  if (noteRows.length > 0) {
    sections.push({ title: 'Notes', rows: noteRows })
  }

  const statusLabel =
    booking.status.charAt(0).toUpperCase() + booking.status.slice(1)

  return (
    <BookingThankYouLayout
      printAreaId="booking-print-area"
      title="Booking request received"
      message="Thank you for choosing Cherekh Center. Your reservation request has been submitted successfully. We will verify availability and contact you within 24 hours to confirm your stay."
      referenceId={formatBookingId(booking.id)}
      sections={sections}
      total={
        totalAmount > 0
          ? { label: 'Estimated total', value: formatCurrency(totalAmount) }
          : undefined
      }
      note={`Status: ${statusLabel}. Please retain this reference number for your records.`}
      secondaryAction={{ to: '/rooms', label: 'View rooms' }}
    />
  )
}

export default ThankYou
