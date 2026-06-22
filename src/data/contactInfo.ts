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

/** Cherekh Center — Thanchi, Bandarban */
export const resortLocation = {
  latitude: 21.81657,
  longitude: 92.433641,
  addressLines: ['Cherekh Center', 'Thanchi, Bandarban', 'Bangladesh'] as const,
  mapsPlaceUrl: 'https://maps.app.goo.gl/LGUmV2ihgnjv5ijZ6',
  mapsEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3690.123456789!2d92.433641!3d21.816570!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDQ5JzAwLjAiTiA5MsKwMjYnMDEuMSJF!5e0!3m2!1sen!2sbd!4v1234567890123!5m2!1sen!2sbd',
  mapsDirectionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=21.816570,92.433641&travelmode=driving',
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
