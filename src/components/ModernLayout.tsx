import React from 'react'
import { Activity, Settings, HelpCircle } from 'lucide-react'

interface ModernLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export const ModernLayout: React.FC<ModernLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">TranslateQA</h1>
                <p className="text-xs text-slate-500">Professional Quality Assurance</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900">
                <HelpCircle size={20} />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Title */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">{title}</h2>
          {subtitle && <p className="text-slate-600">{subtitle}</p>}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>© 2024 TranslateQA. Professional Translation Quality Assurance.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-900 transition">Documentation</a>
              <a href="#" className="hover:text-slate-900 transition">Support</a>
              <a href="#" className="hover:text-slate-900 transition">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
