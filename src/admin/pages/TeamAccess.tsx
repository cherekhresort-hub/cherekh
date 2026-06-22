import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Eye, EyeOff, Pencil, Plus, Shield, Trash2, UserPlus } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../../contexts/AuthProvider'
import {
  STAFF_ROLE_OPTIONS,
  roleDescription,
  roleLabel as formatRoleLabel,
  type StaffRole,
} from '../../lib/roles'
import {
  createTeamMember,
  deleteTeamMember,
  listTeamMembers,
  updateTeamMember,
  type TeamMember,
} from '../../lib/teamMembersApi'
import { logStaffActivity } from '../../lib/staffActivityLog'
import { confirmDelete } from '../utils/confirmDelete'

type FormMode = 'create' | 'edit'

interface MemberFormState {
  email: string
  password: string
  role: StaffRole
}

const emptyForm = (): MemberFormState => ({
  email: '',
  password: '',
  role: 'booking_officer',
})

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const TeamAccess = () => {
  const toast = useToast()
  const { isAdmin, user, role, roleLabel, loading: authLoading } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [form, setForm] = useState<MemberFormState>(emptyForm())
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listTeamMembers()
      setMembers(Array.isArray(data) ? data : [])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not load team members.'
      setError(message)
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAdmin) void loadMembers()
    if (!authLoading && !isAdmin) setLoading(false)
  }, [authLoading, isAdmin, loadMembers])

  const filtered = useMemo(() => {
    const list = members ?? []
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter((member) =>
      [member.email, formatRoleLabel(member.role)].join(' ').toLowerCase().includes(q)
    )
  }, [members, search])

  const openCreate = () => {
    setFormMode('create')
    setEditingMember(null)
    setForm(emptyForm())
    setShowPassword(false)
    setFormOpen(true)
  }

  const openEdit = (member: TeamMember) => {
    setFormMode('edit')
    setEditingMember(member)
    setForm({ email: member.email, password: '', role: member.role })
    setShowPassword(false)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    setEditingMember(null)
    setForm(emptyForm())
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      if (formMode === 'create') {
        const email = form.email.trim()
        await createTeamMember({
          email,
          password: form.password,
          role: form.role,
        })
        void logStaffActivity({
          category: 'team',
          action: 'team.member_created',
          title: 'Team member added',
          message: `${email} · ${formatRoleLabel(form.role)}`,
        })
        toast.success('Team member added', `${email} can now sign in.`)
      } else if (editingMember) {
        const payload: { email: string; role?: StaffRole; password?: string } = {
          email: editingMember.email,
          role: form.role,
        }
        if (form.password.trim()) payload.password = form.password
        await updateTeamMember(payload)
        void logStaffActivity({
          category: 'team',
          action: 'team.member_updated',
          title: 'Team member updated',
          message: `${editingMember.email}${form.role !== editingMember.role ? ` · role → ${formatRoleLabel(form.role)}` : ''}${form.password.trim() ? ' · password reset' : ''}`,
        })
        toast.success('Team member updated')
      }
      closeForm()
      await loadMembers()
    } catch (err) {
      toast.error(
        formMode === 'create' ? 'Could not add member' : 'Could not update member',
        err instanceof Error ? err.message : undefined
      )
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (member: TeamMember) => {
    const ok = await confirmDelete({
      title: 'Remove team member?',
      text: `Remove ${member.email} from team access? Their login will be deleted.`,
    })
    if (!ok) return

    setDeletingEmail(member.email)
    try {
      await deleteTeamMember(member.email)
      void logStaffActivity({
        category: 'team',
        action: 'team.member_deleted',
        title: 'Team member removed',
        message: `${member.email} · ${formatRoleLabel(member.role)}`,
      })
      toast.success('Team member removed')
      await loadMembers()
    } catch (err) {
      toast.error('Could not remove member', err instanceof Error ? err.message : undefined)
    } finally {
      setDeletingEmail(null)
    }
  }

  if (authLoading) {
    return (
      <div className="px-4 lg:px-8 py-12 text-center text-sm text-stone-500">
        Loading…
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/admin" replace />
  }

  return (
    <>
      <TopBar
        title="Team access"
        description="Manage who can sign in to the admin panel and what they can access"
        search={{ value: search, onChange: setSearch, placeholder: 'Search by email or role…' }}
        actions={
          <Button size="md" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add member
          </Button>
        }
      />

      <main className="px-4 lg:px-8 py-6 space-y-4">
        {error && (
          <Card className="border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            <p className="font-medium">Could not load team members</p>
            <p className="mt-1 text-amber-800">{error}</p>
            {user?.email && role && (
              <p className="mt-2 text-xs text-amber-700">
                Signed in as {user.email} ({roleLabel}). Team access requires an admin account.
              </p>
            )}
            <p className="mt-2 text-xs text-amber-700">
              Production: Netlify → Site configuration → Environment variables — set{' '}
              <code className="font-mono">SUPABASE_URL</code>,{' '}
              <code className="font-mono">SUPABASE_ANON_KEY</code>, and{' '}
              <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> (not{' '}
              <code className="font-mono">VITE_</code>), then redeploy.
            </p>
            <p className="mt-2 text-xs text-amber-700">
              Local dev: add <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> to{' '}
              <code className="font-mono">.env.local</code> and restart{' '}
              <code className="font-mono">npm run dev</code>.
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => void loadMembers()}>
              Retry
            </Button>
          </Card>
        )}

        {loading ? (
          <div className="rounded-2xl border border-stone-200 bg-white/80 px-6 py-12 text-center text-sm text-stone-500">
            Loading team members…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Shield className="w-6 h-6" />}
            title={members.length === 0 ? 'No team members yet' : 'No matching members'}
            description={
              members.length === 0
                ? 'Add staff login accounts with email, password, and role.'
                : 'Try a different search term.'
            }
            action={
              members.length === 0 ? (
                <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={openCreate}>
                  Add first member
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((member) => {
              const isSelf = user?.email?.toLowerCase() === member.email.toLowerCase()
              return (
                <Card key={member.email} className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-stone-800 truncate">{member.email}</p>
                        {isSelf && (
                          <span className="text-[10px] uppercase tracking-wide font-medium text-forest-700 bg-forest-50 border border-forest-200 rounded-full px-2 py-0.5">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-forest-700 font-medium mt-1">
                        {formatRoleLabel(member.role)}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">{roleDescription(member.role)}</p>
                      <p className="text-xs text-stone-400 mt-2">
                        Added {formatDate(member.created_at)}
                        {!member.user_id && ' · Auth account not linked yet'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => openEdit(member)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        disabled={isSelf || deletingEmail === member.email}
                        onClick={() => void onDelete(member)}
                      >
                        {deletingEmail === member.email ? 'Removing…' : 'Remove'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={formMode === 'create' ? 'Add team member' : 'Edit team member'}
        description={
          formMode === 'create'
            ? 'Creates a Supabase login and assigns an admin panel role.'
            : 'Update role or set a new password. Leave password blank to keep the current one.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm} disabled={saving} type="button">
              Cancel
            </Button>
            <Button type="submit" form="team-member-form" disabled={saving}>
              {saving ? 'Saving…' : formMode === 'create' ? 'Add member' : 'Save changes'}
            </Button>
          </div>
        }
      >
        <form id="team-member-form" className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          {formMode === 'create' ? (
            <Field label="Email" required>
              <Input
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </Field>
          ) : (
            <Field label="Email">
              <Input type="email" value={form.email} disabled />
            </Field>
          )}

          <Field
            label={formMode === 'create' ? 'Password' : 'New password'}
            hint={
              formMode === 'edit'
                ? 'Leave blank to keep the current password.'
                : 'Minimum 8 characters.'
            }
            required={formMode === 'create'}
          >
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required={formMode === 'create'}
                minLength={formMode === 'create' ? 8 : undefined}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="Role" required>
            <Select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, role: event.target.value as StaffRole }))
              }
            >
              {STAFF_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-stone-500 mt-1.5">{roleDescription(form.role)}</p>
          </Field>
        </form>
      </Modal>
    </>
  )
}

export default TeamAccess
