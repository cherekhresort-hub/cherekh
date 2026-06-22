import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { menuCategories, formatMenuPrice } from '../data/menuCatalog'
import { restaurantImages } from '../data/roomCatalog'

const isDefined = <T,>(value: T | undefined | null): value is T => value !== undefined && value !== null

const itemReveal = {
  hidden: { opacity: 0, y: 8 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      delay: Math.min(index * 0.03, 0.36),
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

const Dining = () => {
  const [selectedImage, setSelectedImage] = useState(0)
  const menuOrder = ['main-courses', 'snacks', 'beverages', 'breakfast'] as const
  const orderedCategories = [
    ...menuOrder
      .map((id) => menuCategories.find((category) => category.id === id))
      .filter(isDefined),
    ...menuCategories.filter((category) => !menuOrder.includes(category.id as never)),
  ]

  return (
    <div className="min-h-screen bg-resort-bg">
      <div className="mx-auto max-w-7xl px-4 page-content-inset sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-10 max-w-2xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Dining
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-resort-heading sm:text-4xl">
            Cherekh Restaurant
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
            Authentic Bangla main courses, snacks, breakfast, and fresh juices, served on site in
            Thanchi. Complimentary breakfast is included with every room stay.
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mx-auto mb-8 max-w-3xl overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm"
        >
          <div className="relative h-[13.2rem] w-full sm:h-[15.6rem] md:h-[16.8rem]">
            <img
              src={restaurantImages[selectedImage]}
              alt={`Cherekh Restaurant, photo ${selectedImage + 1}`}
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
            />
          </div>
          {restaurantImages.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-stone-100 p-3">
              {restaurantImages.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  aria-label={`View photo ${index + 1} of ${restaurantImages.length}`}
                  aria-pressed={selectedImage === index}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border transition-colors ${
                    selectedImage === index
                      ? 'border-resort-heading ring-1 ring-resort-heading/30'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
        </motion.div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-600">
              All prices in Bangladeshi Taka (৳). Items marked{' '}
              <span className="font-medium text-resort-heading">Favourite</span> are house specials.
            </p>
            <Link
              to="/booking"
              className="shrink-0 text-sm font-medium text-resort-heading hover:text-resort-cta transition-colors"
            >
              Book a room with breakfast →
            </Link>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 xl:gap-6">
          {orderedCategories.map((category, categoryIndex) => (
            <motion.section
              key={category.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6 }}
              viewport={{ once: true }}
              transition={{
                opacity: { duration: 0.35, delay: categoryIndex * 0.03 },
                y: { type: 'spring', stiffness: 320, damping: 26 },
              }}
              aria-labelledby={`menu-${category.id}`}
              className="group/section min-w-0"
            >
              <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm transition-all duration-300 group-hover/section:border-resort-heading/20 group-hover/section:shadow-lg group-hover/section:shadow-resort-heading/5">
                <div className="border-b border-stone-100 px-4 py-4 transition-colors duration-300 group-hover/section:border-resort-heading/10 group-hover/section:bg-sand-100/50 lg:px-4">
                  <h2
                    id={`menu-${category.id}`}
                    className="font-serif text-base font-semibold text-resort-heading transition-colors duration-300 group-hover/section:text-resort-cta lg:text-lg"
                  >
                    {category.titleEn}
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500 sm:text-sm">{category.titleBn}</p>
                  <p className="mt-1 text-[11px] text-stone-400">{category.subtitle}</p>
                </div>

                <ul className="divide-y divide-stone-100 px-4 lg:px-4">
                  {category.items.map((item, itemIndex) => (
                    <motion.li
                      key={item.number}
                      custom={itemIndex}
                      variants={itemReveal}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true, margin: '-24px' }}
                      whileHover={{ x: 2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                      className="group flex items-start justify-between gap-2 py-3 transition-colors hover:bg-sand-100/70 lg:gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-resort-heading sm:text-sm">
                            {item.nameBn}
                          </span>
                          {item.isHouseFavourite ? (
                            <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-stone-500">
                              Favourite
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-stone-500 sm:text-xs">{item.nameEn}</p>
                      </div>
                      <span className="shrink-0 text-xs font-medium tabular-nums text-resort-heading transition-colors group-hover:text-resort-cta sm:text-sm">
                        {formatMenuPrice(item.price)}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.section>
          ))}
        </div>

        <motion.footer
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mt-10 overflow-hidden rounded-2xl border border-stone-200/80 bg-cream shadow-sm px-5 py-6 text-center sm:px-8"
        >
          <p className="font-serif text-lg text-resort-heading">Thank you for dining with us</p>
          <p className="mt-1 text-sm text-stone-500">আমাদের সাথে dining করার জন্য ধন্যবাদ</p>
        </motion.footer>
      </div>
    </div>
  )
}

export default Dining
