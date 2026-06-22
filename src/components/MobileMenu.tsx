import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import BookNowNavButton from './BookNowNavButton'

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  navLinks: Array<{ path: string; label: string }>
  currentPath: string
  selectedCount: number
  onBookNow: () => void
}

const MobileMenu = ({
  onClose,
  navLinks,
  currentPath,
  selectedCount,
  onBookNow,
}: MobileMenuProps) => {
  const handleBookNow = () => {
    onClose()
    onBookNow()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 md:hidden"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3 }}
        className="absolute right-0 top-0 bottom-0 w-64 bg-resort-bg shadow-xl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-serif text-resort-heading">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 text-resort-heading"
              aria-label="Close menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-6 py-8 space-y-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={`block py-3 text-lg font-medium transition-colors ${
                  currentPath === link.path
                    ? 'text-resort-heading border-l-4 border-resort-heading pl-4'
                    : 'text-gray-700 hover:text-resort-heading pl-4'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {selectedCount === 0 && (
              <BookNowNavButton
                onClick={handleBookNow}
                selectedCount={0}
                fullWidth
                className="mt-8"
              />
            )}
          </nav>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default MobileMenu

