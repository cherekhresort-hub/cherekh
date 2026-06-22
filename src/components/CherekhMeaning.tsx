import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cherekhMeaningBn, cherekhMeaningEn } from '../data/aboutCherekhMeaning'

type MeaningLang = 'bn' | 'en'

interface CherekhMeaningProps {
  /** Center section heading; content stays left-aligned for readability */
  centered?: boolean
  showReadMore?: boolean
  /** Hide label + title when the parent section already introduces the meaning */
  hideTitle?: boolean
  className?: string
}

const CherekhMeaning = ({
  centered = false,
  showReadMore = false,
  hideTitle = false,
  className = '',
}: CherekhMeaningProps) => {
  const [lang, setLang] = useState<MeaningLang>('bn')
  const meaning = lang === 'bn' ? cherekhMeaningBn : cherekhMeaningEn

  return (
    <div className={className}>
      <div
        className={`flex flex-col sm:flex-row sm:items-end gap-4 mb-5 ${
          centered ? 'sm:justify-center text-center sm:text-left' : 'sm:justify-between'
        } ${hideTitle ? 'sm:justify-end' : ''}`}
      >
        {!hideTitle && (
          <div className={centered ? 'sm:flex-1' : undefined}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">Heritage</p>
            <h3 className="text-lg sm:text-xl font-serif text-resort-heading">
              {meaning.title}
            </h3>
          </div>
        )}
        <div
          className={`inline-flex rounded-lg border border-stone-200 bg-cream p-0.5 ${
            centered ? 'self-center sm:self-auto sm:shrink-0' : 'self-start'
          }`}
          role="tablist"
          aria-label="Language"
        >
          {(['bn', 'en'] as const).map((code) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={lang === code}
              onClick={() => setLang(code)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors ${
                lang === code
                  ? 'bg-resort-heading text-white'
                  : 'text-stone-600 hover:text-resort-heading'
              }`}
            >
              {code === 'bn' ? 'বাংলা' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <article
        lang={lang === 'bn' ? 'bn' : 'en'}
        className="bg-cream rounded-xl border border-stone-200/80 p-5 sm:p-6 text-left"
      >
        <div className="space-y-3.5 text-stone-600 text-sm sm:text-[15px] leading-relaxed">
          {meaning.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
        {showReadMore && (
          <Link
            to="/about"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
          >
            More about us
            <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        )}
      </article>
    </div>
  )
}

export default CherekhMeaning
