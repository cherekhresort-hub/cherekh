import { getSupabase } from './supabase'
import type { StaffRole } from './roles'

export interface TeamMember {
  email: string
  role: StaffRole
  user_id: string | null
  created_at: string
  updated_at: string
}

const TEAM_MEMBERS_URL = '/api/team-members'

const getAccessToken = async (): Promise<string> => {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')

  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.access_token) {
    throw new Error('You must be signed in as an admin.')
  }
  return data.session.access_token
}

const request = async <T>(method: string, body?: Record<string, unknown>): Promise<T> => {
  const token = await getAccessToken()
  const res = await fetch(TEAM_MEMBERS_URL, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = (await res.json().catch(() => null)) as ({ error?: string } & T) | null
  if (payload === null || typeof payload !== 'object') {
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('text/html')) {
      throw new Error(
        'Team management API is unreachable (received the site HTML instead of JSON). On Netlify, set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in Site settings → Environment variables, then redeploy.'
      )
    }
    throw new Error(
      'Team management API returned an invalid response. Check Netlify function logs and SUPABASE_SERVICE_ROLE_KEY in production environment variables.'
    )
  }
  if (!res.ok) {
    throw new Error(payload.error ?? `Request failed (${res.status}).`)
  }
  return payload
}

export const listTeamMembers = async (): Promise<TeamMember[]> => {
  const data = await request<{ members: TeamMember[] }>('GET')
  if (!Array.isArray(data.members)) {
    throw new Error(
      'Team management API is unavailable. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (dev) or Netlify environment variables (production).'
    )
  }
  return data.members
}

export const createTeamMember = async (input: {
  email: string
  password: string
  role: StaffRole
}): Promise<TeamMember> => {
  const data = await request<{ member: TeamMember }>('POST', input)
  return data.member
}

export const updateTeamMember = async (input: {
  email: string
  role?: StaffRole
  password?: string
}): Promise<TeamMember> => {
  const data = await request<{ member: TeamMember }>('PATCH', input)
  return data.member
}

export const deleteTeamMember = async (email: string): Promise<void> => {
  await request<{ ok: boolean }>('DELETE', { email })
}
