import type { StaffRole } from './roles'
import { roleCanDelete, roleCanEditPricing, roleCanManageTeam, roleIsAdmin } from './roles'

let activeRole: StaffRole | null = null

export const setActiveStaffRole = (role: StaffRole | null): void => {
  activeRole = role
}

export const getActiveStaffRole = (): StaffRole | null => activeRole

export const canDeleteRecords = (): boolean => roleCanDelete(activeRole)

export const canEditPricing = (): boolean => roleCanEditPricing(activeRole)

export const isAdminUser = (): boolean => roleIsAdmin(activeRole)

export const canManageTeam = (): boolean => roleCanManageTeam(activeRole)

export const isManagerUser = (): boolean => activeRole === 'manager'

export const isBookingOfficerUser = (): boolean => activeRole === 'booking_officer'
