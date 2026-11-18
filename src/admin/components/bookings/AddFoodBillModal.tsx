import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { saveBooking, type Booking } from '../../../utils/bookings'
import { foodServiceBounds } from '../../../utils/bookingHelpers'
import { getTodayDate, toLocalDateString } from '../../../utils/dates'
import { isValidEmail, normalizeEmail } from '../../../utils/validation'
import { BookingPersistError } from '../../../lib/bookingsStore'

interface AddFoodBillModalProps {
  open: boolean
  onClose: () => void
  onCreated: (booking: Booking) => void
}

const maxServiceDate = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return toLocalDateString(d)
}

export const AddFoodBillModal = ({ open, onClose, onCreated }: AddFoodBillModalProps) => {
  const toast = useToast()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [serviceDate, setServiceDate] = useState(getTodayDate)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName('')
    setPhone('')
    setEmail('')
    setServiceDate(getTodayDate())
    setError(null)
  }, [open])

  const closeIfIdle = () => {
    if (!saving) onClose()
  }

  const submit = async () => {
    if (saving) return
    setError(null)

    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedName || !trimmedPhone) {
      setError('Guest name and phone are required.')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      setError('Choose a service date.')
      return
    }
    const normalizedEmail = email.trim() ? normalizeEmail(email) : ''
    if (normalizedEmail && !isValidEmail(normalizedEmail)) {
      setError('Enter a valid guest email, or leave it empty.')
      return
    }

    const bounds = foodServiceBounds(serviceDate)
    setSaving(true)
    try {
      const booking = await saveBooking(
        {
          bookingKind: 'food',
          checkIn: bounds.checkIn,
          checkOut: bounds.checkOut,
          name: trimmedName,
          email: normalizedEmail,
          phone: trimmedPhone,
          specialRequests: '',
          rooms: [],
        },
        { sendEmails: false, status: 'confirmed', amount: 0 }
      )
      toast.success('Food bill created', `${trimmedName} · ${serviceDate}`)
      onCreated(booking)
      onClose()
    } catch (e) {
      if (e instanceof BookingPersistError) {
        setError(e.message)
      } else {
        console.error(e)
        setError('Could not create the food bill. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={closeIfIdle}
      title="Add food bill"
      description="Walk-in guest with no room. Works even when every room is booked."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={closeIfIdle} disabled={saving}>
            Close
          </Button>
          <Button onClick={() => void submit()} loading={saving}>
            {saving ? 'Creating…' : 'Create food bill'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Guest name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Guest name" />
        </Field>
        <Field label="Phone" required>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="01…" />
        </Field>
        <Field label="Email" hint="Optional">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guest@example.com"
          />
        </Field>
        <Field label="Service date" required hint="The day food is served">
          <Input
            type="date"
            value={serviceDate}
            max={maxServiceDate()}
            onChange={(e) => setServiceDate(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </Modal>
  )
}
