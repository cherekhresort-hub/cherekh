import { Link } from 'react-router-dom'
import Button from '../components/Button'

const BestResortThanchi = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 page-content-inset">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Thanchi stay guide</p>
          <h1 className="text-3xl sm:text-4xl font-serif text-resort-heading">
            Best Accommodation in Thanchi for Nature, Comfort, and Easy Booking
          </h1>
          <p className="text-stone-600 leading-relaxed">
            Cherekh Center is designed for travelers looking for a peaceful Bandarban hill retreat
            with clean rooms, practical comfort, and warm local hospitality.
          </p>
        </header>

        <article className="space-y-5 text-stone-700 leading-relaxed">
          <p>
            If you are searching for the best accommodation in Thanchi, your decision usually comes down to
            room comfort, location, food quality, and how easy it is to plan your stay. Cherekh Center
            combines these in one place: a calm natural setting, transparent room options, and
            direct online booking.
          </p>
          <p>
            Guests can choose from couple and double rooms with AC and non-AC categories, conference
            facilities, and access to trekking and river activities. For families and small groups,
            the room layout and guest policies are clear upfront, so planning is easier.
          </p>
          <p>
            Before booking, compare room types on the{' '}
            <Link to="/rooms" className="text-resort-heading underline hover:text-resort-cta">
              rooms page
            </Link>
            , then reserve directly using the{' '}
            <Link to="/booking" className="text-resort-heading underline hover:text-resort-cta">
              booking form
            </Link>
            .
          </p>
        </article>

        <div className="rounded-2xl border border-stone-200 bg-cream p-5 sm:p-6">
          <h2 className="text-xl font-serif text-resort-heading mb-3">Why guests choose Cherekh</h2>
          <ul className="list-disc ml-5 space-y-1 text-stone-700">
            <li>Clearly listed room rates and capacity</li>
            <li>Nature-focused location with easy local activity planning</li>
            <li>On-site dining and conference options</li>
            <li>Direct reservation flow without booking confusion</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button to="/booking" variant="primary">
            Book your stay
          </Button>
          <Button to="/contact" variant="outline">
            Talk to our team
          </Button>
        </div>
      </div>
    </section>
  )
}

export default BestResortThanchi

