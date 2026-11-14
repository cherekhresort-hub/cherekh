import { useCallback, useEffect, useState } from 'react'
import { FINANCE_CHANGED_EVENT, loadPayrollData, type PayrollLoadResult } from '../../lib/finance/financeDb'

const EMPTY: PayrollLoadResult = { salaries: [], payrolls: [], available: true }

export const usePayrollData = (enabled = true) => {
  const [state, setState] = useState<PayrollLoadResult>(EMPTY)
  const [loading, setLoading] = useState(enabled)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setState(await loadPayrollData())
    setLoading(false)
    setLoaded(true)
  }, [enabled])

  useEffect(() => {
    void refresh()
    const onChange = () => void refresh()
    window.addEventListener(FINANCE_CHANGED_EVENT, onChange)
    return () => window.removeEventListener(FINANCE_CHANGED_EVENT, onChange)
  }, [refresh])

  return { ...state, loading, loaded, refresh }
}
