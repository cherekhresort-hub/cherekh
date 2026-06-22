import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteContactInquiry,
  listContactInquiries,
  setContactInquiryStatus,
  type ContactInquiry,
  type ContactInquiryStatus,
} from '../../lib/contactInquiries'
import { logStaffActivity } from '../../lib/staffActivityLog'

export const useContactInquiries = () => {
  const [inquiries, setInquiries] = useState<ContactInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await listContactInquiries()
      setInquiries(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inquiries.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const updateStatus = useCallback(
    async (id: string, status: ContactInquiryStatus) => {
      const item = inquiries.find((q) => q.id === id)
      await setContactInquiryStatus(id, status)
      void logStaffActivity({
        category: 'inquiry',
        action: 'inquiry.status',
        title: 'Inquiry status updated',
        message: `${item?.name ?? 'Guest'} → ${status}`,
        entityId: id,
      })
      setInquiries((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q)))
    },
    [inquiries]
  )

  const remove = useCallback(
    async (id: string) => {
      const item = inquiries.find((q) => q.id === id)
      await deleteContactInquiry(id)
      void logStaffActivity({
        category: 'inquiry',
        action: 'inquiry.deleted',
        title: 'Inquiry deleted',
        message: item ? `${item.name} (${item.email})` : 'Inquiry removed',
        entityId: id,
      })
      setInquiries((prev) => prev.filter((q) => q.id !== id))
    },
    [inquiries]
  )

  const counts = useMemo(() => {
    const base = { all: inquiries.length, new: 0, contacted: 0, closed: 0 }
    inquiries.forEach((q) => {
      base[q.status] += 1
    })
    return base
  }, [inquiries])

  return { inquiries, loading, error, counts, refresh, updateStatus, remove }
}
