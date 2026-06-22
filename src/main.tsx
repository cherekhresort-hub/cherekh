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

disableBrowserScrollRestoration()
resetHomepageScroll()

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    resetHomepageScroll()
  }
})

dismissHeroSplashForRoute(window.location.pathname)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <SiteSettingsProvider>
        <App />
      </SiteSettingsProvider>
    </AuthProvider>
  </React.StrictMode>,
)

