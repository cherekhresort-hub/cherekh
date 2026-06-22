import type { ResortSettings } from '../admin/types'
import { getCachedSiteSettings } from '../lib/siteSettingsDb'
import { resortContact as staticResortContact, resortLocation, resortSocial } from '../data/contactInfo'

export type ResortContact = {
  phoneE164: string
  phoneDisplay: string
  phoneSchema: string
  email: string
  telHref: string
  mailtoHref: string
  whatsappHref: string
  website: string
  websiteDisplay: string
  bookingUrl: string
  social: typeof resortSocial
  socialSameAs: readonly string[]
  location: typeof resortLocation
  resortName: string
  tagline: string
  address: string
  checkInTime: string
  checkOutTime: string
}

const normalizePhoneE164 = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return staticResortContact.phoneE164
  if (digits.startsWith('880')) return `+${digits}`
  if (digits.startsWith('0')) return `+880${digits.slice(1)}`
  return `+${digits}`
}

const formatPhoneSchema = (phoneE164: string): string =>
  phoneE164.replace(/^(\+880)(\d+)/, '$1-$2').replace(/(\d{4})(\d+)/, '$1-$2')

/** 24h "14:00" → "2:00 PM" */
export const formatTime12h = (time24: string): string => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim())
  if (!match) return time24
  const hours = Number(match[1])
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${minutes} ${period}`
}

export const buildResortContact = (settings?: ResortSettings | null): ResortContact => {
  const cached = settings ?? getCachedSiteSettings()
  const phoneDisplay = cached?.phone || staticResortContact.phoneDisplay
  const phoneE164 = normalizePhoneE164(phoneDisplay)
  const email = cached?.email || staticResortContact.email
  const website = cached?.website
    ? cached.website.startsWith('http')
      ? cached.website
      : `https://${cached.website}`
    : staticResortContact.website
  const websiteDisplay = cached?.website?.replace(/^https?:\/\//, '') || staticResortContact.websiteDisplay

  return {
    phoneE164,
    phoneDisplay,
    phoneSchema: formatPhoneSchema(phoneE164),
    email,
    telHref: `tel:${phoneE164}`,
    mailtoHref: `mailto:${email}`,
    whatsappHref: `https://wa.me/${phoneE164.replace(/\D/g, '')}`,
    website,
    websiteDisplay,
    bookingUrl: staticResortContact.bookingUrl,
    social: resortSocial,
    socialSameAs: staticResortContact.socialSameAs,
    location: resortLocation,
    resortName: cached?.resortName || 'Cherekh Center',
    tagline: cached?.tagline || '',
    address: cached?.address || 'Cherekh Center, Thanchi, Bandarban, Bangladesh.',
    checkInTime: cached?.checkInTime || '14:00',
    checkOutTime: cached?.checkOutTime || '11:00',
  }
}

/** Non-React callers (emails, PDFs) — uses cached Supabase settings when loaded. */
export const getResortContact = (): ResortContact => buildResortContact()
