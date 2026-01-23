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
  const [showDashboard, setShowDashboard] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [qaRunning, setQARunning] = useState(false)
  const [qaResults, setQAResults] = useState<any>(null)

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

      // Validate file size before upload
      const MAX_SIZE = 50 * 1024 * 1024 // 50MB
      if (file.size > MAX_SIZE) {
        setError(`File too large. Maximum size: 50MB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      // Make API request with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

      let response: Response
      try {
        response = await fetch(API_ENDPOINTS.PARSE, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
      } catch (fetchErr) {
        clearTimeout(timeoutId)
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          throw new Error('Request timed out. The server took too long to respond. Please check your network connection and try again.')
        }
        throw new Error(`Network error: Unable to connect to server at ${API_ENDPOINTS.PARSE}. Please check your internet connection and ensure the backend is running.`)
      }

      clearTimeout(timeoutId)

      // Handle HTTP errors
      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: 'Unknown error' }
        }

        const statusMessages: Record<number, string> = {
          400: `Invalid file: ${errorData.error || 'File format or content is invalid'}`,
          413: `File too large: ${errorData.error || 'Maximum file size exceeded'}`,
          500: 'Server error: The backend encountered an error processing your file',
        }

        const message = statusMessages[response.status] || `Upload failed (HTTP ${response.status}): ${errorData.error || 'Please try again'}`
        throw new Error(message)
      }

      const data = await response.json()

      // Validate response format
      if (!data?.segments || !Array.isArray(data.segments)) {
        throw new Error('Invalid response from server: Server returned unexpected format')
      }

      if (data.segments.length === 0) {
        throw new Error('No translatable segments found in file. Please ensure the file contains valid translation content.')
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

  const handleRunQA = async () => {
    if (segments.length === 0) {
      setError('No segments to check')
      return
    }

    setQARunning(true)
    setError(null)

    try {
      const response = await fetch(API_ENDPOINTS.QA_CHECK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segments: segments.map(s => ({
          segment_id: s.segment_id,
          source_text: s.source_text,
          target_text: s.target_text,
          status: s.status,
          source_language: s.source_language,
          target_language: s.target_language
        }))}),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'QA check failed')
      }

      const results = await response.json()
      console.log('QA results:', results)
      setQAResults(results)
      setError(null) // Clear any previous errors
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'QA check failed'
      setError(msg)
      console.error('QA error:', err)
    } finally {
      setQARunning(false)
    }
  }

  if (showDashboard && segments.length > 0) {
    return (
      <div className="w-full">
        <div className="fixed top-8 left-8 z-50 flex gap-3">
          <button
            onClick={() => setShowDashboard(false)}
            className="group relative px-5 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-lg transition font-medium border border-white/10 hover:border-white/20 flex items-center gap-2"
          >
            <span>←</span>
            <span>Back</span>
          </button>
          {segments.length > 0 && (
            <>
              <button
                onClick={handleRunQA}
                disabled={qaRunning}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {qaRunning ? 'QA Running...' : '▣ Run QA Check'}
              </button>
              <button
                onClick={() => setShowAIAnalysis(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
              >
                <Zap size={16} /> AI Analiz
              </button>
            </>
          )}
        </div>
        <ModernTranslationDashboard segments={segments} qaResults={qaResults} />
        {qaResults && (
          <div className="fixed bottom-8 right-8 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-40">
            ✓ QA Check Complete: {qaResults.total_issues} issues found
          </div>
        )}
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
      <div className="flex h-screen bg-black text-white overflow-hidden">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

          {/* Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="min-h-full bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-8">
              <div className="max-w-6xl mx-auto">
                {/* Hero Section */}
                <div className="mb-16 animate-fade-in-up">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl glow-effect">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text">
                        TRANSLATION QA PLATFORM
                      </span>
                      <h1 className="text-sm font-semibold text-slate-400">Version 1.0</h1>
                    </div>
                  </div>
                  <h1 className="text-6xl font-bold mb-4 gradient-text drop-shadow-2xl">
                    Professional Quality Assurance
                  </h1>
                  <p className="text-xl text-slate-300 mb-2 font-light">
                    Enterprise-grade translation analysis with AI-powered insights
                  </p>
                  <p className="text-sm text-slate-500">
                    16+ automated checks • Multi-format support • Real-time analysis • 99.9% accuracy
                  </p>
                </div>
              </div>

              {/* Error Message Display */}
              {error && (
                <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-red-900/30 to-red-800/30 border border-red-600/50 flex items-start gap-4 animate-fade-in-up glow-effect" style={{ boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}>
                  <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <h3 className="font-bold text-red-300 text-lg">Upload Error</h3>
                    <p className="text-red-100 text-sm mt-1 leading-relaxed">{error}</p>
                    <p className="text-red-200/60 text-xs mt-3">Tip: Make sure the file format is supported and the backend is running at {API_ENDPOINTS.PARSE}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0 text-2xl transition-colors"
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
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-purple-500/5 to-white/5 backdrop-blur-xl p-8 glow-effect animate-slide-in-right">
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h2 className="text-3xl font-bold text-white mb-2">File Analysis Complete</h2>
                        <p className="text-slate-300">Processing: <span className="text-purple-300 font-semibold font-mono">{uploadedFile.name}</span></p>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null)
                          setSegments([])
                          setShowDashboard(false)
                          setError(null)
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white rounded-lg transition font-medium border border-white/10 hover:border-white/20"
                      >
                        ↻ Upload New File
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                      {/* File Name */}
                      <div className="group p-5 rounded-xl bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 hover:border-blue-400/60 transition-all hover:bg-blue-900/40">
                        <p className="text-xs font-bold text-blue-300 mb-2 uppercase tracking-wider">File Name</p>
                        <p className="text-lg font-bold text-white break-all group-hover:text-blue-100 transition-colors font-mono text-sm">{uploadedFile.name}</p>
                      </div>

                      {/* File Size */}
                      <div className="group p-5 rounded-xl bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 hover:border-purple-400/60 transition-all hover:bg-purple-900/40">
                        <p className="text-xs font-bold text-purple-300 mb-2 uppercase tracking-wider">File Size</p>
                        <p className="text-lg font-bold text-white group-hover:text-purple-100 transition-colors">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                      </div>

                      {/* Segments Count */}
                      <div className="group p-5 rounded-xl bg-gradient-to-br from-pink-900/30 to-pink-800/20 border border-pink-500/30 hover:border-pink-400/60 transition-all hover:bg-pink-900/40">
                        <p className="text-xs font-bold text-pink-300 mb-2 uppercase tracking-wider">Segments</p>
                        <p className="text-lg font-bold text-white group-hover:text-pink-100 transition-colors">{segments.length}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {segments.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          onClick={() => setShowDashboard(true)}
                          disabled={isLoading}
                          className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:via-blue-400 hover:to-cyan-400 text-white rounded-xl font-bold transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-white/20 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-500 -translate-x-full" />
                          <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="relative z-10">Quality Dashboard</span>
                        </button>
                        <button
                          onClick={() => setShowAIAnalysis(true)}
                          disabled={isLoading}
                          className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:from-purple-500 hover:via-pink-400 hover:to-red-400 text-white rounded-xl font-bold transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 border border-white/20 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full transition-transform duration-500 -translate-x-full" />
                          <Zap size={20} className="relative z-10" />
                          <span className="relative z-10">AI Analysis</span>
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
    <div className={`group relative rounded-2xl bg-gradient-to-br ${color} p-6 text-white transition-all transform hover:scale-105 border border-white/15 hover:border-white/30 overflow-hidden`}>
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500" />

      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <div className="text-5xl drop-shadow-lg opacity-90 group-hover:opacity-100 transition-opacity">{icon}</div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-white/70 group-hover:text-white/90 transition-colors uppercase tracking-wider">{label}</p>
            <p className="text-4xl font-bold mt-2 drop-shadow-lg group-hover:scale-110 transition-transform origin-left">{value}</p>
          </div>
        </div>
      </div>

      {/* Shadow effect */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10 ${color}`} />
    </div>
  )
}

interface InfoPanelProps {
  title: string
  description: string
}

function InfoPanel({ title, description }: InfoPanelProps) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-xl p-8 hover:border-white/20 transition-all transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 cursor-default overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all rounded-2xl" />

      <div className="relative z-10">
        <h3 className="text-xl font-bold text-white mb-3 group-hover:gradient-text transition-all duration-300">{title}</h3>
        <p className="text-slate-300 text-sm leading-relaxed group-hover:text-slate-200 transition-colors">{description}</p>
      </div>
    </div>
  )
}

export default App
