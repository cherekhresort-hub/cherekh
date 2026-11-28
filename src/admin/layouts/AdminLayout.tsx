import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import '../styles/calendar.css'
import 'sweetalert2/dist/sweetalert2.min.css'
import '../styles/swal.css'
import { RouteFallback } from '../../components/RouteFallback'
import { useAuth } from '../../contexts/AuthProvider'
import { Sidebar } from '../components/layout/Sidebar'
import { MobileNav } from '../components/layout/MobileNav'
import { ToastProvider } from '../components/ui/Toast'
import { BookingsBootstrap } from '../../components/BookingsBootstrap'
import { canAccessAdminPath } from '../utils/navAccess'
import { useActivityNavBadge } from '../hooks/useStaffActivityLog'
import { useInquiriesNavBadge } from '../hooks/useInquiriesNavBadge'
import { dismissHeroSplashForRoute } from '../../utils/heroSplash'

export const AdminLayout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loading, role, isAdmin } = useAuth()
  const activityUnreadCount = useActivityNavBadge(isAdmin)
  // null while role loads so the badge does not flash to 0; false for booking officers.
  const inquiriesBadgeEnabled = !role ? null : role === 'admin' || role === 'manager'
  const inquiriesNewCount = useInquiriesNavBadge(inquiriesBadgeEnabled)

  useEffect(() => {
    dismissHeroSplashForRoute(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  useEffect(() => {
    if (!role || loading || !isAuthenticated) return
    if (!canAccessAdminPath(role, location.pathname)) {
      navigate('/admin', { replace: true })
    }
  }, [role, location.pathname, loading, isAuthenticated, navigate])

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-gradient flex items-center justify-center">
        <RouteFallback />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <ToastProvider>
      <BookingsBootstrap />
      <div className="min-h-screen bg-admin-gradient text-stone-800 flex">
        <Sidebar activityUnreadCount={activityUnreadCount} inquiriesNewCount={inquiriesNewCount} />
        <div className="flex-1 min-w-0 pb-36 lg:pb-0">
          <Outlet />
        </div>
        <MobileNav activityUnreadCount={activityUnreadCount} inquiriesNewCount={inquiriesNewCount} />
      </div>
    </ToastProvider>
  )
}
