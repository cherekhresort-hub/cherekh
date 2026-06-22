import type { FooterIconId } from './footerIcons'
import type { ResortContact } from '../utils/contactFromSettings'

export type FooterLink = {
  name: string
  href: string
  external?: boolean
  icon?: FooterIconId
}

export type FooterSection = {
  title: string
  links: FooterLink[]
}

export type FooterContent = {
  logo: {
    src: string
    alt: string
    title: string
    href: string
  }
  description: string
  sections: FooterSection[]
  copyright: string
  developerCredit: FooterLink
}

export const buildFooterContent = (contact: ResortContact): FooterContent => ({
  logo: {
    src: '/images/CherekhLogoFinal.svg',
    alt: contact.resortName,
    title: contact.resortName,
    href: '/',
  },
  description:
    contact.tagline ||
    'Experience peace in the hills of Thanchi, Bandarban. A premium retreat with nature-inspired stays, warm hospitality, and memorable moments.',
  sections: [
    {
      title: 'Explore',
      links: [
        { name: 'Home', href: '/', icon: 'home' },
        { name: 'Rooms & Suites', href: '/rooms', icon: 'bed' },
        { name: 'Book your stay', href: '/booking', icon: 'calendar' },
        { name: 'Dining', href: '/dining', icon: 'utensils' },
        { name: 'Experiences', href: '/experiences', icon: 'hiking' },
        { name: 'About', href: '/about', icon: 'about' },
        { name: 'Blog', href: '/blog', icon: 'blog' },
        { name: 'FAQ', href: '/faq', icon: 'faq' },
        { name: 'Conference room', href: '/conference-room', icon: 'conference' },
      ],
    },
    {
      title: 'Contact',
      links: [
        { name: contact.phoneDisplay, href: contact.telHref, icon: 'phone' },
        { name: contact.email, href: contact.mailtoHref, icon: 'email' },
        { name: 'WhatsApp', href: contact.whatsappHref, external: true, icon: 'whatsapp' },
        { name: 'Contact form', href: '/contact', icon: 'contact' },
      ],
    },
    {
      title: 'Visit',
      links: [
        {
          name: contact.address,
          href: contact.location.mapsPlaceUrl,
          external: true,
          icon: 'map-pin',
        },
        {
          name: 'Get directions',
          href: contact.location.mapsDirectionsUrl,
          external: true,
          icon: 'directions',
        },
        {
          name: 'View on Google Maps',
          href: contact.location.mapsPlaceUrl,
          external: true,
          icon: 'map',
        },
      ],
    },
    {
      title: 'Legal',
      links: [
        { name: 'Privacy Policy', href: '/privacy-policy', icon: 'privacy' },
        { name: 'Terms & Conditions', href: '/terms', icon: 'terms' },
        { name: 'Cancellation Policy', href: '/cancellation-policy', icon: 'cancellation' },
      ],
    },
  ],
  copyright: `© ${new Date().getFullYear()} ${contact.resortName}. All rights reserved.`,
  developerCredit: {
    name: 'Website by Malthas Chakma',
    href: '/developer',
  },
})
