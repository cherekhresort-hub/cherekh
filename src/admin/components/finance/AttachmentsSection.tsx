import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Paperclip } from 'lucide-react'
import { Select } from '../ui/Input'
import { useToast } from '../ui/Toast'
import { useAuth } from '../../../contexts/AuthProvider'
import { DOC_TYPE_LABELS } from '../../../lib/finance/classification'
import { getAttachmentUrl, listAttachments, uploadAttachment } from '../../../lib/finance/financeDb'
import type { AttachmentDocType, AttachmentOwner, FinAttachment } from '../../../lib/finance/types'
import { errorMessage, formatDay } from './financeHelpers'

interface AttachmentsSectionProps {
  ownerType: AttachmentOwner
  ownerId: string
  docTypes: AttachmentDocType[]
  canUpload?: boolean
}

export const AttachmentsSection = ({ ownerType, ownerId, docTypes, canUpload = true }: AttachmentsSectionProps) => {
  const toast = useToast()
  const { user } = useAuth()
  const [items, setItems] = useState<FinAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [docType, setDocType] = useState<AttachmentDocType>(docTypes[0] ?? 'other')
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setItems(await listAttachments(ownerType, ownerId))
    } catch (err) {
      toast.error('Could not load documents', errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [ownerType, ownerId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const open = async (item: FinAttachment) => {
    try {
      const url = await getAttachmentUrl(item.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error('Could not open file', errorMessage(err))
    }
  }

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        await uploadAttachment(ownerType, ownerId, file, docType, user?.email ?? undefined)
      }
      toast.success('Uploaded')
      await load()
    } catch (err) {
      toast.error('Upload failed', errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-forest-700">Documents</h3>
        {canUpload && (
          <div className="flex items-center gap-2">
            <Select className="h-8 w-44 text-xs" value={docType} onChange={(e) => setDocType(e.target.value as AttachmentDocType)}>
              {docTypes.map((d) => (
                <option key={d} value={d}>
                  {DOC_TYPE_LABELS[d]}
                </option>
              ))}
            </Select>
            <label className="inline-flex items-center gap-1.5 text-sm text-forest-700 cursor-pointer hover:underline">
              <Paperclip className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload'}
              <input
                type="file"
                multiple
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
                disabled={uploading}
                onChange={(e) => {
                  void upload(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
        )}
      </div>
      {loading ? (
        <p className="text-xs text-stone-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-stone-500">No documents attached.</p>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-xl border border-stone-100">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-stone-800">{item.fileName}</p>
                <p className="text-xs text-stone-500">
                  {DOC_TYPE_LABELS[item.docType]} · {formatDay(item.createdAt)}
                  {item.uploadedBy ? ` · ${item.uploadedBy}` : ''}
                </p>
              </div>
              <button type="button" onClick={() => void open(item)} className="text-forest-700 hover:text-forest-900" aria-label="Open file">
                <ExternalLink className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
