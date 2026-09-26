import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import RoomCard from '../components/RoomCard'
import Button from '../components/Button'
import { useRoomCardList } from '../hooks/useRoomCardList'
import { useRoomSelection } from '../hooks/useRoomSelection'
import { usePersistSelectedRooms, useBookingHref } from '../hooks/useBookSelectedRooms'
import { roomCatalog, getCatalogRoomById } from '../data/roomCatalog'

type BedFilter = 'all' | 'double' | 'couple'
type AcFilter = 'all' | 'ac' | 'non-ac'
type FloorFilter = 'all' | '1' | '2'
type SortOrder = 'room' | 'price-asc' | 'price-desc'

const BED_OPTIONS: Array<{ value: BedFilter; label: string }> = [
  { value: 'all', label: 'All beds' },
  { value: 'double', label: 'Double bed' },
  { value: 'couple', label: 'Couple bed' },
]

const AC_OPTIONS: Array<{ value: AcFilter; label: string }> = [
  { value: 'all', label: 'Any' },
  { value: 'ac', label: 'AC' },
  { value: 'non-ac', label: 'Non-AC' },
]

const FLOOR_OPTIONS: Array<{ value: FloorFilter; label: string }> = [
  { value: 'all', label: 'Any floor' },
  { value: '1', label: 'Ground' },
  { value: '2', label: 'Second' },
]

const SORT_OPTIONS: Array<{ value: SortOrder; label: string }> = [
  { value: 'room', label: 'Room number' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

const FilterGroup = <T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) => (
  <div role="group" aria-label={label} className="flex flex-col gap-1.5">
    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
      {label}
    </span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 sm:text-sm ${
              active
                ? 'bg-resort-heading text-white'
                : 'border border-stone-300 bg-cream text-stone-700 hover:border-resort-cta hover:text-resort-cta'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  </div>
)

const SectionHeading = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) => (
  <div className="mb-6 sm:mb-8">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">{eyebrow}</p>
    <h2 className="mt-1 font-serif text-xl font-semibold text-resort-heading sm:text-2xl">{title}</h2>
    {description ? <p className="mt-2 max-w-2xl text-sm text-stone-600">{description}</p> : null}
  </div>
)

const Rooms = () => {
  const rooms = useRoomCardList()
  const { toggle, isSelected } = useRoomSelection()
  const persistSelectedRooms = usePersistSelectedRooms()
  const bookingHref = useBookingHref()

  const [bedFilter, setBedFilter] = useState<BedFilter>('all')
  const [acFilter, setAcFilter] = useState<AcFilter>('all')
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('room')

  const filtersActive = bedFilter !== 'all' || acFilter !== 'all' || floorFilter !== 'all'

  const resetFilters = () => {
    setBedFilter('all')
    setAcFilter('all')
    setFloorFilter('all')
  }

  const visibleRooms = useMemo(() => {
    const filtered = rooms.filter((room) => {
      const catalog = getCatalogRoomById(room.id)
      if (!catalog) return false
      if (bedFilter !== 'all' && catalog.bedCategory !== bedFilter) return false
      const hasAc = catalog.amenities.includes('Air Conditioning')
      if (acFilter === 'ac' && !hasAc) return false
      if (acFilter === 'non-ac' && hasAc) return false
      if (floorFilter !== 'all' && String(catalog.floor) !== floorFilter) return false
      return true
    })

    if (sortOrder === 'room') return filtered
    return [...filtered].sort((a, b) =>
      sortOrder === 'price-asc' ? a.price - b.price : b.price - a.price
    )
  }, [rooms, bedFilter, acFilter, floorFilter, sortOrder])

  return (
    <div className="min-h-screen bg-resort-bg">
      <div className="mx-auto max-w-7xl px-4 page-content-inset sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8 max-w-2xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Accommodation
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-resort-heading sm:text-4xl">
            Rooms &amp; suites
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-base">
            Nine comfortable rooms across two floors in the Thanchi hills, each with en-suite bath,
            garden-view balcony, and complimentary breakfast.
          </p>
        </motion.header>

        <section aria-labelledby="rooms-heading">
          <SectionHeading
            eyebrow="All rooms"
            title="Choose your room"
            description={`Browse all ${roomCatalog.length} rooms by number. Select multiple rooms, then book them together.`}
          />

          <div className="mb-6 rounded-2xl border border-stone-200/80 bg-cream px-5 py-4 shadow-sm sm:px-6">
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <FilterGroup label="Bed type" options={BED_OPTIONS} value={bedFilter} onChange={setBedFilter} />
              <FilterGroup label="Air conditioning" options={AC_OPTIONS} value={acFilter} onChange={setAcFilter} />
              <FilterGroup label="Floor" options={FLOOR_OPTIONS} value={floorFilter} onChange={setFloorFilter} />
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                  Sort by
                </span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                  className="rounded-full border border-stone-300 bg-cream px-3 py-1 text-xs font-medium text-stone-700 focus:border-resort-cta focus:outline-none sm:text-sm"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-stone-100 pt-3 text-sm text-stone-600">
              <span aria-live="polite">
                Showing{' '}
                <span className="font-semibold tabular-nums text-resort-heading">{visibleRooms.length}</span>{' '}
                of {rooms.length} rooms
              </span>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-sm font-medium text-resort-heading underline-offset-2 hover:text-resort-cta hover:underline"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>

          {visibleRooms.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
              {visibleRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  {...room}
                  type="room"
                  compact
                  selectable
                  selected={isSelected(room.id)}
                  onSelectToggle={toggle}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-cream px-5 py-10 text-center">
              <p className="font-serif text-lg text-resort-heading">No rooms match these filters</p>
              <p className="mt-1 text-sm text-stone-600">Try a different combination.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 rounded-full border border-stone-300 px-4 py-1.5 text-sm font-medium text-resort-heading hover:border-resort-cta hover:text-resort-cta"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <motion.footer
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="mt-14 overflow-hidden rounded-2xl border border-stone-200/80 bg-cream px-5 py-6 text-center shadow-sm sm:mt-16 sm:px-8"
        >
          <p className="font-serif text-lg text-resort-heading">Ready to book?</p>
          <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600">
            Pick your dates, select a room, and complete your reservation online. Complimentary
            breakfast is included with every stay.
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              to={bookingHref}
              onClick={persistSelectedRooms}
              variant="primary"
              className="w-full sm:w-auto"
            >
              Book now
            </Button>
            <Button to="/contact" variant="outline" className="w-full sm:w-auto">
              Contact us
            </Button>
          </div>
        </motion.footer>
      </div>
    </div>
  )
}

export default Rooms
