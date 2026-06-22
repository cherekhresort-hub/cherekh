import type { IncomingMessage, ServerResponse } from 'node:http'
import { pathToFileURL } from 'node:url'
import type { Plugin, ViteDevServer } from 'vite'
import { loadEnv } from 'vite'

const FUNCTION_PREFIX = '/.netlify/functions/'

type NetlifyHandler = (event: {
  httpMethod: string
  headers: Record<string, string | undefined>
  body: string | null
  path: string
}) => Promise<{ statusCode: number; headers?: Record<string, string>; body?: string }>

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

const toNetlifyEvent = (req: IncomingMessage, body: string) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const headers: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key] = Array.isArray(value) ? value.join(', ') : value
  }
  return {
    httpMethod: req.method ?? 'GET',
    headers,
    body: body || null,
    path: url.pathname,
  }
}

const writeNetlifyResponse = (
  res: ServerResponse,
  result: { statusCode: number; headers?: Record<string, string>; body?: string }
) => {
  res.statusCode = result.statusCode
  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value)
    }
  }
  res.end(result.body ?? '')
}

const API_ALIASES: Record<string, string> = {
  '/api/team-members': 'team-members',
}

/** Serves Netlify functions during `vite` dev so Team access works on port 5173. */
export const netlifyFunctionsDevPlugin = (mode: string): Plugin => {
  let handler: NetlifyHandler | null = null

  const invokeFunction = async (req: IncomingMessage, res: ServerResponse) => {
    try {
      if (!handler) {
        const moduleUrl = pathToFileURL(
          `${process.cwd()}/netlify/functions/team-members.mjs`
        ).href
        const mod = (await import(moduleUrl)) as { handler: NetlifyHandler }
        handler = mod.handler
      }

      const body =
        req.method !== 'GET' && req.method !== 'HEAD' ? await readBody(req) : ''
      const result = await handler(toNetlifyEvent(req, body))
      writeNetlifyResponse(res, result)
    } catch (err) {
      console.error('[netlify-functions-dev]', err)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Function invoke failed.' }))
    }
  }

  return {
    name: 'netlify-functions-dev',
    configureServer(server: ViteDevServer) {
      const env = loadEnv(mode, process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (!process.env[key]) process.env[key] = value
      }

      // Accept misnamed VITE_ key locally only — never use VITE_ prefix for service role in .env.local
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY && env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY
        console.warn(
          '[netlify-functions-dev] Rename VITE_SUPABASE_SERVICE_ROLE_KEY to SUPABASE_SERVICE_ROLE_KEY in .env.local. VITE_ variables are exposed to the browser.'
        )
      }

      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0] ?? ''

        const apiFunction = API_ALIASES[pathname]
        if (apiFunction) {
          await invokeFunction(req, res)
          return
        }

        if (!pathname.startsWith(FUNCTION_PREFIX)) return next()

        const functionName = pathname.slice(FUNCTION_PREFIX.length)
        if (functionName !== 'team-members') {
          res.statusCode = 404
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Function not found.' }))
          return
        }

        await invokeFunction(req, res)
      })
    },
  }
}
