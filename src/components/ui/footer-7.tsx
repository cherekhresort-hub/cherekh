import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { FooterContent, FooterLink } from '../../lib/footerContent'
import { getFooterIcon } from '../../lib/footerIcons'

export type Footer7SocialLink = {
  icon: ReactElement
  href: string
  label: string
  external?: boolean
}

export type Footer7Props = FooterContent & {
  socialLinks: Footer7SocialLink[]
  actions?: ReactNode
  className?: string
}

const isExternalHref = (href: string, external?: boolean): boolean =>
  Boolean(
    external ||
      href.startsWith('http') ||
      href.startsWith('tel:') ||
      href.startsWith('mailto:')
  )

const FooterNavLink = ({ link }: { link: FooterLink }) => {
  const className =
    'inline-flex items-start gap-2 font-medium text-white/75 hover:text-white transition-colors break-words'
  const icon = link.icon ? getFooterIcon(link.icon) : null
  const content = (
    <>
      {icon}
      <span>{link.name}</span>
    </>
  )

  if (isExternalHref(link.href, link.external)) {
    return (
      <a
        href={link.href}
        className={className}
        target={link.href.startsWith('http') ? '_blank' : undefined}
        rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    )
  }

  return (
    <Link to={link.href} className={className}>
      {content}
    </Link>
  )
}

export const Footer7 = ({
  logo,
  sections,
  description,
  socialLinks,
  copyright,
  developerCredit,
  actions,
  className,
}: Footer7Props) => {
  return (
    <footer className={cn('bg-resort-heading text-white', className)}>
      <section className="py-12 sm:py-16 md:py-20 min-h-[28rem]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex w-full flex-col justify-between gap-10 lg:flex-row lg:items-start lg:text-left">
            <div className="flex w-full flex-col justify-between gap-6 lg:max-w-sm lg:items-start">
              <Link to={logo.href} className="inline-flex lg:justify-start h-16 sm:h-20 w-40 shrink-0">
                <img
                  src={logo.src}
                  alt={logo.alt}
                  title={logo.title}
                  width={160}
                  height={80}
                  className="h-full w-full object-contain object-left brightness-0 invert"
                />
              </Link>
              <p className="text-sm leading-relaxed text-white/75">{description}</p>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
              <ul className="flex items-center gap-5 text-white/75">
                {socialLinks.map((social) => (
                  <li key={social.label} className="hover:text-white transition-colors">
                    <a
                      href={social.href}
                      aria-label={social.label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex"
                    >
                      {social.icon}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid w-full grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12 xl:gap-16">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-4 font-serif text-base text-white">{section.title}</h3>
                  <ul className="space-y-3 text-sm">
                    {section.links.map((link) => (
                      <li key={`${section.title}-${link.name}`}>
                        <FooterNavLink link={link} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-2 border-t border-white/20 pt-8 text-center text-xs font-medium text-white/70 md:flex-row md:items-center md:justify-between md:text-left">
            <p>{copyright}</p>
            <p className="text-white/60">
              <FooterNavLink link={developerCredit} />
            </p>
          </div>
        </div>
      </section>
    </footer>
  )
}
