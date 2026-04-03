import { LayoutDashboard, FileText } from 'lucide-react'

export const Sidebar = () => {
  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-white font-semibold text-sm">Translation</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            // Navigation handled by App.tsx
          }}
          className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-sm font-medium">Dashboard</span>
        </a>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            // Navigation handled by App.tsx
          }}
          className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <FileText className="w-5 h-5" />
          <span className="text-sm font-medium">Treneler</span>
        </a>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="text-xs text-slate-400">
          <p className="font-medium text-slate-300 mb-1">Translation QA</p>
          <p>v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
