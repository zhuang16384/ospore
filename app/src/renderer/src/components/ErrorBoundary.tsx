import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Renderer safety net: a render-time exception in any component degrades to
 * this message instead of a white screen.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Ospore Renderer] Uncaught render error:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-8">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="max-w-md text-text-secondary">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
