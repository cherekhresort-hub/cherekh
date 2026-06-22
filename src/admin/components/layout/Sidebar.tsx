import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { adminNavItems } from '../../data/navigation'
import { useAuth } from '../../../contexts/AuthProvider'
import { filterNavItemsForRole } from '../../utils/navAccess'
import { cn } from '../../utils/cn'

type SidebarProps = {
  activityUnreadCount?: number
}

export const Sidebar = ({ activityUnreadCount = 0 }: SidebarProps) => {
  const navigate = useNavigate()
  const { signOut, user, roleLabel, role } = useAuth()
  const navItems = filterNavItemsForRole(adminNavItems, role)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-stone-100 h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-stone-100">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl hover:bg-stone-50 transition-colors -mx-2 px-2 py-1"
          aria-label="Cherekh Center homepage"
        >
          <img
            src="/images/CherekhLogoFinal.svg"
            alt="Cherekh Center"
            className="w-10 h-10 object-contain shrink-0"
          />
          <div>
            <p className="font-serif text-forest-700 leading-tight text-base">Cherekh</p>
            <p className="text-xs text-stone-500">Admin Console</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                      isActive
                        ? 'bg-forest-50 text-forest-700'
                        : 'text-stone-600 hover:bg-stone-50 hover:text-forest-700'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="active-nav-indicator"
                          className="absolute inset-y-1.5 left-0 w-1 bg-forest-600 rounded-r-full"
                          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        />
                      )}
                      <Icon className="w-4.5 h-4.5 shrink-0" strokeWidth={1.75} />
                      <span className="font-medium">{item.label}</span>
                      {item.to === '/admin/activity' && activityUnreadCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-medium rounded-full bg-resort-cta text-white">
                          {activityUnreadCount > 99 ? '99+' : activityUnreadCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-stone-100">
        {user?.email && (
          <div className="mb-3 px-1">
            <p className="text-xs text-stone-500 truncate" title={user.email}>
              {user.email}
            </p>
            {roleLabel && (
              <p className="text-[10px] uppercase tracking-wide text-forest-600 font-medium mt-0.5">
                {roleLabel}
              </p>
            )}
          </div>
        )}
        <div className="rounded-2xl bg-cream/80 p-4 mb-3">
          <p className="text-xs font-medium text-forest-700">Site uptime</p>
          <p className="text-xs text-stone-500 mt-0.5">Last sync just now</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-forest-500 animate-pulse" />
            <span className="text-xs text-stone-600">All systems operational</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl text-sm text-stone-600 hover:bg-stone-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
