import { ReactNode, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { loadRoomRates } from '../lib/roomRatesDb'
import { dismissHeroSplashForRoute } from '../utils/heroSplash'
import { scrollToTop } from '../utils/scrollRestoration'
import { RoomSelectionProvider } from '../contexts/RoomSelectionProvider'
import Navbar from './Navbar'
import Footer from './Footer'
import Breadcrumbs from './Breadcrumbs'
import PageMeta from './PageMeta'
import RouteSchema from './RouteSchema'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  useEffect(() => {
    scrollToTop()
  }, [location])

  useEffect(() => {
    dismissHeroSplashForRoute(location.pathname)
  }, [location.pathname])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRoomRates()
    }, 8000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <RoomSelectionProvider>
      <div className="min-h-screen flex flex-col">
      <PageMeta />
      <RouteSchema />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-resort-heading focus:text-white focus:rounded-lg focus:shadow-lg"
        aria-label="Skip to main content"
      >
        Skip to main content
      </a>
      <Navbar />
      <main
        id="main-content"
        className={`flex-grow ${isHomePage ? '' : 'pt-24 md:pt-28'}`}
        role="main"
      >
        {!isHomePage && <Breadcrumbs />}
        {children}
      </main>
      <Footer />
      </div>
    </RoomSelectionProvider>
  )
}

export default Layout
