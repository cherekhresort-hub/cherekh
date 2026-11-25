import { useState } from 'react'
import { Mail, Phone, Pencil, Trash2, UserX, UserCheck } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Field, Input } from '../ui/Input'
import { ShiftBadge, StaffStatusBadge } from '../ui/StatusBadge'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { deleteStaff, fireStaff, isFormerStaff, reinstateStaff } from '../../data/staff'
import { businessToday } from '../../../lib/finance/dates'
import { formatDay } from '../finance/financeHelpers'
import type { StaffMember } from '../../types'
import { confirmDelete } from '../../utils/confirmDelete'

interface StaffProfileModalProps {
  staff: StaffMember | null
  onClose: () => void
  onEdit?: (member: StaffMember) => void
  onDeleted?: () => void
  onChanged?: () => void
}

export const StaffProfileModal = ({
  staff,
  onClose,
  onEdit,
  onDeleted,
  onChanged,
}: StaffProfileModalProps) => {
  const toast = useToast()
  const { canDelete, isAdmin } = useAuth()
  const [firing, setFiring] = useState(false)
  const [reinstating, setReinstating] = useState(false)

  if (!staff) return <Modal open={false} onClose={onClose}>{null}</Modal>

  const former = isFormerStaff(staff)

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error('Permission denied', 'Managers cannot delete staff records.')
      return
    }
    if (!(await confirmDelete({
      title: 'Remove staff member?',
      text: `Remove ${staff.name} from staff? This cannot be undone.`,
    }))) return

    const { ok, synced } = await deleteStaff(staff.id)
    if (!ok) {
      toast.error('Could not remove staff member')
      return
    }

    if (synced) {
      toast.success('Staff removed', staff.name)
    } else {
      toast.error(
        'Removed locally only',
        'Could not sync delete to Supabase. Run migration 015 and try again.'
      )
    }

    onDeleted?.()
    onClose()
  }

  const handleReinstate = async () => {
    setReinstating(true)
    const result = await reinstateStaff(staff)
    setReinstating(false)
    if (!result.ok) {
      toast.error('Could not rehire', result.error)
      return
    }
    toast.success('Staff rehired', staff.name)
    onChanged?.()
  }

  return (
    <>
      <Modal
        open={!!staff && !firing}
        onClose={onClose}
        title={staff.name}
        description={staff.role}
        size="sm"
        footer={
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={handleDelete}
                  className="text-red-600 hover:bg-red-50"
                >
                  Delete
                </Button>
              )}
              {isAdmin && !former && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<UserX className="w-4 h-4" />}
                  onClick={() => setFiring(true)}
                  className="text-red-600 hover:bg-red-50"
                >
                  Fire
                </Button>
              )}
              {isAdmin && former && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<UserCheck className="w-4 h-4" />}
                  onClick={() => void handleReinstate()}
                  loading={reinstating}
                >
                  Rehire
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
              {onEdit && (
                <Button
                  size="sm"
                  leftIcon={<Pencil className="w-4 h-4" />}
                  onClick={() => onEdit(staff)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={staff.name} color={staff.avatarColor} size="lg" />
            <div>
              <p className="font-serif text-lg text-forest-700">{staff.name}</p>
              <p className="text-sm text-stone-500">{staff.role}</p>
            </div>
          </div>

          {former && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">Fired on {formatDay(staff.terminatedOn)}</p>
              <p className="mt-0.5">{staff.terminationReason}</p>
              {staff.terminatedBy && <p className="mt-0.5 text-xs opacity-80">By {staff.terminatedBy}</p>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {former ? <Badge tone="red">Former staff</Badge> : (
              <>
                <ShiftBadge shift={staff.shift} />
                <StaffStatusBadge status={staff.status} />
              </>
            )}
            <Badge tone="neutral">ID {staff.id.slice(-6).toUpperCase()}</Badge>
          </div>

          <ul className="space-y-2 text-sm">
            {staff.email && (
              <li className="flex items-center gap-2 text-stone-700">
                <Mail className="w-4 h-4 text-stone-400" />
                <a
                  href={`mailto:${staff.email}`}
                  className="font-medium break-all hover:text-forest-700"
                >
                  {staff.email}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2 text-stone-700">
              <Phone className="w-4 h-4 text-stone-400" />
              <a href={`tel:${staff.phone}`} className="font-medium hover:text-forest-700">
                {staff.phone}
              </a>
            </li>
          </ul>
        </div>
      </Modal>

      <FireStaffModal
        member={firing ? staff : null}
        onClose={() => setFiring(false)}
        onFired={() => {
          setFiring(false)
          onChanged?.()
        }}
      />
    </>
  )
}

const FireStaffModal = ({
  member,
  onClose,
  onFired,
}: {
  member: StaffMember | null
  onClose: () => void
  onFired: () => void
}) => {
  const toast = useToast()
  const { user } = useAuth()
  const [openedFor, setOpenedFor] = useState<StaffMember | null>(null)
  const [date, setDate] = useState(businessToday())
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (member !== openedFor) {
    setOpenedFor(member)
    setDate(businessToday())
    setReason('')
    setError(null)
  }
  if (!member) return null

  const save = async () => {
    if (!date) return setError('Choose the last working day.')
    if (!reason.trim()) return setError('Give a reason.')
    setSaving(true)
    const result = await fireStaff(member, { terminatedOn: date, reason, firedBy: user?.email ?? undefined })
    setSaving(false)
    if (!result.ok) return setError(result.error ?? 'Could not fire this staff member.')
    toast.success('Staff fired', member.name)
    onFired()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Fire ${member.name}?`}
      description={member.role}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Keep
          </Button>
          <Button variant="danger" onClick={() => void save()} loading={saving}>
            Fire staff
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <p className="text-sm text-stone-600">
          {member.name} moves to Former staff. Their record, payroll and advances are kept. Process their final salary and recover any advance in Payroll before or after this.
        </p>
        <Field label="Last working day" required>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Reason" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeated absence" />
        </Field>
      </div>
    </Modal>
  )
}
