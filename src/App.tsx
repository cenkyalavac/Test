import { useState } from 'react'
import { Upload, Zap, BarChart3, AlertCircle } from 'lucide-react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import AIAnalysisPanel from './components/AIAnalysisPanel'
import { ModernTranslationDashboard } from './components/ModernTranslationDashboard'
import ErrorBoundary from './components/ErrorBoundary'
import { API_ENDPOINTS } from './config'

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
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleFileUpload = async (fileInput: File | { name: string; size: number } | null) => {
    // Reset state
    setError(null)
    setIsLoading(true)

    try {
      // Validate input
      if (!fileInput || !(fileInput instanceof File)) {
        setError('Please select a valid file')
        return
      }

      const file = fileInput as File
      const formData = new FormData()
      formData.append('file', file)

      // Make API request
      const response = await fetch(API_ENDPOINTS.PARSE, {
        method: 'POST',
        body: formData,
      })

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()

      // Validate response format
      if (!data?.segments || !Array.isArray(data.segments)) {
        throw new Error('Invalid response from server: missing segments')
      }

      // Type-safe segment mapping
      const parsedSegments: Segment[] = data.segments.map((seg: any) => ({
        segment_id: seg.segment_id ?? 'unknown',
        source_text: seg.source_text ?? '',
        target_text: seg.target_text ?? '',
        status: seg.status ?? 'unknown',
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
        match_percentage: seg.metadata?.match_quality ?? 0,
      }))

      setUploadedFile({ name: file.name, size: file.size })
      setSegments(parsedSegments)
      setShowDashboard(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('File upload error:', err)
    } finally {
      setIsLoading(false)
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
    <ErrorBoundary>
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
                <p className="text-gray-400">Find and verify errors in bilingual translation files</p>
              </div>

              {/* Error Message Display */}
              {error && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-300">Error</h3>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* File Upload Area */}
              <FileUpload
                onFileSelect={(file) => {
                  if (file && !isLoading) handleFileUpload(file)
                }}
              />

              {/* File Info Display */}
              {uploadedFile && (
                <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-500" />
                    Uploaded File Information
                  </h2>
                  <div className="grid grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-gray-400 text-sm mb-1">File Name</p>
                      <p className="text-lg font-semibold text-white break-all">{uploadedFile.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">File Size</p>
                      <p className="text-lg font-semibold text-white">
                        {(uploadedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Segments</p>
                      <p className="text-lg font-semibold text-white">{segments.length}</p>
                    </div>
                  </div>

                  {segments.length > 0 && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDashboard(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      >
                        <BarChart3 size={18} />
                        Dashboard
                      </button>
                      <button
                        onClick={() => setShowAIAnalysis(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isLoading}
                      >
                        <Zap size={18} />
                        Start AI Analysis
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
