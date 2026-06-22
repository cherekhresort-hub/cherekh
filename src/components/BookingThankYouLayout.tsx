import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import Button from './Button'

export interface ThankYouDetailRow {
  label: string
  value: ReactNode
  hint?: string
}

export interface ThankYouDetailSection {
  title: string
  rows: ThankYouDetailRow[]
}

interface BookingThankYouLayoutProps {
  printAreaId: string
  title: string
  message: string
  referenceId: string
  sections: ThankYouDetailSection[]
  total?: { label: string; value: string }
  note?: string
  homeTo?: string
  secondaryAction?: { to: string; label: string }
}

const printStyles = (areaId: string) => `
  @media print {
    body { margin: 0; background: #fff; }
    body * { visibility: hidden; }
    #${areaId}, #${areaId} * { visibility: visible; }
    #${areaId} {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white;
      padding: 24px 32px;
    }
    .no-print { display: none !important; }
  }
`

export const BookingThankYouLoading = () => (
  <div className="flex min-h-[60vh] items-center justify-center bg-resort-bg px-4">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-resort-heading" />
  </div>
)

const DetailRow = ({ label, value, hint }: ThankYouDetailRow) => (
  <div className="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-4 gap-y-0.5 border-b border-stone-100 py-3 last:border-0 sm:grid-cols-[9rem_1fr]">
    <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</dt>
    <dd className="text-sm font-medium text-resort-heading">
      {value}
      {hint ? <span className="mt-0.5 block text-xs font-normal text-stone-500">{hint}</span> : null}
    </dd>
  </div>
)

export const BookingThankYouLayout = ({
  printAreaId,
  title,
  message,
  referenceId,
  sections,
  total,
  note,
  homeTo = '/',
  secondaryAction,
}: BookingThankYouLayoutProps) => (
  <>
    <style>{printStyles(printAreaId)}</style>
    <div className="min-h-screen bg-resort-bg px-4 page-content-inset sm:px-6 lg:px-8">
      <div id={printAreaId} className="mx-auto max-w-lg">
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm"
        >
          <header className="border-b border-stone-100 px-6 py-8 text-center sm:px-8">
            <div
              className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-resort-heading/15 bg-resort-heading/5"
              aria-hidden
            >
              <Check className="h-5 w-5 text-resort-heading" strokeWidth={2.25} />
            </div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-resort-heading sm:text-[1.75rem]">
              {title}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-stone-600 sm:text-base">
              {message}
            </p>
            <div className="mt-6 inline-flex flex-col items-center gap-1 rounded-lg border border-stone-100 bg-sand-100/60 px-4 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                Reference number
              </span>
              <span className="font-mono text-sm font-medium tracking-wide text-resort-heading">
                {referenceId}
              </span>
            </div>
          </header>

          <div className="px-6 py-2 sm:px-8">
            {sections.map((section) => (
              <section key={section.title} className="py-4">
                <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  {section.title}
                </h2>
                <dl>
                  {section.rows.map((row, index) => (
                    <DetailRow key={`${section.title}-${row.label}-${index}`} {...row} />
                  ))}
                </dl>
              </section>
            ))}

            {total ? (
              <div className="flex items-baseline justify-between border-t border-stone-200 py-4">
                <span className="text-sm text-stone-600">{total.label}</span>
                <span className="font-serif text-lg font-semibold text-resort-heading">{total.value}</span>
              </div>
            ) : null}
          </div>

          {note ? (
            <p className="border-t border-stone-100 bg-sand-100/80 px-6 py-4 text-[13px] leading-relaxed text-stone-600 sm:px-8">
              {note}
            </p>
          ) : null}

          <footer className="no-print flex flex-col gap-2 border-t border-stone-100 px-6 py-5 sm:flex-row sm:px-8">
            <Button to={homeTo} variant="primary" className="w-full sm:flex-1">
              Back to home
            </Button>
            {secondaryAction ? (
              <Link
                to={secondaryAction.to}
                className="w-full rounded-full border border-stone-200 px-6 py-2.5 text-center text-sm font-medium text-resort-heading transition-colors hover:border-resort-heading/30 hover:bg-sand-100 sm:flex-1"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </footer>
        </motion.article>
      </div>
    </div>
  </>
)
