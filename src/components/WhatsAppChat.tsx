import { useState, useEffect } from 'react'
import { FaWhatsapp, FaTimes } from 'react-icons/fa'
import { useResortContact } from '../contexts/SiteSettingsProvider'

interface WhatsAppChatProps {
  phoneNumber?: string
  message?: string
  position?: 'bottom-right' | 'bottom-left'
}

const DEFAULT_MESSAGE = 'Hello! I would like to know more about booking at Cherekh Center.'

const WhatsAppChat = ({
  phoneNumber,
  message = DEFAULT_MESSAGE,
  position = 'bottom-right'
}: WhatsAppChatProps) => {
  const contact = useResortContact()
  const resolvedPhone = phoneNumber ?? contact.phoneE164
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    // Show chat button after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const handleWhatsAppClick = () => {
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${resolvedPhone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  if (!isVisible) return null

  return (
    <div className={`fixed ${position === 'bottom-right' ? 'bottom-6 right-6' : 'bottom-6 left-6'} z-50`}>
      {isOpen ? (
        <div className="bg-cream rounded-2xl shadow-2xl w-80 overflow-hidden border border-gray-200">
          <div className="bg-[#25D366] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center">
                <FaWhatsapp className="w-6 h-6 text-[#25D366]" />
              </div>
              <div>
                <p className="font-semibold">Cherekh Center</p>
                <p className="text-sm text-white/90">Typically replies within minutes</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-white/80 transition-colors"
              aria-label="Close chat"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 bg-sand-50">
            <p className="text-gray-700 mb-4">
              Hi! 👋 How can we help you with your booking?
            </p>
            <button
              onClick={handleWhatsAppClick}
              className="w-full bg-[#25D366] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#20BA5A] transition-colors flex items-center justify-center gap-2"
            >
              <FaWhatsapp className="w-5 h-5" />
              Start Conversation
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Click to open WhatsApp
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#25D366] text-white w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110"
          aria-label="Open WhatsApp chat"
        >
          <FaWhatsapp className="w-8 h-8" />
        </button>
      )}
    </div>
  )
}

export default WhatsAppChat

