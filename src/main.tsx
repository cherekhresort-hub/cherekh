import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthProvider.tsx'
import { SiteSettingsProvider } from './contexts/SiteSettingsProvider.tsx'
import { dismissHeroSplashForRoute } from './utils/heroSplash'
import {
  disableBrowserScrollRestoration,
  resetHomepageScroll,
} from './utils/scrollRestoration'
import './index.css'
import { installStickyPointerCursor } from './pointerCursor'

installStickyPointerCursor()

disableBrowserScrollRestoration()
resetHomepageScroll()

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    resetHomepageScroll()
  }
})

dismissHeroSplashForRoute(window.location.pathname)

const app = (
  <React.StrictMode>
    <AuthProvider>
      <SiteSettingsProvider>
        <App />
      </SiteSettingsProvider>
    </AuthProvider>
  </React.StrictMode>
)

const rootEl = document.getElementById('root')!
const currentPath = window.location.pathname.replace(/\/+$/, '') || '/'

// Build-time HTML is only reused for the exact route it was rendered for; the service worker
// can serve another page's markup (or the empty shell) for any navigation.
if (rootEl.dataset.prerendered === currentPath && rootEl.firstElementChild) {
  ReactDOM.hydrateRoot(rootEl, app)
} else {
  rootEl.replaceChildren()
  ReactDOM.createRoot(rootEl).render(app)
}

