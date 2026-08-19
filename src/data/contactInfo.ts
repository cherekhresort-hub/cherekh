import { SITE_HOST, siteConfig } from './siteConfig'

export const resortSocial = {
  facebook: 'https://www.facebook.com/cherekhcenter',
  instagram: 'https://www.instagram.com/cherekhcenter',
  youtube: 'https://www.youtube.com/@CherekhCenter',
} as const

export const resortSocialSameAs = [
  resortSocial.facebook,
  resortSocial.instagram,
  resortSocial.youtube,
] as const

const RESORT_LAT = 21.81657
const RESORT_LNG = 92.433641

/** Cherekh Center - Thanchi, Bandarban */
export const resortLocation = {
  latitude: RESORT_LAT,
  longitude: RESORT_LNG,
  addressLines: ['Cherekh Center', 'Thanchi, Bandarban', 'Bangladesh'] as const,
  mapsPlaceUrl: 'https://maps.app.goo.gl/LGUmV2ihgnjv5ijZ6',
  mapsEmbedUrl: `https://www.google.com/maps?q=${RESORT_LAT},${RESORT_LNG}&hl=en&z=16&output=embed`,
  mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${RESORT_LAT},${RESORT_LNG}&travelmode=driving`,
} as const

export const resortContact = {
  phoneE164: '+8801601719735',
  phoneDisplay: '+880 1601 719735',
  phoneSchema: '+880-1601-719735',
  email: 'cherekhcenter@gmail.com',
  telHref: 'tel:+8801601719735',
  mailtoHref: 'mailto:cherekhcenter@gmail.com',
  whatsappHref: 'https://wa.me/8801601719735',
  website: siteConfig.origin,
  websiteDisplay: SITE_HOST,
  bookingUrl: siteConfig.bookingUrl,
  social: resortSocial,
  socialSameAs: resortSocialSameAs,
  location: resortLocation,
} as const
