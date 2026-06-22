import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

type ReviewItem = {
  name: string
  place: string
  focus: 'Interior' | 'Experience' | 'Pricing'
  role: string
  review: string
}

const reviews: ReviewItem[] = [
  {
    name: 'আলমগীর হোসেন',
    place: 'চট্টগ্রাম',
    focus: 'Interior',
    role: 'ইন্টেরিয়র ডিজাইনার',
    review:
      'রুমের ইন্টেরিয়র খুবই সুন্দর এবং পরিষ্কার। কাঠের টোন, লাইটিং, আর ব্যালকনি ভিউ, সব মিলিয়ে একদম প্রিমিয়াম ফিল দিয়েছে।',
  },
  {
    name: 'মৌসুমী আক্তার',
    place: 'ঢাকা',
    focus: 'Experience',
    role: 'ভ্রমণ ব্লগার',
    review:
      'থানচি ঘুরতে এসে চেরেখে থাকা দারুণ অভিজ্ঞতা ছিল। রিসেপশন থেকে ট্রেকিং আর লোকাল ভিজিট প্ল্যান করে দিয়েছে, পুরো ট্রিপটা অনেক সহজ হয়েছে।',
  },
  {
    name: 'রফিকুল ইসলাম',
    place: 'কুমিল্লা',
    focus: 'Pricing',
    role: 'ছোট ব্যবসায়ী',
    review:
      'এই লোকেশন আর সার্ভিস অনুযায়ী রুমের দাম যথেষ্ট যুক্তিসঙ্গত। কমপ্লিমেন্টারি ব্রেকফাস্ট আর পরিষ্কার-পরিচ্ছন্নতা দেখে ভ্যালু ফর মানি লেগেছে।',
  },
  {
    name: 'সাবরিনা নাসরিন',
    place: 'ফেনী',
    focus: 'Interior',
    role: 'স্কুল শিক্ষক',
    review: 'লবির সাজসজ্জা আর রুমের কালার টোন খুব শান্ত লাগে। ছবি তোলার জন্যও জায়গাগুলো খুব সুন্দর।',
  },
  {
    name: 'ইমরান কবির',
    place: 'রাজশাহী',
    focus: 'Experience',
    role: 'আইটি পেশাজীবী',
    review:
      'স্টাফরা খুব আন্তরিক ছিল। নদীর পাশের বিকেলের সময়টা আর রাতের পরিবেশ, পুরো ভ্রমণটা অনেক রিল্যাক্সিং হয়েছে।',
  },
  {
    name: 'নাহিদা আক্তার',
    place: 'খুলনা',
    focus: 'Pricing',
    role: 'ব্যাংকার',
    review: 'পরিবার নিয়ে থাকলেও বাজেটের মধ্যে ছিল। যে সার্ভিস পেয়েছি, সেই হিসেবে খরচটা একদম ন্যায্য।',
  },
  {
    name: 'উথোয়াই মারমা',
    place: 'বান্দরবান',
    focus: 'Experience',
    role: 'লোকাল গাইড',
    review: 'লোকাল এক্সপেরিয়েন্সের জন্য এই জায়গাটা ভালো। গাইডিং সাপোর্ট থাকায় ট্রিপ প্ল্যান করা সহজ হয়েছে।',
  },
  {
    name: 'অঙ্কিতা দাশ',
    place: 'সিলেট',
    focus: 'Interior',
    role: 'স্থপতি',
    review:
      'বেডিং, বাথরুম ফিনিশিং আর ব্যালকনির ফিল, সবকিছু খুব পরিপাটি। ইন্টেরিয়রে অনেক যত্ন বোঝা যায়।',
  },
  {
    name: 'তানভীর হাসান',
    place: 'ময়মনসিংহ',
    focus: 'Pricing',
    role: 'বিশ্ববিদ্যালয় শিক্ষার্থী',
    review:
      'অনলাইন বুকিংয়ের পরে কোনো হিডেন চার্জ পাইনি। আগে থেকে যা দেখিয়েছিল, বিলও ঠিক সেভাবেই হয়েছে।',
  },
  {
    name: 'জান্নাতুল ফেরদৌস',
    place: 'নোয়াখালী',
    focus: 'Experience',
    role: 'কনটেন্ট ক্রিয়েটর',
    review: 'রেস্টুরেন্ট, রুম সার্ভিস আর রিসেপশন, সব মিলিয়ে গেস্ট হ্যান্ডলিং খুব সুন্দর লেগেছে।',
  },
  {
    name: 'মেহেদী সাকিব',
    place: 'চাঁদপুর',
    focus: 'Interior',
    role: 'ফটোগ্রাফার',
    review:
      'রুমে ঢুকেই একটা উষ্ণ ও আরামদায়ক অনুভূতি হয়। ফার্নিচার প্লেসমেন্ট আর লাইটিং ব্যালান্সড ছিল।',
  },
  {
    name: 'প্রিয়া চাকমা',
    place: 'রাঙামাটি',
    focus: 'Experience',
    role: 'উদ্যোক্তা',
    review:
      'প্রকৃতির খুব কাছাকাছি থেকে থাকার অনুভূতি পাওয়া যায়। সকালে পাহাড়ি আলো আর রাতের নীরবতা দারুণ।',
  },
  {
    name: 'মোস্তাফিজুর রহমান',
    place: 'বগুড়া',
    focus: 'Pricing',
    role: 'সরকারি চাকরিজীবী',
    review: 'বন্ধুদের সাথে গ্রুপ ট্রিপে থেকেছি। রুম শেয়ার করলে খরচ বেশ সাশ্রয়ী হয়, ভ্যালু ভালো পেয়েছি।',
  },
  {
    name: 'সুমি আক্তার',
    place: 'বরিশাল',
    focus: 'Interior',
    role: 'ফ্যাশন ডিজাইনার',
    review: 'কার্টেন, কাঠের ফিনিশ আর ছোট ছোট ডেকোর, সবকিছু মিলিয়ে ইন্টেরিয়রটা খুব এলিগ্যান্ট।',
  },
  {
    name: 'আব্দুল্লাহ আল মাহমুদ',
    place: 'পাবনা',
    focus: 'Experience',
    role: 'হাসপাতাল প্রশাসক',
    review:
      'চেক-ইন থেকে চেক-আউট পর্যন্ত প্রোসেস মসৃণ ছিল। স্টাফরা সবসময় হাসিমুখে সাহায্য করেছে।',
  },
  {
    name: 'তৃষা ঘোষ',
    place: 'কক্সবাজার',
    focus: 'Pricing',
    role: 'রিসার্চ অ্যাসিস্ট্যান্ট',
    review:
      'লোকেশন, ভিউ আর সার্ভিস অনুযায়ী প্রাইসিং একদম ব্যালান্সড। উইকেন্ড ট্রিপের জন্য ভালো অপশন।',
  },
  {
    name: 'রিদওয়ান ইসলাম',
    place: 'নরসিংদী',
    focus: 'Interior',
    role: 'বিল্ডিং ইঞ্জিনিয়ার',
    review:
      'কমন এরিয়া আর করিডোরগুলোও পরিষ্কার-পরিচ্ছন্ন ছিল। শুধু রুম না, পুরো প্রোপার্টির ইন্টেরিয়রই সুন্দর।',
  },
  {
    name: 'মিম আক্তার',
    place: 'গাজীপুর',
    focus: 'Experience',
    role: 'এইচআর এক্সিকিউটিভ',
    review:
      'দুই রাতের স্টেতে একবারও বিরক্ত হইনি। পরিবেশ শান্ত, স্টাফ রেসপন্সিভ, খাবারও সময়মতো পেয়েছি।',
  },
  {
    name: 'শাকিল আহমেদ',
    place: 'থানচি',
    focus: 'Pricing',
    role: 'ট্রাভেল প্ল্যানার',
    review: 'লোকাল ট্রাভেলার হিসেবেও মনে হয়েছে সার্ভিসের তুলনায় রেটটা ফেয়ার এবং কনসিস্টেন্ট।',
  },
  {
    name: 'জুবাইদা রহমান',
    place: 'টাঙ্গাইল',
    focus: 'Interior',
    role: 'গ্রাফিক ডিজাইনার',
    review:
      'রুমের কালার কম্বিনেশন আর ন্যাচারাল ভিউয়ের সাথে ইন্টেরিয়রের ম্যাচিংটা খুবই সুন্দরভাবে করা।',
  },
]

