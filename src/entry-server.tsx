import { StrictMode } from 'react'
import { renderToPipeableStream, type PipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { AppRoutes } from './App'
import { AuthProvider } from './contexts/AuthProvider'
import { SiteSettingsProvider } from './contexts/SiteSettingsProvider'

export { buildRouteSchema } from './utils/routeSchema'

/**
 * Build-time only (scripts/prerender-meta.mjs): resolves once every lazy page for `url`
 * has loaded, so the piped HTML contains the full page rather than Suspense fallbacks.
 */
export const render = (url: string): Promise<PipeableStream> =>
  new Promise((resolve, reject) => {
    const stream = renderToPipeableStream(
      <StrictMode>
        <AuthProvider>
          <SiteSettingsProvider>
            <StaticRouter location={url}>
              <AppRoutes />
            </StaticRouter>
          </SiteSettingsProvider>
        </AuthProvider>
      </StrictMode>,
      {
        onAllReady: () => resolve(stream),
        onShellError: reject,
        onError: reject,
      }
    )
  })
