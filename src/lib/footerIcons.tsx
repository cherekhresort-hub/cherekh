import type { ReactElement } from 'react'
import {
  FaBed,
  FaBook,
  FaCalendarCheck,
  FaEnvelope,
  FaGlobe,
  FaHiking,
  FaHome,
  FaInfoCircle,
  FaLocationArrow,
  FaMap,
  FaMapMarkerAlt,
  FaPhone,
  FaQuestionCircle,
  FaShieldAlt,
  FaFileContract,
  FaCalendarTimes,
  FaUtensils,
  FaUsers,
  FaWhatsapp,
} from 'react-icons/fa'

export const FOOTER_ICON_IDS = [
  'home',
  'bed',
  'calendar',
  'utensils',
  'hiking',
  'about',
  'blog',
  'faq',
  'conference',
  'phone',
  'email',
  'whatsapp',
  'globe',
  'contact',
  'map-pin',
  'directions',
  'map',
  'privacy',
  'terms',
  'cancellation',
] as const

export type FooterIconId = (typeof FOOTER_ICON_IDS)[number]

const iconClass = 'size-3.5 shrink-0 mt-0.5'

export const footerIcons: Record<FooterIconId, ReactElement> = {
  home: <FaHome className={iconClass} aria-hidden />,
  bed: <FaBed className={iconClass} aria-hidden />,
  calendar: <FaCalendarCheck className={iconClass} aria-hidden />,
  utensils: <FaUtensils className={iconClass} aria-hidden />,
  hiking: <FaHiking className={iconClass} aria-hidden />,
  about: <FaInfoCircle className={iconClass} aria-hidden />,
  blog: <FaBook className={iconClass} aria-hidden />,
  faq: <FaQuestionCircle className={iconClass} aria-hidden />,
  conference: <FaUsers className={iconClass} aria-hidden />,
  phone: <FaPhone className={iconClass} aria-hidden />,
  email: <FaEnvelope className={iconClass} aria-hidden />,
  whatsapp: <FaWhatsapp className={iconClass} aria-hidden />,
  globe: <FaGlobe className={iconClass} aria-hidden />,
  contact: <FaEnvelope className={iconClass} aria-hidden />,
  'map-pin': <FaMapMarkerAlt className={iconClass} aria-hidden />,
  directions: <FaLocationArrow className={iconClass} aria-hidden />,
  map: <FaMap className={iconClass} aria-hidden />,
  privacy: <FaShieldAlt className={iconClass} aria-hidden />,
  terms: <FaFileContract className={iconClass} aria-hidden />,
  cancellation: <FaCalendarTimes className={iconClass} aria-hidden />,
}

export const getFooterIcon = (id: FooterIconId): ReactElement => footerIcons[id]
