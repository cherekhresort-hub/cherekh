import { useMemo } from 'react'
import { computeBookingFinancials, countsTowardRevenue, getBookingRooms, type Booking } from '../../utils/bookings'
import { toISODate } from '../utils/date'
import type { AdminRoom } from './useRoomsData'

export interface DashboardMetrics {
  todayBookings: number
  activeGuests: number
  occupiedRooms: number
  availableRooms: number
  pendingCheckIns: number
  pendingCheckOuts: number
  monthlyRevenue: number
  occupancyRate: number
}

export const useDashboardMetrics = (bookings: Booking[], rooms: AdminRoom[]): DashboardMetrics => {
  return useMemo(() => {
    const today = toISODate()
    const monthStart = today.slice(0, 7)

    const inHouseBookings = bookings.filter(
      (b) => b.status === 'confirmed' && b.checkIn <= today && b.checkOut > today
    )

    const pendingCheckIns = bookings.filter(
      (b) => b.status === 'confirmed' && b.checkIn === today
    ).length

    const pendingCheckOuts = bookings.filter(
      (b) => b.status === 'confirmed' && b.checkOut === today
    ).length

    const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length
    const availableRooms = rooms.filter((r) => r.status === 'available').length

    const activeGuests = inHouseBookings.reduce((sum, booking) => {
      const lines = getBookingRooms(booking)
      return sum + lines.reduce((s, l) => s + l.totalGuests, 0)
    }, 0)

    const todayBookings = bookings.filter((b) => b.createdAt?.slice(0, 10) === today).length

    const monthlyRevenue = bookings
      .filter((b) => b.checkIn?.slice(0, 7) === monthStart && countsTowardRevenue(b))
      .reduce((sum, b) => sum + computeBookingFinancials(b).total, 0)

    const totalRooms = rooms.length || 1
    const occupancyRate = Math.round((occupiedRooms / totalRooms) * 100)

    return {
      todayBookings,
      activeGuests,
      occupiedRooms,
      availableRooms,
      pendingCheckIns,
      pendingCheckOuts,
      monthlyRevenue,
      occupancyRate,
    }
  }, [bookings, rooms])
}
