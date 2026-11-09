import { useEffect, useState } from 'react'
import { fetchStaffDirectory } from '../../lib/staffNames'

/** Team display names keyed by lower-case email. */
export const useStaffDirectory = (): Map<string, string> => {
  const [names, setNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    void fetchStaffDirectory().then((directory) => {
      if (!cancelled) setNames(directory)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return names
}

/** Team name for an email, else the part before @. */
export const staffNameForEmail = (names: Map<string, string>, email: string | null | undefined): string | null => {
  const clean = email?.trim()
  if (!clean) return null
  return names.get(clean.toLowerCase()) ?? clean.split('@')[0]
}
