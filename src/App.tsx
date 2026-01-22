import { useState } from 'react'
import { Upload, Zap } from 'lucide-react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import AIAnalysisPanel from './components/AIAnalysisPanel'

interface Segment {
  segment_id: string
  source_text: string
  target_text: string
  status: string
  source_language?: string
  target_language?: string
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)

  const handleFileUpload = async (fileInput: File | { name: string; size: number } | null) => {
    if (!fileInput || !(fileInput instanceof File)) {
      return
    }

    const file = fileInput as File
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:5000/api/files/parse', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUploadedFile({ name: file.name, size: file.size })

        // Map parsed segments to our interface
        const parsedSegments = data.segments.map((seg: any) => ({
          segment_id: seg.segment_id,
          source_text: seg.source_text,
          target_text: seg.target_text,
          status: seg.status,
          source_language: seg.source_language,
          target_language: seg.target_language,
        }))
        setSegments(parsedSegments)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  if (showAIAnalysis && segments.length > 0) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AIAnalysisPanel
          segments={segments}
          onClose={() => setShowAIAnalysis(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Translation QA Tool</h1>
              <p className="text-gray-400">Bilingual çeviri dosyalarındaki hataları bulun ve kontrol edin</p>
            </div>

            {/* File Upload Area */}
            <FileUpload onFileSelect={(file) => {
              if (file) handleFileUpload(file)
            }} />

            {/* File Info Display */}
            {uploadedFile && (
              <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-500" />
                  Yüklenen Dosya Bilgisi
                </h2>
                <div className="grid grid-cols-3 gap-6 mb-6">
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
                  <div>
                    <p className="text-gray-400 text-sm mb-1">Segmentler</p>
                    <p className="text-lg font-semibold text-white">{segments.length}</p>
                  </div>
                </div>

                {segments.length > 0 && (
                  <button
                    onClick={() => setShowAIAnalysis(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                  >
                    <Zap size={18} />
                    AI Analiz Başlat
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
