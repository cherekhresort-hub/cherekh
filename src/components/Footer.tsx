import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { FaCalendarCheck, FaFacebook, FaInstagram, FaWhatsapp, FaYoutube } from 'react-icons/fa'
import { useResortContact } from '../contexts/SiteSettingsProvider'
import { buildFooterContent } from '../lib/footerContent'
import { Footer7 } from './ui/footer-7'

const Footer = () => {
  const resortContact = useResortContact()

  const footerProps = useMemo(() => {
    const content = buildFooterContent(resortContact)
    return {
      ...content,
      socialLinks: [
        {
          icon: <FaFacebook className="size-5" aria-hidden />,
          href: resortContact.social.facebook,
          label: 'Facebook',
          external: true,
        },
        {
          icon: <FaInstagram className="size-5" aria-hidden />,
          href: resortContact.social.instagram,
          label: 'Instagram',
          external: true,
        },
        {
          icon: <FaYoutube className="size-5" aria-hidden />,
          href: resortContact.social.youtube,
          label: 'YouTube',
          external: true,
        },
        {
          icon: <FaWhatsapp className="size-5" aria-hidden />,
          href: resortContact.whatsappHref,
          label: 'WhatsApp',
          external: true,
        },
      ],
      actions: (
        <>
          <Link
            to="/booking"
            className="inline-flex items-center gap-2 rounded-full bg-cream text-resort-heading px-4 py-2 text-sm font-medium hover:bg-cream/90 transition-colors"
          >
            <FaCalendarCheck className="size-4 shrink-0" aria-hidden />
            Book now
          </Link>
          <a
            href={resortContact.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 text-white px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <FaWhatsapp className="size-4 shrink-0" aria-hidden />
            WhatsApp us
          </a>
        </>
      ),
    }
  }, [resortContact])

  return <Footer7 {...footerProps} />
}

export default Footer
