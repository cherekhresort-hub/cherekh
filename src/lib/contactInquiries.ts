import { getSupabase } from './supabase'

export type ContactInquiryStatus = 'new' | 'contacted' | 'closed'

export interface ContactInquiry {
  id: string
  name: string
  email: string
  phone: string
  checkIn: string
  checkOut: string
  guests: string
  message: string
  status: ContactInquiryStatus
  source: string
  createdAt: string
  updatedAt: string
}

export interface ContactInquiryInput {
  name: string
  email: string
  phone: string
  checkIn: string
  checkOut: string
  guests: string
  message?: string
}

export class ContactInquiryRateLimitError extends Error {
  constructor(
    message = 'Rate limit exceeded. Please try again in about an hour or contact us by phone or WhatsApp.'
  ) {
    super(message)
    this.name = 'ContactInquiryRateLimitError'
  }
}

type ContactInquiryRow = {
  id: string
  name: string
  email: string
  phone: string
  check_in: string
  check_out: string
  guests: string
  message: string | null
  status: ContactInquiryStatus
  source: string
  created_at: string
  updated_at: string
}

const fromRow = (row: ContactInquiryRow): ContactInquiry => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  checkIn: row.check_in,
  checkOut: row.check_out,
  guests: row.guests,
  message: row.message ?? '',
  status: row.status,
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const parseInquiryRpcResult = (data: unknown): { ok: true } | { ok: false; error: string } => {
  if (!data || typeof data !== 'object') return { ok: false, error: 'unknown' }
  const row = data as { ok?: boolean; error?: string }
  if (row.ok === true) return { ok: true }
  return { ok: false, error: row.error ?? 'unknown' }
}

export const submitContactInquiry = async (input: ContactInquiryInput): Promise<void> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Inquiry service is not configured.')

  const { data, error } = await supabase.rpc('insert_contact_inquiry_if_allowed', {
    p_name: input.name.trim(),
    p_email: input.email.trim(),
    p_phone: input.phone.trim(),
    p_check_in: input.checkIn,
    p_check_out: input.checkOut,
    p_guests: input.guests.trim(),
    p_message: input.message?.trim() || null,
    p_source: 'website',
  })

  if (error) throw error

  const result = parseInquiryRpcResult(data)
  if (result.ok) return

  if (result.error === 'rate_limit_exceeded') {
    throw new ContactInquiryRateLimitError()
  }
  if (result.error === 'invalid_dates') {
    throw new Error('Check-out date must be at least one day after check-in.')
  }

  throw new Error('There was an error submitting your form. Please try again.')
}

export const listContactInquiries = async (): Promise<ContactInquiry[]> => {
  const supabase = getSupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('contact_inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => fromRow(row as ContactInquiryRow))
}

export const setContactInquiryStatus = async (
  id: string,
  status: ContactInquiryStatus
): Promise<void> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Inquiry service is not configured.')

  const { error } = await supabase
    .from('contact_inquiries')
    .update({ status })
    .eq('id', id)

  if (error) throw error
}

export const deleteContactInquiry = async (id: string): Promise<void> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Inquiry service is not configured.')

  const { error } = await supabase.from('contact_inquiries').delete().eq('id', id)
  if (error) throw error
}
