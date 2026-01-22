import { useState } from 'react'
import { Zap, AlertCircle } from 'lucide-react'
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
      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          {/* Content Area */}
          <main className="flex-1 overflow-auto p-8">
            <div className="max-w-6xl mx-auto">
              {/* Hero Section */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Translation QA Tool
                  </span>
                </div>
                <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Professional Translation Quality Assurance
                </h1>
                <p className="text-lg text-slate-300 mb-2">
                  Analyze translation files with 16+ QA checks, AI-powered predictions, and match percentage analysis
                </p>
                <p className="text-sm text-slate-400">
                  Supports XLIFF, PO, JSON, and translation packages (SDLXLIFF, MemoQ, etc.)
                </p>
              </div>

              {/* Error Message Display */}
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-red-900/20 border border-red-700 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-300">Error</h3>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0"
                    aria-label="Dismiss error"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* File Upload Area */}
              <div className="mb-12">
                <FileUpload
                  onFileSelect={(file) => {
                    if (file && !isLoading) handleFileUpload(file)
                  }}
                />
              </div>

              {/* File Info Display & Results */}
              {uploadedFile ? (
                <div className="space-y-6">
                  {/* File Info Card */}
                  <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-700/50 p-6 backdrop-blur-sm">
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-bold text-white mb-2">File Information</h2>
                        <p className="text-slate-300">Uploaded and analyzed: {uploadedFile.name}</p>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null)
                          setSegments([])
                          setShowDashboard(false)
                          setError(null)
                        }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                      >
                        Upload New File
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {/* File Name */}
                      <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                        <p className="text-xs font-semibold text-slate-400 mb-1">FILE NAME</p>
                        <p className="text-lg font-bold text-white break-all">{uploadedFile.name}</p>
                      </div>

                      {/* File Size */}
                      <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
                        <p className="text-xs font-semibold text-slate-400 mb-1">FILE SIZE</p>
                        <p className="text-lg font-bold text-white">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      </div>

                      {/* Segments Count */}
                      <div className="p-4 rounded-lg bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700/30">
                        <p className="text-xs font-semibold text-blue-300 mb-1">SEGMENTS</p>
                        <p className="text-lg font-bold text-blue-100">{segments.length}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {segments.length > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setShowDashboard(true)}
                          disabled={isLoading}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          Quality Dashboard
                        </button>
                        <button
                          onClick={() => setShowAIAnalysis(true)}
                          disabled={isLoading}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Zap size={18} />
                          AI Analysis
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Stats */}
                  {segments.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <QuickStatCard
                        label="Total Segments"
                        value={segments.length}
                        icon="📊"
                        color="from-blue-600 to-blue-700"
                      />
                      <QuickStatCard
                        label="Translated"
                        value={segments.filter(s => s.status === 'translated').length}
                        icon="✓"
                        color="from-green-600 to-green-700"
                      />
                      <QuickStatCard
                        label="Avg Match %"
                        value={Math.round(
                          segments.reduce((sum, s) => sum + (s.match_percentage || 0), 0) / segments.length
                        )}
                        icon="📈"
                        color="from-purple-600 to-purple-700"
                      />
                      <QuickStatCard
                        label="Perfect Matches"
                        value={segments.filter(s => s.match_percentage === 100).length}
                        icon="✨"
                        color="from-amber-600 to-amber-700"
                      />
                    </div>
                  )}
                </div>
              ) : (
                /* No File Uploaded - Show Info Panels */
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InfoPanel
                    title="🚀 Fast & Efficient"
                    description="Process translation files instantly with our advanced QA engine"
                  />
                  <InfoPanel
                    title="🔍 Comprehensive"
                    description="16+ quality checks including spelling, consistency, formatting, and more"
                  />
                  <InfoPanel
                    title="🤖 AI-Powered"
                    description="AI predictions using GPT-4 and Gemini for advanced error analysis"
                  />
                  <InfoPanel
                    title="📊 Match Analysis"
                    description="Extract and filter by match percentages from all XLIFF variants"
                  />
                  <InfoPanel
                    title="📦 Package Support"
                    description="Direct support for SDLXLIFF, MemoQ, and other translation packages"
                  />
                  <InfoPanel
                    title="🔒 Secure"
                    description="All processing happens locally - your files are never stored or shared"
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}

interface QuickStatCardProps {
  label: string
  value: number | string
  icon: string
  color: string
}

function QuickStatCard({ label, value, icon, color }: QuickStatCardProps) {
  return (
    <div className={`rounded-lg bg-gradient-to-br ${color} p-6 text-white shadow-lg hover:shadow-xl transition-all transform hover:scale-105`}>
      <div className="flex items-center gap-3">
        <div className="text-3xl">{icon}</div>
        <div>
          <p className="text-sm font-medium opacity-90">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

interface InfoPanelProps {
  title: string
  description: string
}

function InfoPanel({ title, description }: InfoPanelProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-6 hover:border-slate-600 hover:bg-slate-700/50 transition-all group">
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{description}</p>
    </div>
  )
}

export default App
