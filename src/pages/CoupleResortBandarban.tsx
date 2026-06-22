import { Link } from 'react-router-dom'
import Button from '../components/Button'

const CoupleResortBandarban = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 page-content-inset">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Couple retreat</p>
          <h1 className="text-3xl sm:text-4xl font-serif text-resort-heading">
            Couple Stay in Bandarban for a Quiet and Scenic Getaway
          </h1>
          <p className="text-stone-600 leading-relaxed">
            Cherekh Center is a practical choice for couples who want privacy, calm views, and easy
            room booking without complexity.
          </p>
        </header>

        <article className="space-y-5 text-stone-700 leading-relaxed">
          <p>
            Couples visiting Bandarban often look for two things: a peaceful room and a setting that
            feels away from city noise. Cherekh Center offers couple-friendly room categories,
            including AC options and hill-facing premium choices, with simple online reservation.
          </p>
          <p>
            The location makes it easy to plan relaxed days with local dining, scenic viewpoints, and
            short outdoor activities. You can keep the trip restful or add guided experiences
            depending on your stay duration.
          </p>
          <p>
            Start with{' '}
            <Link to="/rooms" className="text-resort-heading underline hover:text-resort-cta">
              room comparison
            </Link>
            , then confirm dates through{' '}
            <Link to="/booking" className="text-resort-heading underline hover:text-resort-cta">
              direct booking
            </Link>
            .
          </p>
        </article>

        <div className="rounded-2xl border border-stone-200 bg-cream p-5 sm:p-6">
          <h2 className="text-xl font-serif text-resort-heading mb-3">Best for couples who want</h2>
          <ul className="list-disc ml-5 space-y-1 text-stone-700">
            <li>Comfortable couple rooms with clear pricing</li>
            <li>Scenic and quieter hill-station atmosphere</li>
            <li>Simple booking with fast confirmation flow</li>
            <li>Easy access to local activities</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button to="/booking" variant="primary">
            Book couple stay
          </Button>
          <Button to="/experiences" variant="outline">
            View experiences
          </Button>
        </div>
      </div>
    </section>
  )
}

export default CoupleResortBandarban

