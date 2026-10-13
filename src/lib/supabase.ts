import { createClient, RealtimeClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from './supabaseConfig'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Some mobile carriers block *.supabase.co, so HTTP traffic (auth, database, storage)
 * goes through this site's own domain: Netlify rewrites /sb/* in production
 * (scripts/prerender-meta.mjs) and Vite proxies it in dev (vite.config.ts).
 * Set VITE_SUPABASE_PROXY=off to talk to Supabase directly.
 */
export const SUPABASE_PROXY_PATH = '/sb'

const shouldProxy = (): boolean =>
  typeof window !== 'undefined' && import.meta.env.VITE_SUPABASE_PROXY !== 'off'

let client: SupabaseClient | null = null

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    const directUrl = new URL(url!)
    const proxied = shouldProxy()
    const created = createClient(
      proxied ? `${window.location.origin}${SUPABASE_PROXY_PATH}` : url!,
      anonKey!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Keep the key derived from the real project URL so existing sessions survive the proxy switch.
          storageKey: `sb-${directUrl.hostname.split('.')[0]}-auth-token`,
        },
      }
    )
    if (proxied) {
      // Netlify rewrites cannot proxy WebSockets; realtime connects to Supabase directly.
      const realtimeUrl = new URL('realtime/v1', directUrl)
      realtimeUrl.protocol = realtimeUrl.protocol.replace('http', 'ws')
      created.realtime = new RealtimeClient(realtimeUrl.href, {
        params: { apikey: anonKey! },
        accessToken: async () => (await created.auth.getSession()).data.session?.access_token ?? null,
      })
    }
    client = created
  }
  return client
}

export { isSupabaseConfigured } from './supabaseConfig'
