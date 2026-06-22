import { useCallback, useEffect, useState } from 'react'
import { STAFF_CHANGED_EVENT, loadStaffMembers } from '../../lib/staffDb'
import { getStaff } from '../data/staff'
import type { StaffMember } from '../types'

export const useStaffData = () => {
  const [staff, setStaff] = useState<StaffMember[]>(() => getStaff())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const loaded = await loadStaffMembers()
    setStaff(loaded)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const onChange = () => {
      void refresh()
    }
    window.addEventListener(STAFF_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(STAFF_CHANGED_EVENT, onChange)
  }, [refresh])

  return { staff, loading, refresh }
}
