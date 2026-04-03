import type { ReactNode } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface AppShellProps {
  children: ReactNode
  error?: string | null
  success?: string | null
  onErrorClose?: () => void
  onSuccessClose?: () => void
}

export const AppShell = ({
  children,
  error,
  success,
  onErrorClose,
  onSuccessClose,
}: AppShellProps) => {
  return (
    <div className="flex h-screen bg-slate-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-950">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-4 right-4 space-y-3 z-50 max-w-sm">
        {/* Error Notification */}
        {error && (
          <div className="flex items-start gap-3 bg-red-950/80 border border-red-900 rounded-lg p-4 backdrop-blur-sm">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-100">{error}</p>
            </div>
            {onErrorClose && (
              <button
                onClick={onErrorClose}
                className="text-red-400 hover:text-red-300 flex-shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Success Notification */}
        {success && (
          <div className="flex items-start gap-3 bg-green-950/80 border border-green-900 rounded-lg p-4 backdrop-blur-sm">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-green-100">{success}</p>
            </div>
            {onSuccessClose && (
              <button
                onClick={onSuccessClose}
                className="text-green-400 hover:text-green-300 flex-shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
