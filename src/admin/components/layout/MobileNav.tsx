import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { confirmDelete } from '../../utils/confirmDelete'
import { adminNavItems } from '../../data/navigation'
import { useAuth } from '../../../contexts/AuthProvider'
import { getMobileNavItems } from '../../utils/navAccess'
import { ExpandableTabs } from '../ui/expandable-tabs'

type MobileNavProps = {
  activityUnreadCount?: number
}

/** Up to this many items fit on one row; more are split across two. */
const SINGLE_ROW_MAX = 6

const isNavItemActive = (pathname: string, to: string): boolean => {
  if (to === '/admin') return pathname === '/admin' || pathname === '/admin/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

export const MobileNav = ({ activityUnreadCount = 0 }: MobileNavProps) => {
  const { role, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const mobileItems = getMobileNavItems(adminNavItems, role)

  const selectedIndex = useMemo(
    () => mobileItems.findIndex((item) => isNavItemActive(pathname, item.to)),
    [mobileItems, pathname]
  )

  const handleSignOut = async () => {
    const ok = await confirmDelete({ title: 'Sign out?', text: 'You will need to log in again.', confirmText: 'Sign out' })
    if (!ok) return
    await signOut()
    navigate('/login', { replace: true })
  }

  const rows = useMemo(() => {
    const tabs = [
      ...mobileItems.map((item) => ({
        title: item.label,
        icon: item.icon,
        badge: item.to === '/admin/activity' ? activityUnreadCount : undefined,
      })),
      { title: 'Sign out', icon: LogOut, badge: undefined },
    ]
    if (tabs.length <= SINGLE_ROW_MAX) return [{ offset: 0, tabs }]
    const split = Math.ceil(tabs.length / 2)
    return [
      { offset: 0, tabs: tabs.slice(0, split) },
      { offset: split, tabs: tabs.slice(split) },
    ]
  }, [activityUnreadCount, mobileItems])

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur border-t border-stone-100 shadow-pop"
      aria-label="Admin navigation"
    >
      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const local = selectedIndex - row.offset
          return (
            <div
              key={row.offset}
              className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <ExpandableTabs
                tabs={row.tabs}
                selectedIndex={local >= 0 && local < row.tabs.length ? local : null}
                onChange={(index) => {
                  if (index === null) return
                  const position = row.offset + index
                  if (position === mobileItems.length) {
                    void handleSignOut()
                    return
                  }
                  const item = mobileItems[position]
                  if (item) navigate(item.to)
                }}
                className="min-w-full w-max justify-between border-0 shadow-none bg-transparent p-0 gap-0.5"
                activeColor="text-forest-700"
              />
            </div>
          )
        })}
      </div>
    </nav>
  )
}
