import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { MAX_STAFF_NAME_LENGTH } from '../../../lib/staffNames'

interface ProfileNameModalProps {
  open: boolean
  onClose: () => void
}

export const ProfileNameModal = ({ open, onClose }: ProfileNameModalProps) => {
  const { user, roleLabel, displayName, updateDisplayName } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(displayName ?? '')
  const [saving, setSaving] = useState(false)

  const close = () => {
    if (saving) return
    onClose()
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateDisplayName(name)
      toast.success('Name saved', name.trim() ? `Bookings you create will show “${name.trim()}”.` : undefined)
      onClose()
    } catch (err) {
      toast.error('Could not save name', err instanceof Error ? err.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title="Your name"
      description="Shown on bookings you create, so the team knows who booked what."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="profile-name-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      }
    >
      <form id="profile-name-form" className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="Name">
          <Input
            type="text"
            autoComplete="name"
            autoFocus
            value={name}
            maxLength={MAX_STAFF_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
          />
        </Field>
        {user?.email && (
          <p className="text-xs text-stone-500">
            Signed in as {user.email} · {roleLabel}
          </p>
        )}
      </form>
    </Modal>
  )
}
