/**
 * CSRF Protection Utility
 * Provides CSRF token generation and validation
 */

import { SITE_ORIGIN, SITE_WWW_ORIGIN } from '../data/siteConfig'

const CSRF_TOKEN_KEY = 'csrf_token'
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface CSRFToken {
  token: string
  expiresAt: number
}

/**
 * Generate a secure random token
 */
const generateToken = (): string => {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback for environments without crypto API
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Get or generate CSRF token
 */
export const getCSRFToken = (): string => {
  if (typeof window === 'undefined') return ''

  try {
    const stored = localStorage.getItem(CSRF_TOKEN_KEY)
    if (stored) {
      const tokenData: CSRFToken = JSON.parse(stored)
      const now = Date.now()

      // If token is still valid, return it
      if (tokenData.expiresAt > now) {
        return tokenData.token
      }
    }

    // Generate new token
    const newToken = generateToken()
    const tokenData: CSRFToken = {
      token: newToken,
      expiresAt: Date.now() + CSRF_TOKEN_EXPIRY,
    }

    localStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData))
    return newToken
  } catch (error) {
    console.error('Failed to get CSRF token:', error)
    return generateToken()
  }
}

/**
 * Validate CSRF token
 */
const validateCSRFToken = (token: string): boolean => {
  if (typeof window === 'undefined') return false

  try {
    const stored = localStorage.getItem(CSRF_TOKEN_KEY)
    if (!stored) return false

    const tokenData: CSRFToken = JSON.parse(stored)
    const now = Date.now()

    // Check if token is expired
    if (tokenData.expiresAt <= now) {
      return false
    }

    // Validate token matches
    return tokenData.token === token
  } catch (error) {
    console.error('Failed to validate CSRF token:', error)
    return false
  }
}

/**
 * Check if request origin is valid (additional CSRF protection)
 */
const isValidOrigin = (): boolean => {
  if (typeof window === 'undefined') return true

  const origin = window.location.origin
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    SITE_ORIGIN,
    SITE_WWW_ORIGIN,
  ]

  return allowedOrigins.includes(origin)
}

/**
 * Validate referrer header (for form submissions)
 */
const validateReferrer = (): boolean => {
  if (typeof window === 'undefined') return true

  const referrer = document.referrer
  const currentOrigin = window.location.origin

  // Allow same-origin requests
  if (referrer.startsWith(currentOrigin)) {
    return true
  }

  // Allow empty referrer (direct navigation)
  if (!referrer) {
    return true
  }

  // Block cross-origin form submissions
  return false
}

/**
 * Create a form with CSRF protection
 */
export const createProtectedFormData = (formData: FormData | Record<string, any>): FormData | Record<string, any> => {
  const token = getCSRFToken()
  
  if (formData instanceof FormData) {
    formData.append('_csrf', token)
    return formData
  }

  return {
    ...formData,
    _csrf: token,
  }
}

/**
 * Validate form submission with CSRF check
 */
export const validateFormSubmission = (formData: FormData | Record<string, any>): boolean => {
  // Check origin
  if (!isValidOrigin()) {
    console.error('Invalid origin for form submission')
    return false
  }

  // Check referrer
  if (!validateReferrer()) {
    console.error('Invalid referrer for form submission')
    return false
  }

  // Check CSRF token
  let token: string | null = null
  if (formData instanceof FormData) {
    token = formData.get('_csrf') as string
  } else {
    token = formData._csrf
  }

  if (!token || !validateCSRFToken(token)) {
    console.error('Invalid or missing CSRF token')
    return false
  }

  return true
}
