/** Tracking query params added by Facebook, Google, etc. — safe to strip from the address bar. */
const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'gbraid',
  'wbraid',
  'msclkid',
  'mc_eid',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
])

export const normalizePathname = (pathname: string): string => {
  if (pathname === '/' || !pathname.endsWith('/')) return pathname
  return pathname.replace(/\/+$/, '') || '/'
}

export const stripTrackingSearch = (search: string): string => {
  if (!search) return ''
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  let changed = false
  for (const key of TRACKING_PARAMS) {
    if (params.has(key)) {
      params.delete(key)
      changed = true
    }
  }
  if (!changed) return search.startsWith('?') ? search : search ? `?${search}` : ''
  const next = params.toString()
  return next ? `?${next}` : ''
}

export const getCanonicalLocation = (pathname: string, search: string) => {
  const nextPath = normalizePathname(pathname)
  const nextSearch = stripTrackingSearch(search)
  return { pathname: nextPath, search: nextSearch }
}

export const locationNeedsNormalization = (pathname: string, search: string): boolean => {
  const canonical = getCanonicalLocation(pathname, search)
  return canonical.pathname !== pathname || canonical.search !== search
}
