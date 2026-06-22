import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion'
import { FAQ_ITEMS, type FaqItem } from '../data/faqCatalog'
import { cn } from '../lib/utils'
import Button from './Button'

type FaqSectionProps = {
  variant?: 'light' | 'dark'
  showHeader?: boolean
  className?: string
  id?: string
  /** When set, only these items are shown (homepage preview). Defaults to all items. */
  items?: FaqItem[]
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
}

const FaqSection = ({
  variant = 'light',
  showHeader = true,
  className,
  id = 'faq',
  items = FAQ_ITEMS,
}: FaqSectionProps) => {
  const isDark = variant === 'dark'
  const isPreview = items.length < FAQ_ITEMS.length

  return (
    <section
      id={id}
      className={cn(
        isDark ? 'text-white' : 'bg-resort-bg border-y border-stone-200/60 text-stone-700',
        className
      )}
    >
      <div className={cn(!isDark && 'py-12 sm:py-14 px-4 sm:px-6 lg:px-8')}>
        <div className={cn(!isDark && 'max-w-3xl mx-auto')}>
          {showHeader && (
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={{ show: { transition: { staggerChildren: 0.09 } } }}
              className={cn(isDark ? 'mb-4' : 'text-center mb-8')}
            >
              <motion.p
                variants={fadeUp}
                className={cn(
                  'text-[11px] uppercase tracking-[0.18em] mb-2',
                  isDark ? 'text-white/60' : 'text-stone-500'
                )}
              >
                Q&amp;A
              </motion.p>
              <motion.h2
                variants={fadeUp}
                className={cn(
                  'font-serif',
                  isDark ? 'text-lg sm:text-xl text-white' : 'text-xl sm:text-2xl text-resort-heading'
                )}
              >
                Frequently asked questions
              </motion.h2>
              {!isDark && (
                <motion.p variants={fadeUp} className="mt-3 text-sm text-stone-600 leading-relaxed">
                  Quick answers about rooms, booking, and your stay in Thanchi.
                </motion.p>
              )}
            </motion.div>
          )}

          <Accordion type="single" collapsible className="w-full">
            {items.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className={cn(isDark ? 'border-white/15' : 'border-stone-200')}
              >
                <AccordionTrigger
                  className={cn(
                    'text-left text-sm sm:text-[15px] leading-snug',
                    isDark
                      ? 'text-white/95 hover:text-white hover:no-underline'
                      : 'text-resort-heading hover:text-resort-cta'
                  )}
                >
                  {item.question}
                </AccordionTrigger>
                <AccordionContent
                  className={cn(
                    'text-sm leading-relaxed',
                    isDark ? 'text-white/75' : 'text-stone-600'
                  )}
                >
                  {item.id === 'how-to-book' ? (
                    <>
                      Book online at{' '}
                      <Link
                        to="/booking"
                        className={cn(
                          'underline underline-offset-2',
                          isDark
                            ? 'text-white hover:text-white/90'
                            : 'hover:text-resort-cta'
                        )}
                      >
                        our booking page
                      </Link>
                      , call us, or send a WhatsApp message. We recommend booking ahead during peak
                      travel seasons.
                    </>
                  ) : (
                    item.answer
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {isPreview && !isDark && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 flex justify-center"
            >
              <Button to="/faq" variant="outline" className="text-sm px-6 py-2.5">
                View all FAQs
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}

export default FaqSection
