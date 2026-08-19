import { Link } from 'react-router-dom'
import Button from '../components/Button'
import { resortContact } from '../data/contactInfo'

const BestResortThanchi = () => {
  const mapsUrl = resortContact.location.mapsPlaceUrl

  return (
    <section className="px-4 sm:px-6 lg:px-8 page-content-inset">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Thanchi stay guide</p>
          <h1 className="text-3xl sm:text-4xl font-serif text-resort-heading">
            Where to stay in Thanchi: Cherekh Center
          </h1>
          <p className="text-stone-600 leading-relaxed">
            Cherekh Center is a hill stay in Thanchi, Bandarban - nine guest rooms, on-site dining,
            and a base for trekking, river trips, and village visits.
          </p>
        </header>

        <article className="space-y-5 text-stone-700 leading-relaxed">
          <p>
            Travelers searching for the best place to stay in Thanchi usually need three things: a
            confirmed room, food on site, and a location they can actually find after the Bandarban
            town road. Cherekh Center is built for that trip - not a city hotel, a small lodging in
            Thanchi Upazila with transparent room numbers, rates, and direct booking.
          </p>
          <p>
            The property is listed on Google Maps as{' '}
            <a
              href={mapsUrl}
              className="text-resort-heading underline hover:text-resort-cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cherekh Center
            </a>
            . Use that pin for jeep or reserved transport from Bandarban town. Allow extra time in
            monsoon season.
          </p>
        </article>

        <div className="rounded-2xl border border-stone-200 bg-cream p-5 sm:p-6 space-y-3">
          <h2 className="text-xl font-serif text-resort-heading">What you get on site</h2>
          <ul className="list-disc ml-5 space-y-1 text-stone-700">
            <li>Nine rooms (103-206): double and couple beds, AC and non-AC</li>
            <li>Cherekh Restaurant and complimentary breakfast with room stays</li>
            <li>Conference and community space for 80-100 people</li>
            <li>Help arranging hill trekking, river activities, and cultural visits</li>
          </ul>
        </div>

        <article className="space-y-5 text-stone-700 leading-relaxed">
          <h2 className="text-xl font-serif text-resort-heading">Planning a Thanchi stay</h2>
          <p>
            Compare rooms and prices on the{' '}
            <Link to="/rooms" className="text-resort-heading underline hover:text-resort-cta">
              rooms page
            </Link>
            , then reserve on the{' '}
            <Link to="/booking" className="text-resort-heading underline hover:text-resort-cta">
              booking form
            </Link>
            . For menus see{' '}
            <Link to="/dining" className="text-resort-heading underline hover:text-resort-cta">
              dining
            </Link>
            ; for trails and day trips see{' '}
            <Link to="/experiences" className="text-resort-heading underline hover:text-resort-cta">
              experiences
            </Link>
            .
          </p>
          <p>
            Call or WhatsApp {resortContact.phoneDisplay} before you leave Bandarban town if you
            need pickup notes or current road advice.
          </p>
        </article>

        <div className="flex flex-wrap gap-3">
          <Button to="/booking" variant="primary">
            Book your stay
          </Button>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 sm:px-8 sm:py-3 rounded-full font-medium text-sm sm:text-base inline-block text-center border-2 border-resort-heading text-resort-heading"
          >
            Open Google Maps
          </a>
        </div>
      </div>
    </section>
  )
}

export default BestResortThanchi