const focusBadge: Record<ReviewItem['focus'], string> = {
  Interior: 'bg-violet-100 text-violet-800',
  Experience: 'bg-teal-100 text-teal-800',
  Pricing: 'bg-amber-100 text-amber-900',
}

const focusGradient: Record<ReviewItem['focus'], string> = {
  Interior: 'from-violet-500 via-orange-400 to-fuchsia-500',
  Experience: 'from-teal-500 via-cyan-400 to-sky-500',
  Pricing: 'from-amber-500 via-orange-400 to-rose-500',
}

const chunk = <T,>(items: T[], size: number): T[][] => {
  const pages: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size))
  }
  return pages
}

const useItemsPerPage = () => {
  const [perPage, setPerPage] = useState(2)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setPerPage(mq.matches ? 5 : 2)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return perPage
}

const ReviewsSection = () => {
  const perPage = useItemsPerPage()
  const pages = useMemo(() => chunk(reviews, perPage), [perPage])
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage((current) => Math.min(current, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  const goPrev = useCallback(() => {
    setPage((current) => (current <= 0 ? pages.length - 1 : current - 1))
  }, [pages.length])

  const goNext = useCallback(() => {
    setPage((current) => (current >= pages.length - 1 ? 0 : current + 1))
  }, [pages.length])

  const currentReviews = pages[page] ?? []

  return (
    <section className="py-12 sm:py-14 px-4 sm:px-6 lg:px-8 bg-resort-bg border-y border-stone-200/60">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.18em] text-stone-500 mb-2">
              Guest reviews
            </p>
            <h2 className="text-xl sm:text-2xl font-serif text-resort-heading">
              What guests say about their stay
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              Real feedback on interior comfort, overall experience, and pricing value at Cherekh
              Center.
            </p>
        </div>

        <div className="group relative mt-8 px-10 sm:px-12">
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-cream text-resort-heading shadow-sm transition-all hover:bg-resort-bg sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Previous reviews"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-cream text-resort-heading shadow-sm transition-all hover:bg-resort-bg sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Next reviews"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${perPage}-${page}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4"
            >
              {currentReviews.map((item) => (
                <motion.article
                  key={item.name}
                  whileHover={{ y: -4, boxShadow: '0 14px 30px -12px rgba(15,39,22,0.18)' }}
                  className="flex h-full flex-col rounded-2xl border border-stone-200/80 bg-sand-50/80 p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${focusBadge[item.focus]}`}
                    >
                      {item.focus}
                    </span>
                    <span
                      className="inline-flex items-center gap-0.5 text-amber-500"
                      aria-label="5 star review"
                    >
                      {Array.from({ length: 5 }).map((_, star) => (
                        <Star key={star} className="h-3 w-3 fill-current" />
                      ))}
                    </span>
                  </div>

                  <p className="mt-3 flex-1 border-b border-stone-200/80 pb-3 text-xs sm:text-sm leading-relaxed text-stone-700">
                    “{item.review}”
                  </p>

                  <footer className="mt-3">
                    <p className="text-sm font-medium text-resort-heading">{item.name}</p>
                    <p
                      className={`mt-0.5 bg-gradient-to-r ${focusGradient[item.focus]} bg-clip-text text-[11px] sm:text-xs font-medium text-transparent`}
                    >
                      {item.role}
                    </p>
                    <p className="text-[11px] text-stone-500">{item.place}</p>
                  </footer>
                </motion.article>
              ))}
            </motion.div>
          </AnimatePresence>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-stone-500">
          {page + 1} / {pages.length}
        </p>
      </div>
    </section>
  )
}

export default ReviewsSection
