import { useMemo } from 'react'
import {
  bookingMoneyHidden,
  computeBookingFinancials,
  countsTowardRevenue,
  getBookingRooms,
  type Booking,
} from '../../utils/bookings'
import { isFoodOnlyBooking } from '../../utils/bookingHelpers'
import { toISODate } from '../utils/date'
import type { AdminRoom } from './useRoomsData'

export interface DashboardStayItem {
  booking: Booking
  roomsLabel: string
  guests: number
}

export interface DashboardAttentionItem {
  booking: Booking
  reason: 'pending' | 'balance_due' | 'arriving_unpaid'
  label: string
  amount?: number
}

export interface DashboardMetrics {
  todayBookings: number
  activeGuests: number
  occupiedRooms: number
  availableRooms: number
  cleaningRooms: number
  maintenanceRooms: number
  pendingCheckIns: number
  pendingCheckOuts: number
  pendingBookings: number
  inHouseStays: number
  monthlyRevenue: number
  outstandingBalance: number
  occupancyRate: number
  guestRoomCount: number
  arrivals: DashboardStayItem[]
  departures: DashboardStayItem[]
  attention: DashboardAttentionItem[]
}

const roomsLabelOf = (booking: Booking): string => {
  const lines = getBookingRooms(booking)
  if (lines.length === 0) return booking.roomName || '—'
  return lines.map((line) => line.roomName).join(', ')
}

const guestCountOf = (booking: Booking): number => {
  const lines = getBookingRooms(booking)
  if (lines.length === 0) return booking.totalGuests || 0
  return lines.reduce((sum, line) => sum + line.totalGuests, 0)
}

const isInHouseStay = (booking: Booking, today: string): boolean => {
  if (isFoodOnlyBooking(booking)) return false
  if (booking.checkIn > today || booking.checkOut <= today) return false
  // Prefer explicit checked-in; keep confirmed overlapping stays as in-house for older records.
  return booking.status === 'checked-in' || booking.status === 'confirmed'
}

export const useDashboardMetrics = (bookings: Booking[], rooms: AdminRoom[]): DashboardMetrics => {
  return useMemo(() => {
    const today = toISODate()
    const monthStart = today.slice(0, 7)
    const stayBookings = bookings.filter((b) => !isFoodOnlyBooking(b))

    const inHouseBookings = stayBookings.filter((b) => isInHouseStay(b, today))

    const arrivalBookings = stayBookings.filter(
      (b) => b.status === 'confirmed' && b.checkIn === today
    )
    const departureBookings = stayBookings.filter(
      (b) =>
        (b.status === 'checked-in' || b.status === 'confirmed') &&
        b.checkOut === today &&
        b.checkIn <= today
    )

    const pendingBookings = bookings.filter((b) => b.status === 'pending').length

    const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length
    const availableRooms = rooms.filter((r) => r.status === 'available').length
    const cleaningRooms = rooms.filter((r) => r.status === 'cleaning').length
    const maintenanceRooms = rooms.filter((r) => r.status === 'maintenance').length
    const guestRoomCount = rooms.filter((r) => !r.isConference).length || 1

    const activeGuests = inHouseBookings.reduce((sum, booking) => sum + guestCountOf(booking), 0)
    const todayBookings = bookings.filter((b) => b.createdAt?.slice(0, 10) === today).length

    const monthlyRevenue = bookings
      .filter((b) => b.checkIn?.slice(0, 7) === monthStart && countsTowardRevenue(b))
      .reduce((sum, b) => sum + computeBookingFinancials(b).total, 0)

    const outstandingBalance = bookings
      .filter((b) => b.status !== 'cancelled' && !bookingMoneyHidden(b))
      .reduce((sum, b) => {
        const fin = computeBookingFinancials(b)
        return sum + Math.max(0, fin.outstanding)
      }, 0)

    const occupancyRate = Math.round((occupiedRooms / guestRoomCount) * 100)

    const arrivals: DashboardStayItem[] = arrivalBookings
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((booking) => ({
        booking,
        roomsLabel: roomsLabelOf(booking),
        guests: guestCountOf(booking),
      }))

    const departures: DashboardStayItem[] = departureBookings
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((booking) => ({
        booking,
        roomsLabel: roomsLabelOf(booking),
        guests: guestCountOf(booking),
      }))

    const attentionMap = new Map<string, DashboardAttentionItem>()

    bookings
      .filter((b) => b.status === 'pending')
      .forEach((booking) => {
        attentionMap.set(booking.id, {
          booking,
          reason: 'pending',
          label: 'Awaiting confirmation',
        })
      })

    bookings
      .filter((b) => b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'checked-out')
      .forEach((booking) => {
        if (bookingMoneyHidden(booking)) return
        const fin = computeBookingFinancials(booking)
        if (fin.outstanding <= 0) return
        const arrivingUnpaid = booking.status === 'confirmed' && booking.checkIn === today
        attentionMap.set(booking.id, {
          booking,
          reason: arrivingUnpaid ? 'arriving_unpaid' : 'balance_due',
          label: arrivingUnpaid ? 'Arriving with balance due' : 'Outstanding balance',
          amount: fin.outstanding,
        })
      })

    const attention = [...attentionMap.values()]
      .sort((a, b) => {
        const rank = { arriving_unpaid: 0, pending: 1, balance_due: 2 }
        const diff = rank[a.reason] - rank[b.reason]
        if (diff !== 0) return diff
        return (b.amount ?? 0) - (a.amount ?? 0)
      })
      .slice(0, 8)

    return {
      todayBookings,
      activeGuests,
      occupiedRooms,
      availableRooms,
      cleaningRooms,
      maintenanceRooms,
      pendingCheckIns: arrivals.length,
      pendingCheckOuts: departures.length,
      pendingBookings,
      inHouseStays: inHouseBookings.length,
      monthlyRevenue,
      outstandingBalance,
      occupancyRate,
      guestRoomCount,
      arrivals,
      departures,
      attention,
    }
  }, [bookings, rooms])
}
