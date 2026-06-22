export const SITE_HOST = 'cherekhcenter.com' as const
export const SITE_ORIGIN = `https://${SITE_HOST}` as const
export const SITE_WWW_ORIGIN = `https://www.${SITE_HOST}` as const

/** Build an absolute site URL from a path (defaults to homepage). */
export const siteUrl = (path = '/'): string => {
  if (path === '/' || path === '') return `${SITE_ORIGIN}/`
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${SITE_ORIGIN}${normalized}`
}

/** Build an absolute URL for a public asset path. */
export const siteAssetUrl = (assetPath: string): string =>
  siteUrl(assetPath.startsWith('/') ? assetPath : `/${assetPath}`)

export const siteConfig = {
  host: SITE_HOST,
  origin: SITE_ORIGIN,
  wwwOrigin: SITE_WWW_ORIGIN,
  bookingUrl: siteUrl('/booking'),
  contactUrl: siteUrl('/contact'),
} as const
