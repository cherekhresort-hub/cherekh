import { Mail, Phone, Pencil, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ShiftBadge, StaffStatusBadge } from '../ui/StatusBadge'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { deleteStaff } from '../../data/staff'
import type { StaffMember } from '../../types'
import { confirmDelete } from '../../utils/confirmDelete'

interface StaffProfileModalProps {
  staff: StaffMember | null
  onClose: () => void
  onEdit?: (member: StaffMember) => void
  onDeleted?: () => void
}

export const StaffProfileModal = ({
  staff,
  onClose,
  onEdit,
  onDeleted,
}: StaffProfileModalProps) => {
  const toast = useToast()
  const { canDelete } = useAuth()

  if (!staff) return <Modal open={false} onClose={onClose}>{null}</Modal>

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

  return (
    <Modal
      open={!!staff}
      onClose={onClose}
      title={staff.name}
      description={staff.role}
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-2">
          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={handleDelete}
              className="text-red-600 hover:bg-red-50"
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
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

        <div className="flex flex-wrap gap-2">
          <ShiftBadge shift={staff.shift} />
          <StaffStatusBadge status={staff.status} />
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
  )
}
