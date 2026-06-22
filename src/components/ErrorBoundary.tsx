import { Component, ErrorInfo, ReactNode } from 'react'
import Button from './Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-resort-bg px-4">
          <div className="max-w-2xl w-full text-center">
            <div className="mb-8">
              <h1 className="text-6xl font-serif text-resort-heading mb-4">Oops!</h1>
              <h2 className="text-3xl font-serif text-resort-heading mb-4">
                Something went wrong
              </h2>
              <p className="text-lg text-gray-700 mb-6">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
              {this.state.error && import.meta.env.DEV && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <p className="text-sm text-red-800 font-mono">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button to="/" variant="primary">
                Go to Homepage
              </Button>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 rounded-full font-medium transition-all duration-200 border-2 border-resort-heading text-resort-heading hover:bg-resort-heading hover:text-white"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

