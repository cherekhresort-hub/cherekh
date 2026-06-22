import { useEffect, useMemo, useState } from 'react'
import { Trash2, Plus, Tag, ShieldCheck } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import {
  addStaffRole,
  deleteStaffRole,
  getStaffRoles,
  getStaffRoleUsageCount,
  isDefaultStaffRole,
} from '../../data/staffRoles'

interface ManageRolesModalProps {
  open: boolean
  onClose: () => void
  /** Called after any role mutation (add or delete) so callers can re-read. */
  onChanged?: () => void
}

export const ManageRolesModal = ({ open, onClose, onChanged }: ManageRolesModalProps) => {
  const toast = useToast()
  const { canDelete } = useAuth()
  const [roles, setRoles] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState('')

  const refresh = () => {
    setRoles(getStaffRoles())
    onChanged?.()
  }

  useEffect(() => {
    if (!open) return
    setRoles(getStaffRoles())
    setDraft('')
    setFilter('')
  }, [open])

  const addNew = () => {
    const saved = addStaffRole(draft)
    if (!saved) {
      toast.error('Enter a role name')
      return
    }
    setDraft('')
    refresh()
    toast.success('Role added', saved)
  }

  const handleDelete = (role: string) => {
    if (!canDelete) {
      toast.error('Permission denied', 'Managers cannot delete roles.')
      return
    }
    const result = deleteStaffRole(role)
    if (result.ok) {
      refresh()
      toast.success('Role removed', role)
      return
    }
    if (result.error === 'forbidden') {
      toast.error('Permission denied', 'Managers cannot delete roles.')
    } else if (result.error === 'default') {
      toast.error('Built-in role', "Default roles can't be deleted.")
    } else if (result.error === 'in-use') {
      toast.error(
        'Role in use',
        `${result.usageCount} staff member${result.usageCount === 1 ? '' : 's'} still assigned to "${role}".`
      )
    } else {
      toast.error('Could not delete role')
    }
  }

  const visibleRoles = useMemo(() => {
    if (!filter.trim()) return roles
    const q = filter.toLowerCase()
    return roles.filter((r) => r.toLowerCase().includes(q))
  }, [roles, filter])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage roles"
      description="Add custom titles or remove ones you no longer need."
      size="md"
      footer={
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500 font-medium mb-1.5 inline-flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Add a new role
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addNew()
                }
              }}
              placeholder="e.g. Spa Therapist"
              className="flex-1"
            />
            <Button
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={addNew}
              disabled={!draft.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> All roles
              <span className="font-normal text-stone-400 normal-case">({roles.length})</span>
            </p>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              className="h-9 max-w-[12rem]"
            />
          </div>

          {visibleRoles.length === 0 ? (
            <div className="rounded-xl bg-cream/60 border border-dashed border-stone-200 px-4 py-6 text-center">
              <p className="text-xs text-stone-500">No roles match that filter.</p>
            </div>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {visibleRoles.map((role) => {
                const isDefault = isDefaultStaffRole(role)
                const usage = getStaffRoleUsageCount(role)
                const protectedRole = isDefault || usage > 0
                return (
                  <li
                    key={role}
                    className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-cream/60 hover:bg-cream/90 transition-colors"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-sm font-medium text-forest-700 truncate">{role}</span>
                      {isDefault && (
                        <Badge tone="neutral" size="sm" icon={<ShieldCheck />}>
                          Default
                        </Badge>
                      )}
                      {usage > 0 && (
                        <Badge tone="teal" size="sm">
                          {usage} staff
                        </Badge>
                      )}
                    </div>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(role)}
                        disabled={protectedRole}
                        title={
                          isDefault
                            ? "Built-in roles can't be deleted"
                            : usage > 0
                              ? `Reassign or remove the ${usage} staff member${usage === 1 ? '' : 's'} first`
                              : 'Delete role'
                        }
                        className={
                          'p-1.5 rounded-lg transition-colors ' +
                          (protectedRole
                            ? 'text-stone-300 cursor-not-allowed'
                            : 'text-stone-400 hover:text-red-600 hover:bg-red-50')
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <p className="text-xs text-stone-500">
          Built-in roles and any role currently assigned to a staff member are
          protected from deletion. Reassign affected staff first if you want to
          remove a role that's in use.
        </p>
      </div>
    </Modal>
  )
}
