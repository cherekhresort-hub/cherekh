import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminNavItems } from '../../data/navigation'
import { useAuth } from '../../../contexts/AuthProvider'
import { getMobileNavItems } from '../../utils/navAccess'
import { ExpandableTabs } from '../ui/expandable-tabs'

type MobileNavProps = {
  activityUnreadCount?: number
}

const isNavItemActive = (pathname: string, to: string): boolean => {
  if (to === '/admin') return pathname === '/admin' || pathname === '/admin/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

export const MobileNav = ({ activityUnreadCount = 0 }: MobileNavProps) => {
  const { role } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mobileItems = getMobileNavItems(adminNavItems, role)

  const selectedIndex = useMemo(
    () => mobileItems.findIndex((item) => isNavItemActive(pathname, item.to)),
    [mobileItems, pathname]
  )

  const tabs = useMemo(
    () =>
      mobileItems.map((item) => ({
        title: item.label,
        icon: item.icon,
        badge: item.to === '/admin/activity' ? activityUnreadCount : undefined,
      })),
    [activityUnreadCount, mobileItems]
  )

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-stone-100 shadow-pop"
      aria-label="Admin navigation"
    >
      <div className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ExpandableTabs
          tabs={tabs}
          selectedIndex={selectedIndex >= 0 ? selectedIndex : null}
          onChange={(index) => {
            if (index === null) return
            const item = mobileItems[index]
            if (item) navigate(item.to)
          }}
          className="min-w-max border-0 shadow-none bg-transparent p-0 gap-0.5"
          activeColor="text-forest-700"
        />
      </div>
    </nav>
  )
}
