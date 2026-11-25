import { TopBar } from '../components/layout/TopBar'
import { PageSkeleton } from '../components/ui/Skeleton'
import { useBookingsData } from '../hooks/useBookingsData'
import { useRoomsData } from '../hooks/useRoomsData'
import { useDashboardMetrics } from '../hooks/useMetrics'
import { SummaryCards } from '../components/dashboard/SummaryCards'
import { BookingCalendar } from '../components/dashboard/BookingCalendar'
import { RoomStatusGrid } from '../components/dashboard/RoomStatusGrid'
import { RecentBookings } from '../components/dashboard/RecentBookings'

const Dashboard = () => {
  const { bookings, loading } = useBookingsData()
  const { rooms } = useRoomsData()
  const metrics = useDashboardMetrics(bookings, rooms)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <>
      <TopBar title="Welcome back" description={today} />
      <main className="px-4 lg:px-8 py-6 space-y-6">
        {loading && bookings.length === 0 ? (
          <PageSkeleton variant="dashboard" />
        ) : (
          <>
            <SummaryCards metrics={metrics} />
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <BookingCalendar bookings={bookings} />
              </div>
              <div>
                <RoomStatusGrid rooms={rooms} />
              </div>
            </div>
            <RecentBookings bookings={bookings} />
          </>
        )}
      </main>
    </>
  )
}

export default Dashboard
