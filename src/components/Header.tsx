import { Menu, Settings, Bell } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
            title="Toggle Sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">QA Tool</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled
            className="p-2 opacity-50 cursor-not-allowed rounded-lg transition"
            aria-label="Notifications (Coming soon)"
            title="Feature coming soon"
          >
            <Bell className="w-5 h-5 text-gray-400" />
          </button>
          <button
            disabled
            className="p-2 opacity-50 cursor-not-allowed rounded-lg transition"
            aria-label="Settings (Coming soon)"
            title="Feature coming soon"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>
    </header>
  )
}
