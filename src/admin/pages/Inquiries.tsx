import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail, Phone, CalendarDays, UserRoundSearch, MessageSquareText, Trash2 } from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Tabs } from '../components/ui/Tabs'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { useContactInquiries } from '../hooks/useContactInquiries'
import { useAuth } from '../../contexts/AuthProvider'
import type { ContactInquiryStatus } from '../../lib/contactInquiries'
import { confirmDelete } from '../utils/confirmDelete'

type Filter = 'all' | ContactInquiryStatus

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

const statusTone: Record<ContactInquiryStatus, string> = {
  new: 'text-amber-700 bg-amber-50 border-amber-200',
  contacted: 'text-sky-700 bg-sky-50 border-sky-200',
  closed: 'text-forest-700 bg-forest-50 border-forest-200',
}

const Inquiries = () => {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkHandled = useRef<string | null>(null)
  const { inquiries, loading, error, counts, updateStatus, remove } = useContactInquiries()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = inquiries
    if (filter !== 'all') list = list.filter((q) => q.status === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((item) =>
        [item.name, item.email, item.phone, item.message, item.guests].join(' ').toLowerCase().includes(q)
      )
    }
    return list
  }, [inquiries, filter, search])

  useEffect(() => {
    const id = searchParams.get('id')
    if (!id || inquiries.length === 0) return
    if (deepLinkHandled.current === id) return

    const inquiry = inquiries.find((q) => q.id === id)
    if (!inquiry) return

    deepLinkHandled.current = id
    setHighlightId(id)
    setSearchParams(
      (params) => {
        params.delete('id')
        return params
      },
      { replace: true }
    )

    window.setTimeout(() => {
      document.getElementById(`inquiry-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)

    window.setTimeout(() => setHighlightId(null), 4000)
  }, [inquiries, searchParams, setSearchParams])

  const onStatusChange = async (id: string, next: ContactInquiryStatus) => {
    setUpdatingId(id)
    try {
      await updateStatus(id, next)
      toast.success('Inquiry updated', `Status changed to ${next}.`)
    } catch {
      toast.error('Failed to update inquiry')
    } finally {
      setUpdatingId(null)
    }
  }

  const onDelete = async (id: string, name: string) => {
    if (!isAdmin) return
    const ok = await confirmDelete({
      title: 'Delete inquiry?',
      text: `Delete inquiry from ${name}? This cannot be undone.`,
    })
    if (!ok) return
    setDeletingId(id)
    try {
      await remove(id)
      toast.success('Inquiry deleted')
    } catch {
      toast.error('Failed to delete inquiry')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <TopBar
        title="Inquiries"
        description="Messages submitted from the website contact form"
        search={{ value: search, onChange: setSearch, placeholder: 'Search name, phone, email…' }}
      />
      <main className="px-4 lg:px-8 py-6 space-y-4">
        <div className="-mx-1 px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs<Filter>
            value={filter}
            onChange={setFilter}
            className="w-max"
            items={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'new', label: 'New', count: counts.new },
              { value: 'contacted', label: 'Contacted', count: counts.contacted },
              { value: 'closed', label: 'Closed', count: counts.closed },
            ]}
          />
        </div>

        {error && (
          <Card className="border border-red-200 bg-red-50 text-red-700">
            <p className="text-sm">{error}</p>
          </Card>
        )}

        {loading ? (
          <Card>
            <p className="text-sm text-stone-500">Loading inquiries…</p>
          </Card>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<UserRoundSearch className="w-6 h-6" />}
            title="No inquiries found"
            description="When visitors submit the contact form, inquiries will appear here."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((q) => (
              <Card
                key={q.id}
                id={`inquiry-${q.id}`}
                className={`space-y-3 transition-shadow ${
                  highlightId === q.id ? 'ring-2 ring-forest-500 shadow-card' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-forest-700">{q.name}</p>
                    <p className="text-xs text-stone-500 inline-flex items-center gap-1 mt-0.5">
                      <CalendarDays className="w-3 h-3" />
                      {formatDate(q.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${statusTone[q.status]}`}
                  >
                    {q.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-stone-700">
                  <p className="inline-flex items-center gap-1.5 min-w-0">
                    <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                    <span className="truncate">{q.email}</span>
                  </p>
                  <p className="inline-flex items-center gap-1.5 min-w-0">
                    <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                    <span className="truncate">{q.phone}</span>
                  </p>
                </div>

                <div className="text-sm text-stone-600">
                  <p>
                    <span className="text-stone-500">Stay:</span> {q.checkIn} → {q.checkOut}
                  </p>
                  <p>
                    <span className="text-stone-500">Guests:</span> {q.guests}
                  </p>
                </div>

                {q.message && (
                  <div className="rounded-xl bg-cream/70 p-3 text-sm text-stone-700">
                    <p className="text-[11px] uppercase tracking-wide text-stone-500 mb-1 inline-flex items-center gap-1">
                      <MessageSquareText className="w-3 h-3" />
                      Message
                    </p>
                    <p className="leading-relaxed">{q.message}</p>
                  </div>
                )}

                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <Select
                      value={q.status}
                      disabled={updatingId === q.id}
                      onChange={(e) => onStatusChange(q.id, e.target.value as ContactInquiryStatus)}
                      className="h-9 text-sm"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </Select>
                    {isAdmin && (
                      <Button
                        size="icon"
                        variant="danger"
                        aria-label={`Delete inquiry from ${q.name}`}
                        disabled={deletingId === q.id}
                        onClick={() => onDelete(q.id, q.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

export default Inquiries
