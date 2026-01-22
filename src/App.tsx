import { useState } from 'react'
import { Menu, X, Upload } from 'lucide-react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} menuOpen={sidebarOpen} />

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Translation QA Tool</h1>
              <p className="text-gray-400">Bilingual çeviri dosyalarındaki hataları bulun ve kontrol edin</p>
            </div>

            {/* File Upload Area */}
            <FileUpload onFileSelect={setUploadedFile} />

            {/* File Info Display */}
            {uploadedFile && (
              <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                  Yüklenen Dosya Bilgisi
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Dosya Adı</p>
                    <p className="text-lg font-semibold text-white break-all">{uploadedFile.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Dosya Boyutu</p>
                    <p className="text-lg font-semibold text-white">
                      {(uploadedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
