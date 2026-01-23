import { useState, useEffect, useRef } from 'react'
import { Zap, RotateCcw, AlertCircle, CheckCircle, Cloud, TrendingUp, AlertTriangle } from 'lucide-react'
import './App.css'
import ModernFileUpload from './components/ModernFileUpload'
import { LandingPagePro } from './components/LandingPagePro'
import { ModernTranslationDashboard } from './components/ModernTranslationDashboard'
import AIAnalysisPanel from './components/AIAnalysisPanel'
import ErrorBoundary from './components/ErrorBoundary'
import { API_ENDPOINTS } from './config'
import type { Segment, QAResults, QAMode } from './types'

function App() {
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [qaRunning, setQARunning] = useState(false)
  const [qaResults, setQAResults] = useState<QAResults | null>(null)
  const [qaMode, setQaMode] = useState<QAMode>('balanced')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [parserEngine, setParserEngine] = useState<'lxml' | 'translate-toolkit'>('lxml')
  const [qaChecker, setQaChecker] = useState<'advanced' | 'comprehensive'>('advanced')
  const [toolkitAvailable, setToolkitAvailable] = useState(false)

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const fetchParserConfig = async () => {
      try {
        const response = await fetch('/api/config/parsers')
        const data = await response.json()
        setToolkitAvailable(data.parsers['translate-toolkit'].available)
      } catch (err) {
        console.error('Error fetching parser config:', err)
      }
    }

    fetchParserConfig()
  }, [])

  const handleFileUpload = async (file: File) => {
    setError(null)
    setSuccessMessage(null)
    setIsLoading(true)
    setQAResults(null)
    setQARunning(false)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('parser_engine', parserEngine)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

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
          throw new Error('Request timed out. Please try again.')
        }
        throw new Error(`Network error. Please check your connection.`)
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: 'Unknown error' }
        }

        const statusMessages: Record<number, string> = {
          400: `Invalid file: ${errorData.error || 'Invalid format'}`,
          413: `File too large`,
          500: 'Server error',
        }

        const message = statusMessages[response.status] || `Upload failed: ${errorData.error || 'Please try again'}`
        throw new Error(message)
      }

      const data = await response.json()

      if (!data?.segments || !Array.isArray(data.segments)) {
        throw new Error('Invalid response from server')
      }

      if (data.segments.length === 0) {
        throw new Error('No translatable segments found in file.')
      }

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
        source_inline_tags: seg.source_inline_tags || [],
        target_inline_tags: seg.target_inline_tags || [],
        metadata: seg.metadata,
        xliff_version: seg.xliff_version,
        variant: seg.variant,
        match_percentage: seg.metadata?.match_quality ?? 0,
      }))

      setUploadedFile({ name: file.name, size: file.size })
      setSegments(parsedSegments)
      setSuccessMessage(`✓ Successfully uploaded ${file.name} with ${parsedSegments.length} segments`)

      setTimeout(() => setSuccessMessage(null), 5000)
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
        body: JSON.stringify({
          mode: qaMode,
          use_comprehensive: qaChecker === 'comprehensive',
          segments: segments
            .filter(s => s.source_text?.trim() || s.target_text?.trim())
            .map(s => ({
              segment_id: s.segment_id,
              source_text: s.source_text,
              target_text: s.target_text,
              status: s.status,
              source_language: s.source_language,
              target_language: s.target_language
            }))
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'QA check failed')
      }

      const results = await response.json()
      setQAResults(results)
      setSuccessMessage(`✓ QA check completed: ${results.total_issues} issues found`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'QA check failed'
      setError(msg)
      console.error('QA error:', err)
    } finally {
      setQARunning(false)
    }
  }

  if (showAIAnalysis && segments.length > 0) {
    return (
      <div className="flex h-screen bg-slate-950">
        <AIAnalysisPanel
          segments={segments}
          onClose={() => setShowAIAnalysis(false)}
        />
      </div>
    )
  }

  // QA Results showing - display ONLY the translation dashboard (full screen)
  if (qaResults && segments.length > 0) {
    return (
      <ErrorBoundary>
        <ModernTranslationDashboard
          segments={segments}
          qaResults={qaResults}
        />
      </ErrorBoundary>
    )
  }

  if (segments.length === 0) {
    return (
      <ErrorBoundary>
        <LandingPagePro
          onGetStarted={() => {
            const uploadSection = document.getElementById('upload-section')
            if (uploadSection) {
              uploadSection.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        />

        <div id="upload-section" className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6 py-20 relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-2000"></div>
          </div>

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">Upload & Analyze</h2>
              <p className="text-lg text-slate-400">Drag your translation file here to get instant QA results</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-12 border border-white/10">
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">{error}</div>
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">{successMessage}</div>
                </div>
              )}

              {/* Parser & QA Options */}
              <div className="mb-10 p-6 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Processing Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Parser Engine</label>
                    <select
                      value={parserEngine}
                      onChange={(e) => setParserEngine(e.target.value as 'lxml' | 'translate-toolkit')}
                      disabled={!toolkitAvailable && parserEngine === 'translate-toolkit'}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                    >
                      <option value="lxml" className="bg-slate-900">lxml Parser (Default)</option>
                      {toolkitAvailable && (
                        <option value="translate-toolkit" className="bg-slate-900">Translate-Toolkit (Alternative)</option>
                      )}
                    </select>
                    <p className="text-xs text-slate-400 mt-2">
                      {parserEngine === 'lxml'
                        ? 'Fast and reliable XML parser'
                        : 'Alternative parser for problematic files'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">QA Checker</label>
                    <select
                      value={qaChecker}
                      onChange={(e) => setQaChecker(e.target.value as 'advanced' | 'comprehensive')}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
                    >
                      <option value="advanced" className="bg-slate-900">Advanced QA (Default)</option>
                      <option value="comprehensive" className="bg-slate-900">Comprehensive QA (Strict)</option>
                    </select>
                    <p className="text-xs text-slate-400 mt-2">
                      {qaChecker === 'advanced'
                        ? '16 check types with spell-checking'
                        : '10 check types with false-positive prevention'}
                    </p>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-20">
                  <div className="inline-block">
                    <div className="animate-spin">
                      <Zap className="w-12 h-12 text-blue-500" />
                    </div>
                  </div>
                  <p className="mt-4 text-slate-300 font-medium">Processing your file...</p>
                </div>
              ) : (
                <ModernFileUpload onFileSelect={handleFileUpload} />
              )}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-5"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-5"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-10 relative z-10">
          {/* Header */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white">Quality Analysis</h1>
                {uploadedFile && (
                  <p className="text-slate-400 mt-2">File: <span className="font-semibold text-white">{uploadedFile.name}</span></p>
                )}
              </div>
              <button
                onClick={() => {
                  setSegments([])
                  setUploadedFile(null)
                  setQAResults(null)
                  setQaMode('balanced')
                }}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition border border-white/20 backdrop-blur-xl"
              >
                <RotateCcw size={18} />
                Upload New
              </button>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold">
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">{successMessage}</div>
              <button onClick={() => setSuccessMessage(null)} className="text-green-400 hover:text-green-300 font-bold">
                ×
              </button>
            </div>
          )}

          {/* Control Buttons */}
          <div className="mb-8 flex flex-wrap gap-4 items-center">
            <button
              onClick={handleRunQA}
              disabled={qaRunning || segments.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/50"
            >
              <Zap size={20} />
              {qaRunning ? 'QA Running...' : 'Run QA Check'}
            </button>

            <button
              onClick={() => setShowAIAnalysis(true)}
              disabled={segments.length === 0}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 backdrop-blur-xl"
            >
              AI Analysis
            </button>
          </div>

          {/* QA Mode & Checker Selector */}
          {segments.length > 0 && (
            <div className="mb-8 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">QA Mode</label>
                  <div className="flex gap-2">
                    {(['fast', 'balanced', 'full'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setQaMode(mode)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                          qaMode === mode
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        {mode === 'fast' ? '⚡ Fast' : mode === 'balanced' ? '⚖ Balanced' : '🔍 Full'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-white mb-3 uppercase tracking-wide">Checker Type</label>
                  <div className="flex gap-2">
                    {(['advanced', 'comprehensive'] as const).map((checker) => (
                      <button
                        key={checker}
                        onClick={() => setQaChecker(checker)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                          qaChecker === checker
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                        }`}
                      >
                        {checker === 'advanced' ? 'Advanced' : 'Comprehensive'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Segments Summary - Bento Grid */}
          {!qaResults && segments.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Uploaded Segments</h3>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Total Segments */}
                <div className="group relative bg-gradient-to-br from-blue-600/30 to-blue-700/20 hover:from-blue-600/40 hover:to-blue-700/30 backdrop-blur-xl rounded-2xl border border-blue-500/20 hover:border-blue-500/40 p-8 transition overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-5 transition"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-blue-300 font-semibold">TOTAL SEGMENTS</p>
                      <Cloud className="w-5 h-5 text-blue-400 opacity-50" />
                    </div>
                    <p className="text-5xl font-bold text-white">{segments.length}</p>
                    <p className="text-sm text-blue-300 mt-3">Files processed</p>
                  </div>
                </div>

                {/* Errors */}
                <div className="group relative bg-gradient-to-br from-red-600/30 to-red-700/20 hover:from-red-600/40 hover:to-red-700/30 backdrop-blur-xl rounded-2xl border border-red-500/20 hover:border-red-500/40 p-8 transition overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-red-600 opacity-0 group-hover:opacity-5 transition"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-red-300 font-semibold">ERRORS</p>
                      <AlertTriangle className="w-5 h-5 text-red-400 opacity-50" />
                    </div>
                    <p className="text-5xl font-bold text-white">
                      {qaResults ? ((qaResults as any).summary.by_severity['error'] ?? 0) : '-'}
                    </p>
                    <p className="text-sm text-red-300 mt-3">QA issues found</p>
                  </div>
                </div>

                {/* Warnings */}
                <div className="group relative bg-gradient-to-br from-yellow-600/30 to-yellow-700/20 hover:from-yellow-600/40 hover:to-yellow-700/30 backdrop-blur-xl rounded-2xl border border-yellow-500/20 hover:border-yellow-500/40 p-8 transition overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 to-yellow-600 opacity-0 group-hover:opacity-5 transition"></div>
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-yellow-300 font-semibold">WARNINGS</p>
                      <TrendingUp className="w-5 h-5 text-yellow-400 opacity-50" />
                    </div>
                    <p className="text-5xl font-bold text-white">
                      {qaResults ? ((qaResults as any).summary.by_severity['warning'] ?? 0) : '-'}
                    </p>
                    <p className="text-sm text-yellow-300 mt-3">Potential issues</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}

export default App
