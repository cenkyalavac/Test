import { FileText, CheckCircle, AlertCircle, BarChart3, Settings, HelpCircle } from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const menuItems = [
    { icon: FileText, label: 'Dosya Yükleme', id: 'upload' },
    { icon: CheckCircle, label: 'Doğrulama', id: 'validation' },
    { icon: AlertCircle, label: 'Hatalar', id: 'errors' },
    { icon: BarChart3, label: 'Raporlar', id: 'reports' },
  ]

  const bottomMenuItems = [
    { icon: Settings, label: 'Ayarlar', id: 'settings' },
    { icon: HelpCircle, label: 'Yardım', id: 'help' },
  ]

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-0'
      } bg-gray-800 border-r border-gray-700 overflow-hidden transition-all duration-300 flex flex-col`}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-white font-bold text-lg whitespace-nowrap">Translation QA</h2>
        <p className="text-gray-400 text-xs mt-1 whitespace-nowrap">v1.0</p>
      </div>

      {/* Main Menu */}
      <nav className="flex-1 px-4 py-6">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition whitespace-nowrap">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Menu */}
      <nav className="px-4 py-6 border-t border-gray-700">
        <ul className="space-y-2">
          {bottomMenuItems.map((item) => (
            <li key={item.id}>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition whitespace-nowrap">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
