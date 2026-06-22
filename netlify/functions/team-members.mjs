import { createClient } from '@supabase/supabase-js'

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  },
  body: JSON.stringify(body),
})

const normalizeEmail = (email) => email.trim().toLowerCase()

const VALID_ROLES = new Set(['admin', 'manager', 'booking_officer'])

const getEnv = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return { url, anonKey, serviceKey }
}

const requireAdmin = async (event) => {
  const { url, anonKey, serviceKey } = getEnv()
  if (!url || !anonKey || !serviceKey) {
    return { error: json(500, { error: 'Server is not configured for team management.' }) }
  }

  const authHeader = event.headers.authorization || event.headers.Authorization
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return { error: json(401, { error: 'Missing authorization token.' }) }
  }

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await authClient.auth.getUser(token)
  if (userError || !userData.user?.email) {
    return { error: json(401, { error: 'Invalid or expired session.' }) }
  }

  const email = normalizeEmail(userData.user.email)
  const { data: roleRow, error: roleError } = await adminClient
    .from('user_roles')
    .select('role')
    .ilike('email', email)
    .maybeSingle()

  if (roleError) {
    const msg = roleError.message ?? 'Role lookup failed.'
    if (/invalid api key/i.test(msg)) {
      return {
        error: json(500, {
          error:
            'Invalid Supabase service role key. Copy the current service_role key from Supabase → Project Settings → API into SUPABASE_SERVICE_ROLE_KEY (.env.local or Netlify).',
        }),
      }
    }
    return { error: json(500, { error: msg }) }
  }

  if (!roleRow) {
    return {
      error: json(403, {
        error: `${email} is not listed in user_roles. Add this email in Supabase with role admin.`,
      }),
    }
  }

  if (roleRow.role !== 'admin') {
    return {
      error: json(403, {
        error: `Signed in as ${email} (${roleRow.role}). Only admins can manage team access.`,
      }),
    }
  }

  return { adminClient, callerEmail: email }
}

const parseBody = (event) => {
  if (!event.body) return {}
  try {
    return JSON.parse(event.body)
  } catch {
    return null
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return json(204, {})
  }

  const auth = await requireAdmin(event)
  if (auth.error) return auth.error

  const { adminClient, callerEmail } = auth

  if (event.httpMethod === 'GET') {
    const { data, error } = await adminClient
      .from('user_roles')
      .select('email, role, user_id, created_at, updated_at')
      .order('created_at', { ascending: true })

    if (error) return json(500, { error: error.message })
    return json(200, { members: data ?? [] })
  }

  const body = parseBody(event)
  if (body === null) return json(400, { error: 'Invalid JSON body.' })

  if (event.httpMethod === 'POST') {
    const email = normalizeEmail(body.email ?? '')
    const password = body.password ?? ''
    const role = body.role ?? ''

    if (!email || !password || !VALID_ROLES.has(role)) {
      return json(400, { error: 'Email, password, and a valid role are required.' })
    }
    if (password.length < 8) {
      return json(400, { error: 'Password must be at least 8 characters.' })
    }

    const { data: existing } = await adminClient
      .from('user_roles')
      .select('email')
      .ilike('email', email)
      .maybeSingle()

    if (existing) {
      return json(409, { error: 'A team member with this email already exists.' })
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return json(400, { error: createError.message })
    }

    const { error: roleInsertError } = await adminClient.from('user_roles').insert({
      email,
      role,
      user_id: created.user?.id ?? null,
    })

    if (roleInsertError) {
      if (created.user?.id) {
        await adminClient.auth.admin.deleteUser(created.user.id)
      }
      return json(500, { error: roleInsertError.message })
    }

    return json(201, {
      member: {
        email,
        role,
        user_id: created.user?.id ?? null,
      },
    })
  }

  if (event.httpMethod === 'PATCH') {
    const email = normalizeEmail(body.email ?? '')
    const role = body.role
    const password = body.password

    if (!email) return json(400, { error: 'Email is required.' })

    const { data: member, error: fetchError } = await adminClient
      .from('user_roles')
      .select('email, role, user_id')
      .ilike('email', email)
      .maybeSingle()

    if (fetchError) return json(500, { error: fetchError.message })
    if (!member) return json(404, { error: 'Team member not found.' })

    if (role !== undefined) {
      if (!VALID_ROLES.has(role)) {
        return json(400, { error: 'Invalid role.' })
      }
      if (email === callerEmail && role !== 'admin') {
        return json(400, { error: 'You cannot remove your own admin access.' })
      }
      if (member.role === 'admin' && role !== 'admin') {
        const { count } = await adminClient
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'admin')
        if ((count ?? 0) <= 1) {
          return json(400, { error: 'At least one admin account must remain.' })
        }
      }

      const { error: updateError } = await adminClient
        .from('user_roles')
        .update({ role, updated_at: new Date().toISOString() })
        .ilike('email', email)

      if (updateError) return json(500, { error: updateError.message })
    }

    if (password) {
      if (password.length < 8) {
        return json(400, { error: 'Password must be at least 8 characters.' })
      }
      if (!member.user_id) {
        return json(400, { error: 'This account has no linked auth user yet.' })
      }
      const { error: pwdError } = await adminClient.auth.admin.updateUserById(member.user_id, {
        password,
      })
      if (pwdError) return json(400, { error: pwdError.message })
    }

    const { data: updated, error: refetchError } = await adminClient
      .from('user_roles')
      .select('email, role, user_id, created_at, updated_at')
      .ilike('email', email)
      .maybeSingle()

    if (refetchError) return json(500, { error: refetchError.message })
    return json(200, { member: updated })
  }

  if (event.httpMethod === 'DELETE') {
    const email = normalizeEmail(body.email ?? '')
    if (!email) return json(400, { error: 'Email is required.' })

    if (email === callerEmail) {
      return json(400, { error: 'You cannot delete your own account.' })
    }

    const { data: member, error: fetchError } = await adminClient
      .from('user_roles')
      .select('email, role, user_id')
      .ilike('email', email)
      .maybeSingle()

    if (fetchError) return json(500, { error: fetchError.message })
    if (!member) return json(404, { error: 'Team member not found.' })

    if (member.role === 'admin') {
      const { count } = await adminClient
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
      if ((count ?? 0) <= 1) {
        return json(400, { error: 'At least one admin account must remain.' })
      }
    }

    const { error: deleteRoleError } = await adminClient
      .from('user_roles')
      .delete()
      .ilike('email', email)

    if (deleteRoleError) return json(500, { error: deleteRoleError.message })

    if (member.user_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(member.user_id)
      if (deleteAuthError) {
        return json(500, {
          error: `Removed role but failed to delete auth user: ${deleteAuthError.message}`,
        })
      }
    }

    return json(200, { ok: true })
  }

  return json(405, { error: 'Method not allowed.' })
}
