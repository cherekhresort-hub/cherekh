import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, FileText, Shield, CalendarX } from 'lucide-react'
import type { LegalDocument, LegalSection } from '../data/legalPolicies'
import { LEGAL_DOCUMENT_META } from '../data/legalPolicies'
import { useResortContact } from '../contexts/SiteSettingsProvider'

const policyIcons = {
  'privacy-policy': Shield,
  terms: FileText,
  'cancellation-policy': CalendarX,
} as const

const SectionTable = ({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) => (
  <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200/80">
    <table className="min-w-full text-left text-sm">
      <thead className="bg-resort-heading/5">
        <tr>
          {headers.map((header) => (
            <th
              key={header}
              className="px-4 py-3 font-semibold text-resort-heading whitespace-nowrap"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-t border-stone-200/80">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-4 py-3 text-stone-700 align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const SectionBody = ({ section }: { section: LegalSection }) => (
  <>
    {section.paragraphs?.map((paragraph) => (
      <p key={paragraph.slice(0, 48)} className="mt-4 text-[15px] sm:text-base leading-relaxed text-stone-700">
        {paragraph}
      </p>
    ))}
    {section.bullets ? (
      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] sm:text-base text-stone-700">
        {section.bullets.map((item) => (
          <li key={item.slice(0, 48)} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    ) : null}
    {section.table ? <SectionTable headers={section.table.headers} rows={section.table.rows} /> : null}
    {section.subsections?.map((subsection) => (
      <div key={subsection.title ?? subsection.paragraphs?.[0]?.slice(0, 24)} className="mt-5">
        {subsection.title ? (
          <h3 className="text-lg font-semibold text-resort-heading">{subsection.title}</h3>
        ) : null}
        {subsection.paragraphs?.map((paragraph) => (
          <p key={paragraph.slice(0, 48)} className="mt-3 text-[15px] leading-relaxed text-stone-700">
            {paragraph}
          </p>
        ))}
        {subsection.bullets ? (
          <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] text-stone-700">
            {subsection.bullets.map((item) => (
              <li key={item.slice(0, 48)} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
        {subsection.table ? (
          <SectionTable headers={subsection.table.headers} rows={subsection.table.rows} />
        ) : null}
      </div>
    ))}
  </>
)

type LegalDocumentLayoutProps = {
  document: LegalDocument
}

const LegalDocumentLayout = ({ document }: LegalDocumentLayoutProps) => {
  const resortContact = useResortContact()
  const Icon = policyIcons[document.slug as keyof typeof policyIcons] ?? FileText

  return (
    <div className="bg-resort-bg min-h-screen pb-16">
      <section className="relative h-48 sm:h-64 md:h-72 flex items-end overflow-hidden border-b border-stone-200/60">
        <img
          src={document.coverImage}
          alt={document.coverAlt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/25" />
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/65 mb-2">Legal</p>
            <div className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{document.title}</h1>
                <p className="mt-2 max-w-2xl text-sm sm:text-base text-white/85 leading-relaxed">
                  {document.subtitle}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-white/60">Last updated: {document.lastUpdated}</p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 page-content-inset">
        <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav
              aria-label="Table of contents"
              className="rounded-2xl border border-stone-200/80 bg-cream/70 p-4 shadow-soft"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 mb-3">
                On this page
              </p>
              <ul className="space-y-2 text-sm">
                {document.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="text-stone-600 hover:text-resort-heading transition-colors leading-snug"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-stone-200/80 bg-cream/80 p-6 sm:p-8 lg:p-10 shadow-soft"
          >
            {document.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 mb-10 border-b border-stone-200/70 pb-10 last:mb-0 last:border-0 last:pb-0"
              >
                <h2 className="text-xl sm:text-2xl font-serif text-resort-heading">{section.title}</h2>
                <SectionBody section={section} />
                {section.id.includes('contact') ? (
                  <div className="mt-5 rounded-xl bg-resort-bg border border-stone-200/80 p-4 sm:p-5 text-sm text-stone-700 space-y-1">
                    <p>
                      <strong>Resort:</strong> {resortContact.resortName}
                    </p>
                    <p>
                      <strong>Email:</strong>{' '}
                      <a href={resortContact.mailtoHref} className="text-resort-heading hover:underline">
                        {resortContact.email}
                      </a>
                    </p>
                    <p>
                      <strong>Phone / WhatsApp:</strong>{' '}
                      <a href={resortContact.telHref} className="text-resort-heading hover:underline">
                        {resortContact.phoneDisplay}
                      </a>
                    </p>
                    <p>
                      <strong>Address:</strong> {resortContact.address}
                    </p>
                    <p>
                      <strong>Website:</strong>{' '}
                      <a
                        href={resortContact.website}
                        className="text-resort-heading hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {resortContact.websiteDisplay}
                      </a>
                    </p>
                  </div>
                ) : null}
              </section>
            ))}

            <div className="mt-10 pt-8 border-t border-stone-200/80">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500 mb-3">Related policies</p>
              <div className="flex flex-wrap gap-3">
                {document.relatedSlugs.map((slug) => {
                  const meta = LEGAL_DOCUMENT_META[slug]
                  return (
                    <Link
                      key={slug}
                      to={meta.path}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-resort-bg px-4 py-2 text-sm font-medium text-resort-heading hover:border-resort-heading/30 transition-colors"
                    >
                      {meta.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </div>
  )
}

export default LegalDocumentLayout
