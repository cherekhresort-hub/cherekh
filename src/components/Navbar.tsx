import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import MobileMenu from './MobileMenu'
import BookNowNavButton from './BookNowNavButton'
import { useRoomSelection } from '../contexts/RoomSelectionProvider'
import { saveSelectedRoomsHint, buildBookingUrl } from '../utils/roomSelection'

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedCount, selectedList, searchDates, clear } = useRoomSelection()
  const isHomePage = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location])

  const navLinks = [
    { path: '/about', label: 'About' },
    { path: '/rooms', label: 'Rooms & Suites' },
    { path: '/conference-room', label: 'Conference Room' },
    { path: '/dining', label: 'Dining' },
    { path: '/experiences', label: 'Experiences' },
    { path: '/contact', label: 'Contact' },
  ]

  const handleBookNow = () => {
    if (selectedList.length > 0) {
      saveSelectedRoomsHint({
        roomIds: selectedList,
        checkIn: searchDates?.checkIn,
        checkOut: searchDates?.checkOut,
        adults: searchDates?.guests,
        children: 0,
      })
      clear()
    }
    navigate(buildBookingUrl(searchDates))
  }

  const logoClassName = `h-full w-full object-contain object-left transition-all duration-300 ${
    isHomePage && !isScrolled ? 'brightness-0 invert' : ''
  }`

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isHomePage
            ? isScrolled
              ? 'bg-resort-bg/95 backdrop-blur-md shadow-md'
              : 'bg-transparent'
            : 'bg-resort-bg/95 backdrop-blur-md shadow-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile: logo | book now (when selected) | menu */}
          <div className="grid h-24 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:hidden">
            <Link
              to="/"
              className="flex h-20 w-full max-w-[9.5rem] items-center justify-self-start"
              aria-label="Cherekh Center Homepage"
            >
              <img
                src="/images/CherekhLogoFinal.svg"
                alt="Cherekh Center Logo"
                width={160}
                height={80}
                className={logoClassName}
              />
            </Link>

            <div className="flex justify-center">
              {selectedCount > 0 && (
                <BookNowNavButton
                  onClick={handleBookNow}
                  selectedCount={selectedCount}
                  size="compact"
                />
              )}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`justify-self-end p-2 transition-colors duration-300 ${
                isHomePage && !isScrolled ? 'text-white' : 'text-resort-heading'
              }`}
              aria-label="Open mobile menu"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          {/* Desktop: logo | nav links | book now */}
          <div className="hidden h-28 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 lg:gap-5 md:grid">
            <Link
              to="/"
              className="flex h-20 w-32 shrink-0 items-center lg:h-24 lg:w-36"
              aria-label="Cherekh Center Homepage"
            >
              <img
                src="/images/CherekhLogoFinal.svg"
                alt="Cherekh Center Logo"
                width={160}
                height={80}
                className={logoClassName}
              />
            </Link>

            <div className="flex min-w-0 items-center justify-center gap-x-3 lg:gap-x-5 xl:gap-x-7">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`whitespace-nowrap text-xs font-medium transition-colors duration-200 lg:text-sm ${
                    location.pathname === link.path
                      ? isHomePage && !isScrolled
                        ? 'text-white border-b-2 border-white'
                        : 'text-resort-heading border-b-2 border-resort-heading'
                      : isHomePage && !isScrolled
                        ? 'text-white/90 hover:text-white'
                        : 'text-resort-heading/80 hover:text-resort-heading'
                  }`}
                  aria-current={location.pathname === link.path ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <BookNowNavButton
              onClick={handleBookNow}
              selectedCount={selectedCount}
              size="desktop"
            />
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <MobileMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            navLinks={navLinks}
            currentPath={location.pathname}
            selectedCount={selectedCount}
            onBookNow={handleBookNow}
          />
        )}
      </AnimatePresence>
    </>
  )
}

export default Navbar
