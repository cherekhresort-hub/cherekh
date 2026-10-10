import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  Users,
  Sparkles,
  UserCog,
  MessageSquareText,
  BarChart3,
  Settings,
  Shield,
  ScrollText,
  UtensilsCrossed,
  Receipt,
  Landmark,
  type LucideIcon,
} from 'lucide-react'

export interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
  description: string
}

export const adminNavItems: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview' },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck, description: 'Reservations' },
  { to: '/admin/rooms', label: 'Rooms', icon: BedDouble, description: 'Inventory' },
  { to: '/admin/guests', label: 'Guests', icon: Users, description: 'Profiles' },
  { to: '/admin/housekeeping', label: 'Housekeeping', icon: Sparkles, description: 'Cleaning' },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, description: 'Dining prices' },
  { to: '/admin/staff', label: 'Staff', icon: UserCog, description: 'Team roster' },
  { to: '/admin/inquiries', label: 'Inquiries', icon: MessageSquareText, description: 'Contact form' },
  { to: '/admin/expenses', label: 'Expenses', icon: Receipt, description: 'Purchases & payments' },
  { to: '/admin/investments', label: 'Investment', icon: Landmark, description: 'Main fund & capital' },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, description: 'Analytics' },
  { to: '/admin/activity', label: 'Activity', icon: ScrollText, description: 'Audit log' },
  { to: '/admin/team-access', label: 'Team access', icon: Shield, description: 'Login accounts' },
  { to: '/admin/settings', label: 'Settings', icon: Settings, description: 'Preferences' },
]
