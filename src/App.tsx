import { useState } from 'react'
import { Upload, Zap, BarChart3 } from 'lucide-react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import AIAnalysisPanel from './components/AIAnalysisPanel'
import { ModernTranslationDashboard } from './components/ModernTranslationDashboard'

interface Segment {
  segment_id: string
  source_text: string
  target_text: string
  status: string
  source_language?: string
  target_language?: string
  file_path?: string
  source_plain_text?: string
  target_plain_text?: string
  source_inline_tags?: any[]
  target_inline_tags?: any[]
  metadata?: {
    match_quality?: number
    confirmation_status?: string
    segment_status?: string
    priority?: number
    context?: string
    domain?: string
    custom_attributes?: Record<string, any>
  }
  xliff_version?: string
  variant?: string
  match_percentage?: number
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)

  const handleFileUpload = async (fileInput: File | { name: string; size: number } | null) => {
    if (!fileInput || !(fileInput instanceof File)) {
      return
    }

    const file = fileInput as File
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('http://localhost:8000/api/files/parse', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUploadedFile({ name: file.name, size: file.size })

        // Map parsed segments to our interface with match percentage
        const parsedSegments = data.segments.map((seg: any) => ({
          segment_id: seg.segment_id,
          source_text: seg.source_text,
          target_text: seg.target_text,
          status: seg.status,
          source_language: seg.source_language,
          target_language: seg.target_language,
          file_path: seg.file_path,
          source_plain_text: seg.source_plain_text,
          target_plain_text: seg.target_plain_text,
          source_inline_tags: seg.source_inline_tags,
          target_inline_tags: seg.target_inline_tags,
          metadata: seg.metadata,
          xliff_version: seg.xliff_version,
          variant: seg.variant,
          match_percentage: seg.metadata?.match_quality || 0,
        }))
        setSegments(parsedSegments)
        setShowDashboard(true)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  if (showDashboard && segments.length > 0) {
    return (
      <div className="w-full">
        <div className="fixed top-4 left-4 z-50 flex gap-2">
          <button
            onClick={() => setShowDashboard(false)}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
          >
            ← Geri
          </button>
          {segments.length > 0 && (
            <button
              onClick={() => setShowAIAnalysis(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <Zap size={16} /> AI Analiz
            </button>
          )}
        </div>
        <ModernTranslationDashboard segments={segments} />
      </div>
    )
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
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDashboard(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                    >
                      <BarChart3 size={18} />
                      Dashboard
                    </button>
                    <button
                      onClick={() => setShowAIAnalysis(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                    >
                      <Zap size={18} />
                      AI Analiz Başlat
                    </button>
                  </div>
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
