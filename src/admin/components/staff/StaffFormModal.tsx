import { useEffect, useMemo, useState } from 'react'
import { Check, UserPlus, UserCog, Plus, X, Settings2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Field, Input, Select } from '../ui/Input'
import { Avatar } from '../ui/Avatar'
import { useToast } from '../ui/Toast'
import { addStaff, STAFF_COLORS, updateStaff } from '../../data/staff'
import { addStaffRole, getStaffRoles } from '../../data/staffRoles'
import { ManageRolesModal } from './ManageRolesModal'
import type { StaffMember, StaffShift, StaffStatus } from '../../types'
import { cn } from '../../utils/cn'

const ADD_ROLE_SENTINEL = '__add_new_role__'

interface StaffFormModalProps {
  open: boolean
  /** Pass a member to edit, omit/null to create. */
  member?: StaffMember | null
  onClose: () => void
  onSaved: (member: StaffMember) => void
}

const DEFAULT_FORM = {
  name: '',
  role: '',
  phone: '',
  email: '',
  shift: 'morning' as StaffShift,
  status: 'on-duty' as StaffStatus,
  avatarColor: STAFF_COLORS[0] as string,
}

export const StaffFormModal = ({ open, member, onClose, onSaved }: StaffFormModalProps) => {
  const toast = useToast()
  const isEdit = !!member
  const [form, setForm] = useState(DEFAULT_FORM)
  const [error, setError] = useState<string | null>(null)

  const [roles, setRoles] = useState<string[]>([])
  const [addingRole, setAddingRole] = useState(false)
  const [newRoleDraft, setNewRoleDraft] = useState('')
  const [manageOpen, setManageOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setRoles(getStaffRoles())
    if (member) {
      setForm({
        name: member.name,
        role: member.role,
        phone: member.phone,
        email: member.email ?? '',
        shift: member.shift,
        status: member.status,
        avatarColor: member.avatarColor,
      })
    } else {
      setForm(DEFAULT_FORM)
    }
    setAddingRole(false)
    setNewRoleDraft('')
    setError(null)
  }, [open, member])

  const roleOptions = useMemo(() => {
    // If the staff member's role isn't in the dictionary for any reason,
    // make sure it's still listed so it stays selected.
    const list = [...roles]
    if (form.role && !list.some((r) => r.toLowerCase() === form.role.toLowerCase())) {
      list.push(form.role)
      list.sort((a, b) => a.localeCompare(b))
    }
    return list
  }, [roles, form.role])

  const handleRoleChange = (value: string) => {
    if (value === ADD_ROLE_SENTINEL) {
      setAddingRole(true)
      setNewRoleDraft('')
      return
    }
    update('role', value)
  }

  const confirmAddRole = () => {
    const saved = addStaffRole(newRoleDraft)
    if (!saved) {
      toast.error('Enter a role name')
      return
    }
    const refreshed = getStaffRoles()
    setRoles(refreshed)
    update('role', saved)
    setAddingRole(false)
    setNewRoleDraft('')
    toast.success('Role added', saved)
  }

  const cancelAddRole = () => {
    setAddingRole(false)
    setNewRoleDraft('')
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async () => {
    setError(null)
    if (!form.name.trim() || !form.role.trim() || !form.phone.trim()) {
      setError('Name, role, and phone are required.')
      return
    }
    const result = isEdit && member
      ? await updateStaff(member.id, form)
      : await addStaff(form)

    if (!result.member) {
      setError('Could not save staff member.')
      return
    }

    if (result.synced) {
      toast.success(
        isEdit ? 'Staff updated' : 'Staff added',
        `${result.member.name} · ${result.member.role}`
      )
    } else {
      toast.error(
        'Saved locally only',
        'Could not sync to Supabase. Run migration 015 and try again.'
      )
    }

    onSaved(result.member)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit staff' : 'Add staff'}
      description={isEdit ? 'Update profile, shift or status.' : 'Add a new member to the accommodation team.'}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftIcon={
              isEdit ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
            }
            onClick={submit}
          >
            {isEdit ? 'Save changes' : 'Add staff'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={form.name || '?'} color={form.avatarColor} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-stone-500 font-medium inline-flex items-center gap-1.5">
              <UserCog className="w-3 h-3" /> Avatar colour
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STAFF_COLORS.map((color) => {
                const active = form.avatarColor === color
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Select colour ${color}`}
                    onClick={() => update('avatarColor', color)}
                    className={cn(
                      'w-6 h-6 rounded-full transition-transform',
                      active && 'ring-2 ring-offset-2 ring-forest-400 scale-110'
                    )}
                    style={{ backgroundColor: color }}
                  />
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Rina Marma"
            />
          </Field>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-stone-600">
                Role / title<span className="text-red-500 ml-0.5">*</span>
              </label>
              <button
                type="button"
                onClick={() => setManageOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] text-forest-600 hover:text-forest-700"
              >
                <Settings2 className="w-3 h-3" /> Manage roles
              </button>
            </div>
            {addingRole ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={newRoleDraft}
                  onChange={(e) => setNewRoleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      confirmAddRole()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      cancelAddRole()
                    }
                  }}
                  placeholder="e.g. Spa Therapist"
                  className="flex-1"
                />
                <Button
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={confirmAddRole}
                >
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Cancel adding role"
                  onClick={cancelAddRole}
                  className="!px-2"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Select
                value={form.role}
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <option value="" disabled>
                  Select a role…
                </option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value={ADD_ROLE_SENTINEL}>＋ Add new role…</option>
              </Select>
            )}
          </div>
          <Field label="Phone" required>
            <Input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+880 …"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="optional"
            />
          </Field>
          <Field label="Shift" required>
            <Select
              value={form.shift}
              onChange={(e) => update('shift', e.target.value as StaffShift)}
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="night">Night</option>
              <option value="off">Off</option>
            </Select>
          </Field>
          <Field label="Status" required>
            <Select
              value={form.status}
              onChange={(e) => update('status', e.target.value as StaffStatus)}
            >
              <option value="on-duty">On duty</option>
              <option value="on-break">On break</option>
              <option value="off-duty">Off duty</option>
            </Select>
          </Field>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-stone-500">
          Tip: include the word <em>"Housekeep"</em> in the role to make this member
          available in the housekeeping assignee picker.
        </p>
      </div>

      <ManageRolesModal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onChanged={() => setRoles(getStaffRoles())}
      />
    </Modal>
  )
}
