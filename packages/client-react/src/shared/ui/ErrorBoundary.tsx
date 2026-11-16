import { Component, ErrorInfo, ReactNode } from 'react'
import { i18n } from '@/shared/i18n'
import { ErrorHandler, ErrorType } from '@/shared/utils/errorHandler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the entire application
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using our centralized error handler
    const gameError = ErrorHandler.createError(
      ErrorType.UNKNOWN,
      error,
      undefined,
      { 
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    )

    ErrorHandler.logError(gameError, 'ErrorBoundary')

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div role="alert" style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid #ff4444',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#cc0000'
        }}>
          <h1>{i18n.t('errorBoundary.title')}</h1>
          <p>{i18n.t('errorBoundary.message')}</p>
          <details style={{ marginTop: '10px' }}>
            <summary>{i18n.t('errorBoundary.details')}</summary>
            <pre style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#4444ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {i18n.t('errorBoundary.reload')}
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
