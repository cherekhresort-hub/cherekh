import { ROOM_NUMBERS } from '../data/roomCatalog'
import { getBlogPostById } from '../data/blogPosts'

/** Paths that must not be indexed (transactional, auth, or soft 404). */
export const NOINDEX_EXACT_PATHS = new Set([
  '/thank-you',
  '/contact/thank-you',
  '/conference-thank-you',
  '/conference-room/booking',
  '/login',
])

export const isNoIndexPath = (pathname: string): boolean => {
  if (NOINDEX_EXACT_PATHS.has(pathname)) return true
  if (pathname.startsWith('/admin')) return true
  return false
}

const STATIC_INDEXABLE_PATHS = new Set([
  '/',
  '/rooms',
  '/conference-room',
  '/dining',
  '/experiences',
  '/best-resort-thanchi',
  '/family-resort-bandarban',
  '/couple-resort-bandarban',
  '/conference-resort-bandarban',
  '/about',
  '/contact',
  '/faq',
  '/booking',
  '/blog',
  '/developer',
  '/privacy-policy',
  '/terms',
  '/cancellation-policy',
])

export const isKnownPublicPath = (pathname: string): boolean => {
  if (STATIC_INDEXABLE_PATHS.has(pathname)) return true
  if (ROOM_NUMBERS.some((n) => pathname === `/rooms/${n}`)) return true
  const blogMatch = pathname.match(/^\/blog\/([^/]+)$/)
  if (blogMatch && getBlogPostById(blogMatch[1])) return true
  return false
}

export const getRobotsDirective = (pathname: string): string => {
  if (isNoIndexPath(pathname)) return 'noindex, nofollow'
  if (!isKnownPublicPath(pathname)) return 'noindex, nofollow'
  return 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
}
