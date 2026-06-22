import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FaEye, FaEyeSlash, FaLock, FaUser } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthProvider'
import { withRateLimit, RateLimitPresets } from '../utils/rateLimiter'
import { getCSRFToken, validateFormSubmission, createProtectedFormData } from '../utils/csrf'

const Login = () => {
  const { isAuthenticated, loading: authLoading, signIn, usesSupabase } = useAuth()
  const loginDisabled = !usesSupabase && import.meta.env.PROD
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/admin', { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loginDisabled) {
      setError(
        'Admin login requires Supabase. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      )
      return
    }
    setError('')
    setLoading(true)

    const formData = { email, password }
    const protectedData = createProtectedFormData(formData)
    if (!validateFormSubmission(protectedData)) {
      setError('Security validation failed. Please refresh the page and try again.')
      setLoading(false)
      return
    }

    try {
      await withRateLimit(RateLimitPresets.ADMIN_LOGIN, async () => {
        const result = await signIn(email, password)
        if (result.error) {
          throw new Error(result.error)
        }
        navigate('/admin')
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('Rate limit exceeded')) {
        setError(message)
      } else {
        setError('Login failed. Please try again.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-resort-bg flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-cream rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-resort-heading rounded-full mb-4">
              <FaLock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-serif text-resort-heading mb-2">Admin Login</h1>
            <p className="text-gray-600">
              {usesSupabase
                ? 'Sign in with your Supabase admin account'
                : loginDisabled
                  ? 'Admin login requires Supabase. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.'
                  : 'Dev mode: use legacy credentials (Supabase not configured locally)'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="hidden" name="_csrf" value={getCSRFToken()} />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-resort-heading mb-2"
              >
                {usesSupabase ? 'Email' : 'Username'}
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type={usesSupabase ? 'email' : 'text'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-resort-heading mb-2"
              >
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-resort-cta focus:border-resort-cta"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-resort-heading transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <FaEyeSlash className="w-4 h-4" />
                  ) : (
                    <FaEye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || loginDisabled}
              className="w-full px-6 py-3 bg-resort-cta text-white rounded-lg hover:bg-resort-cta/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
