/**
 * Rate Limiter Utility
 * Provides client-side rate limiting for form submissions and API calls
 */

/** Set VITE_DISABLE_RATE_LIMIT=true in .env.local to bypass (e.g. while testing login). */
export const isRateLimitingEnabled = (): boolean =>
  import.meta.env.VITE_DISABLE_RATE_LIMIT !== 'true'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  key: string
}

interface RateLimitRecord {
  count: number
  resetTime: number
}

class RateLimiter {
  private storage: Map<string, RateLimitRecord> = new Map()
  private readonly STORAGE_KEY = 'rate_limit_records'

  constructor() {
    this.loadFromStorage()
    // Clean up expired records every minute
    setInterval(() => this.cleanup(), 60000)
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        const now = Date.now()
        Object.entries(data).forEach(([key, record]: [string, any]) => {
          if (record.resetTime > now) {
            this.storage.set(key, record)
          }
        })
      }
    } catch (error) {
      console.error('Failed to load rate limit records:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return
    
    try {
      const data: Record<string, RateLimitRecord> = {}
      this.storage.forEach((value, key) => {
        data[key] = value
      })
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save rate limit records:', error)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    
    this.storage.forEach((record, key) => {
      if (record.resetTime <= now) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.storage.delete(key))
    if (keysToDelete.length > 0) {
      this.saveToStorage()
    }
  }

  /**
   * Check if a request is allowed
   * @param config Rate limit configuration
   * @returns Object with allowed status and remaining requests
   */
  checkLimit(config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const key = config.key
    const record = this.storage.get(key)

    // If no record or record expired, create new one
    if (!record || record.resetTime <= now) {
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + config.windowMs,
      }
      this.storage.set(key, newRecord)
      this.saveToStorage()
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newRecord.resetTime,
      }
    }

    // Check if limit exceeded
    if (record.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      }
    }

    // Increment count
    record.count++
    this.storage.set(key, record)
    this.saveToStorage()

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.storage.delete(key)
    this.saveToStorage()
  }

  /**
   * Get remaining requests for a key
   */
  getRemaining(key: string): number {
    const record = this.storage.get(key)
    if (!record || record.resetTime <= Date.now()) {
      return 0
    }
    return record.count
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter()

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  // Booking form: 30 submissions per hour
  BOOKING_FORM: {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
    key: 'booking_form',
  },
  // Contact form: 10 submissions per hour
  CONTACT_FORM: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    key: 'contact_form',
  },
  // Admin login: 5 attempts per 15 minutes
  ADMIN_LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    key: 'admin_login',
  },
  // General API calls: 100 per minute
  API_CALLS: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    key: 'api_calls',
  },
} as const

/**
 * Hook-like function to check rate limit before action
 */
export const withRateLimit = async <T>(
  config: RateLimitConfig,
  action: () => Promise<T> | T
): Promise<T> => {
  if (!isRateLimitingEnabled()) {
    return await action()
  }

  const check = rateLimiter.checkLimit(config)
  
  if (!check.allowed) {
    const resetDate = new Date(check.resetTime)
    throw new Error(
      `Rate limit exceeded. Please try again after ${resetDate.toLocaleTimeString()}.`
    )
  }

  try {
    return await action()
  } catch (error) {
    // On error, don't count towards rate limit
    rateLimiter.reset(config.key)
    throw error
  }
}

/**
 * Throttle function to limit function calls
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCall

    if (timeSinceLastCall >= delay) {
      lastCall = now
      func(...args)
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now()
        func(...args)
      }, delay - timeSinceLastCall)
    }
  }
}

/**
 * Debounce function to delay function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

