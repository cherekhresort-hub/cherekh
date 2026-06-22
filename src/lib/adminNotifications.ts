import { getActiveStaffRole } from './permissions'
import { logStaffActivity, type LogStaffActivityInput } from './staffActivityLog'

export type AdminNotificationCategory =
  | 'booking'
  | 'housekeeping'
  | 'guest'
  | 'staff'
  | 'system'

export type NotifyAdminInput = Omit<LogStaffActivityInput, 'category'> & {
  category: AdminNotificationCategory
}

/** Record an important staff action in the central activity log. */
export const notifyAdminOfManagerAction = async (input: NotifyAdminInput): Promise<void> => {
  if (!getActiveStaffRole()) return

  const activityInput: LogStaffActivityInput = {
    ...input,
    category: input.category === 'system' ? 'settings' : input.category,
  }
  await logStaffActivity(activityInput)
}
