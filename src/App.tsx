import { useState, useEffect, useRef } from 'react'
import { Zap, RotateCcw } from 'lucide-react'
import './App.css'
import ModernFileUpload from './components/ModernFileUpload'
import { LandingPagePro } from './components/LandingPagePro'
import { ModernLayout } from './components/ModernLayout'
import { ModernResultsPanel } from './components/ModernResultsPanel'
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

  // Cleanup abort controllers on unmount
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  // Fetch parser configuration on mount
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
    // Reset state
    setError(null)
    setSuccessMessage(null)
    setIsLoading(true)
    setQAResults(null)
    setQARunning(false)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('parser_engine', parserEngine)

      // Make API request with timeout
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

      // Map segments
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

      // Auto-clear success message after 5 seconds
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

  // Show AI Analysis
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

  // Show landing page
  if (segments.length === 0) {
    return (
      <ErrorBoundary>
        <LandingPagePro
          onGetStarted={() => {
            // Scroll to upload section
            const uploadSection = document.getElementById('upload-section')
            if (uploadSection) {
              uploadSection.scrollIntoView({ behavior: 'smooth' })
            }
          }}
        />

        {/* Upload Section - Hidden until user clicks "Get Started" */}
        <div id="upload-section" className="min-h-screen bg-slate-50 px-6 py-20">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Upload Your File</h2>
              <p className="text-slate-600">Drag and drop your translation file to get started</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  {successMessage}
                </div>
              )}

              {/* Parser & QA Options */}
              <div className="mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Parser Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Parser Engine
                    </label>
                    <select
                      value={parserEngine}
                      onChange={(e) => setParserEngine(e.target.value as 'lxml' | 'translate-toolkit')}
                      disabled={!toolkitAvailable && parserEngine === 'translate-toolkit'}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="lxml">lxml Parser (Default)</option>
                      {toolkitAvailable && (
                        <option value="translate-toolkit">Translate-Toolkit (Alternative)</option>
                      )}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      {parserEngine === 'lxml'
                        ? 'Fast and reliable XML parser'
                        : 'Alternative parser for problematic files'}
                    </p>
                  </div>

                  {/* QA Checker Selection */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      QA Checker
                    </label>
                    <select
                      value={qaChecker}
                      onChange={(e) => setQaChecker(e.target.value as 'advanced' | 'comprehensive')}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="advanced">Advanced QA (Default)</option>
                      <option value="comprehensive">Comprehensive QA (Strict)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      {qaChecker === 'advanced'
                        ? '16 check types with spell-checking'
                        : '10 check types with false-positive prevention'}
                    </p>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block">
                    <div className="animate-spin">
                      <Zap className="w-12 h-12 text-blue-600" />
                    </div>
                  </div>
                  <p className="mt-4 text-slate-600 font-medium">Processing your file...</p>
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

  // Show file results page
  return (
    <ErrorBoundary>
      <ModernLayout
        title="Quality Analysis"
        subtitle={uploadedFile ? `File: ${uploadedFile.name}` : undefined}
      >
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
            <span>⚠</span>
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-start gap-3">
            <span>✓</span>
            <div className="flex-1">{successMessage}</div>
            <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-green-700">
              ×
            </button>
          </div>
        )}

        {/* Control Buttons */}
        <div className="mb-8 flex flex-wrap gap-4 items-center">
          <button
            onClick={handleRunQA}
            disabled={qaRunning || segments.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap size={20} />
            {qaRunning ? 'QA Running...' : 'Run QA Check'}
          </button>

          <button
            onClick={() => setShowAIAnalysis(true)}
            disabled={segments.length === 0}
            className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            AI Analysis
          </button>

          <button
            onClick={() => {
              setSegments([])
              setUploadedFile(null)
              setQAResults(null)
              setQaMode('balanced')
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition ml-auto"
          >
            <RotateCcw size={20} />
            Upload New File
          </button>
        </div>

        {/* QA Mode & Checker Selector */}
        {segments.length > 0 && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-700">QA Mode:</span>
              {(['fast', 'balanced', 'full'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setQaMode(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    qaMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {mode === 'fast' ? '⚡ Fast' : mode === 'balanced' ? '⚖ Balanced' : '🔍 Full'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-700">Checker:</span>
              {(['advanced', 'comprehensive'] as const).map((checker) => (
                <button
                  key={checker}
                  onClick={() => setQaChecker(checker)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    qaChecker === checker
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {checker === 'advanced' ? 'Advanced (16 checks)' : 'Comprehensive (10 checks)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {qaResults && (
          <ModernResultsPanel
            segments={segments}
            qaResults={qaResults}
            onClose={() => setQAResults(null)}
          />
        )}

        {/* Segments Summary */}
        {!qaResults && segments.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Uploaded Segments</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-semibold mb-2">Total Segments</p>
                <p className="text-3xl font-bold text-blue-900">{segments.length}</p>
              </div>
              <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-semibold mb-2">Translated</p>
                <p className="text-3xl font-bold text-green-900">
                  {segments.filter(s => s.status === 'translated').length}
                </p>
              </div>
              <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-700 font-semibold mb-2">Needs Review</p>
                <p className="text-3xl font-bold text-yellow-900">
                  {segments.filter(s => s.status === 'needs-review').length}
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700 font-semibold mb-2">File Size</p>
                <p className="text-3xl font-bold text-slate-900">
                  {uploadedFile ? (uploadedFile.size / 1024 / 1024).toFixed(2) : 0}MB
                </p>
              </div>
            </div>
          </div>
        )}
      </ModernLayout>
    </ErrorBoundary>
  )
}

export default App
