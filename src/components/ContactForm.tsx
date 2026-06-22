import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { withRateLimit, RateLimitPresets } from '../utils/rateLimiter'
import { getCSRFToken, validateFormSubmission, createProtectedFormData } from '../utils/csrf'
import { submitContactInquiry, ContactInquiryRateLimitError } from '../lib/contactInquiries'
import { isValidEmail, normalizeEmail } from '../utils/validation'
import { addDaysToDateString, getTodayDate } from '../utils/dates'

const inputClass =
  'w-full rounded-lg border border-stone-200 bg-cream px-3.5 py-2.5 text-sm text-resort-heading placeholder:text-stone-400 focus:border-resort-cta focus:outline-none focus:ring-2 focus:ring-resort-cta/20 transition-shadow'

const labelClass = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500'

const ContactForm = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    checkIn: '',
    checkOut: '',
    guests: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const today = getTodayDate()
  const minCheckOut = formData.checkIn ? addDaysToDateString(formData.checkIn, 1) : today

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setErrorMessage('')
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage('')

    if (formData.checkOut <= formData.checkIn) {
      setErrorMessage('Check-out must be at least one day after check-in.')
      setSubmitting(false)
      return
    }

    const email = normalizeEmail(formData.email)
    if (!isValidEmail(email)) {
      setErrorMessage('Please enter a valid email address.')
      setSubmitting(false)
      return
    }

    const protectedData = createProtectedFormData(formData)
    if (!validateFormSubmission(protectedData)) {
      setErrorMessage('Security validation failed. Please refresh the page and try again.')
      setSubmitting(false)
      return
    }

    try {
      await withRateLimit(RateLimitPresets.CONTACT_FORM, async () => {
        await submitContactInquiry({ ...formData, email })
        const state = {
          name: formData.name.trim(),
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guests: formData.guests,
        }
        setFormData({
          name: '',
          email: '',
          phone: '',
          checkIn: '',
          checkOut: '',
          guests: '',
          message: '',
        })
        navigate('/contact/thank-you', { state })
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ''
      if (message.includes('Rate limit exceeded') || error instanceof ContactInquiryRateLimitError) {
        setErrorMessage(
          message ||
            'Too many inquiries. Please try again in about an hour or contact us by phone or WhatsApp.'
        )
      } else {
        setErrorMessage('There was an error submitting your form. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="_csrf" value={getCSRFToken()} />

      <div>
        <label htmlFor="contact-name" className={labelClass}>
          Full name
        </label>
        <input
          type="text"
          id="contact-name"
          name="name"
          required
          autoComplete="name"
          value={formData.name}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            Email
          </label>
          <input
            type="email"
            id="contact-email"
            name="email"
            required
            pattern="^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"
            autoComplete="email"
            inputMode="email"
            value={formData.email}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-phone" className={labelClass}>
            Phone
          </label>
          <input
            type="tel"
            id="contact-phone"
            name="phone"
            required
            autoComplete="tel"
            inputMode="tel"
            value={formData.phone}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-guests" className={labelClass}>
          Guests
        </label>
        <select
          id="contact-guests"
          name="guests"
          required
          value={formData.guests}
          onChange={handleChange}
          className={`${inputClass} appearance-none`}
        >
          <option value="">Select guests</option>
          <option value="1">1 guest</option>
          <option value="2">2 guests</option>
          <option value="3">3 guests</option>
          <option value="4">4 guests</option>
          <option value="5+">5+ guests</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-check-in" className={labelClass}>
            Check-in
          </label>
          <input
            type="date"
            id="contact-check-in"
            name="checkIn"
            required
            min={today}
            value={formData.checkIn}
            onChange={(e) => {
              const nextCheckIn = e.target.value
              setFormData((prev) => ({
                ...prev,
                checkIn: nextCheckIn,
                checkOut:
                  prev.checkOut && nextCheckIn && prev.checkOut <= nextCheckIn
                    ? ''
                    : prev.checkOut,
              }))
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-check-out" className={labelClass}>
            Check-out
          </label>
          <input
            type="date"
            id="contact-check-out"
            name="checkOut"
            required
            min={minCheckOut}
            disabled={!formData.checkIn}
            value={formData.checkOut}
            onChange={handleChange}
            className={`${inputClass} ${!formData.checkIn ? 'cursor-not-allowed bg-sand-50 text-stone-400' : ''}`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className={labelClass}>
          Message <span className="normal-case tracking-normal text-stone-400">(optional)</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={4}
          value={formData.message}
          onChange={handleChange}
          className={`${inputClass} min-h-[96px] resize-y`}
          placeholder="Room type, group details, or special requests"
        />
      </div>

      {errorMessage ? (
        <p className="text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-resort-cta px-6 py-3 text-sm font-semibold text-white shadow-md shadow-resort-cta/20 transition-colors hover:bg-resort-cta/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  )
}

export default ContactForm
