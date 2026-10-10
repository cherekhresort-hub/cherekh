import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthProvider'
import {
  FINANCE_CHANGED_EVENT,
  clearFinanceCache,
  getCachedFinanceData,
  loadFinanceData,
} from '../../lib/finance/financeDb'
import { EMPTY_FINANCE_DATA, type FinanceData } from '../../lib/finance/types'

export const useFinanceData = (enabled = true) => {
  const { user } = useAuth()
  const email = user?.email ?? null
  const [data, setData] = useState<FinanceData>(() => getCachedFinanceData() ?? EMPTY_FINANCE_DATA)
  const [available, setAvailable] = useState(true)
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(enabled)
  const lastEmail = useRef<string | null>(email)

  const refresh = useCallback(
    async (force = false) => {
      if (!enabled) return
      setLoading(true)
      const result = await loadFinanceData(force)
      setData(result.data)
      setAvailable(result.available)
      setError(result.error)
      setLoading(false)
    },
    [enabled]
  )

  useEffect(() => {
    if (lastEmail.current !== email) {
      clearFinanceCache()
      lastEmail.current = email
    }
    void refresh()
    const onChange = () => {
      void refresh(true)
    }
    window.addEventListener(FINANCE_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(FINANCE_CHANGED_EVENT, onChange)
  }, [refresh, email])

  return { data, available, error, loading, refresh }
}
