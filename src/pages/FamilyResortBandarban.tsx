import { Link } from 'react-router-dom'
import Button from '../components/Button'

const FamilyResortBandarban = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 page-content-inset">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Family travel</p>
          <h1 className="text-3xl sm:text-4xl font-serif text-resort-heading">
            Family Stay in Bandarban with Spacious Rooms and Simple Planning
          </h1>
          <p className="text-stone-600 leading-relaxed">
            Cherekh Center supports family trips with flexible room options, clear guest capacity,
            and a peaceful environment suitable for children and adults.
          </p>
        </header>

        <article className="space-y-5 text-stone-700 leading-relaxed">
          <p>
            A family accommodation in Bandarban should make planning easier, not harder. At Cherekh Center,
            room capacity, included guest count, and extra guest options are visible before booking.
            This helps families choose the right stay without surprises.
          </p>
          <p>
            Families can combine rest with nearby experiences such as hill viewpoints, short trekking
            routes, and river-side time. Our team can also guide you on suitable activity pacing
            based on guest age and trip length.
          </p>
          <p>
            Browse all room categories on{' '}
            <Link to="/rooms" className="text-resort-heading underline hover:text-resort-cta">
              rooms and suites
            </Link>{' '}
            and use the{' '}
            <Link to="/booking" className="text-resort-heading underline hover:text-resort-cta">
              booking page
            </Link>{' '}
            to confirm your family stay directly.
          </p>
        </article>

        <div className="rounded-2xl border border-stone-200 bg-cream p-5 sm:p-6">
          <h2 className="text-xl font-serif text-resort-heading mb-3">Family-friendly highlights</h2>
          <ul className="list-disc ml-5 space-y-1 text-stone-700">
            <li>Double and couple room combinations for flexible occupancy</li>
            <li>Clear total guest limits per room category</li>
            <li>On-site dining with local and Bangla options</li>
            <li>Quiet setting for relaxed overnight stays</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button to="/booking" variant="primary">
            Plan family stay
          </Button>
          <Button to="/contact" variant="outline">
            Ask trip questions
          </Button>
        </div>
      </div>
    </section>
  )
}

export default FamilyResortBandarban

