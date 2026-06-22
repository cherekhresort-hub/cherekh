import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../components/Button'
import { FaHome, FaSearch, FaArrowLeft } from 'react-icons/fa'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-resort-bg px-4 py-20">
      <div className="max-w-2xl w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-9xl font-serif text-resort-heading mb-4">404</h1>
          <h2 className="text-4xl md:text-5xl font-serif text-resort-heading mb-6">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. 
            Let's get you back on track.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button to="/" variant="primary" className="flex items-center justify-center gap-2">
              <FaHome className="w-4 h-4" />
              Go to Homepage
            </Button>
            <button
              onClick={() => window.history.back()}
              className="px-8 py-3 rounded-full font-medium transition-all duration-200 border-2 border-resort-heading text-resort-heading hover:bg-resort-heading hover:text-white flex items-center justify-center gap-2"
            >
              <FaArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          </div>

          <div className="bg-cream rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-serif text-resort-heading mb-4">
              Popular Pages
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/rooms"
                className="p-4 bg-resort-bg rounded-lg hover:bg-resort-heading hover:text-white transition-colors"
              >
                <FaSearch className="w-5 h-5 mx-auto mb-2" />
                <p className="font-medium">Rooms & Suites</p>
              </Link>
              <Link
                to="/conference-room"
                className="p-4 bg-resort-bg rounded-lg hover:bg-resort-heading hover:text-white transition-colors"
              >
                <FaSearch className="w-5 h-5 mx-auto mb-2" />
                <p className="font-medium">Conference Room</p>
              </Link>
              <Link
                to="/dining"
                className="p-4 bg-resort-bg rounded-lg hover:bg-resort-heading hover:text-white transition-colors"
              >
                <FaSearch className="w-5 h-5 mx-auto mb-2" />
                <p className="font-medium">Dining</p>
              </Link>
              <Link
                to="/contact"
                className="p-4 bg-resort-bg rounded-lg hover:bg-resort-heading hover:text-white transition-colors"
              >
                <FaSearch className="w-5 h-5 mx-auto mb-2" />
                <p className="font-medium">Contact Us</p>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default NotFound

