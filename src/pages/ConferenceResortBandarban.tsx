import { Link } from 'react-router-dom'
import Button from '../components/Button'

const ConferenceResortBandarban = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 page-content-inset">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Events and retreats</p>
          <h1 className="text-3xl sm:text-4xl font-serif text-resort-heading">
            Conference Stay in Bandarban for Team Events and Offsite Retreats
          </h1>
          <p className="text-stone-600 leading-relaxed">
            Cherekh Center combines a dedicated conference space with accommodation options, making it
            suitable for corporate offsites, workshops, and private event groups.
          </p>
        </header>

        <article className="space-y-5 text-stone-700 leading-relaxed">
          <p>
            If you need a conference accommodation in Bandarban, the key factors are capacity, logistics, and
            overnight comfort. Cherekh Center offers an event-friendly environment with conference
            facilities and nearby room inventory so teams can stay and work in one location.
          </p>
          <p>
            The venue setup is suitable for business meetings, training sessions, and group programs.
            A hill-station atmosphere also helps teams focus and reset during multi-day retreats.
          </p>
          <p>
            You can review our event setup on the{' '}
            <Link
              to="/conference-room"
              className="text-resort-heading underline hover:text-resort-cta"
            >
              conference room page
            </Link>{' '}
            and secure dates through{' '}
            <Link
              to="/conference-room/booking"
              className="text-resort-heading underline hover:text-resort-cta"
            >
              conference booking
            </Link>
            .
          </p>
        </article>

        <div className="rounded-2xl border border-stone-200 bg-cream p-5 sm:p-6">
          <h2 className="text-xl font-serif text-resort-heading mb-3">Conference retreat advantages</h2>
          <ul className="list-disc ml-5 space-y-1 text-stone-700">
            <li>Conference hall capacity for group events</li>
            <li>On-site stay options for multi-day programs</li>
            <li>Food and hospitality in one location</li>
            <li>Natural environment for focused team sessions</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button to="/conference-room/booking" variant="primary">
            Reserve event date
          </Button>
          <Button to="/conference-room" variant="outline">
            See conference details
          </Button>
        </div>
      </div>
    </section>
  )
}

export default ConferenceResortBandarban

