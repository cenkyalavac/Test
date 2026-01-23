import { useState, useEffect, useRef } from 'react'
import { API_ENDPOINTS } from './config'
import type { Segment, QAResults, QAMode } from './types'
import { AppShell } from './layouts/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { QAResultsPage } from './pages/QAResultsPage'

type PageType = 'dashboard' | 'qa-results'

function App() {
  // State Management - Business Logic
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard')
  const [segments, setSegments] = useState<Segment[]>([])
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort())
      abortControllersRef.current.clear()
    }
  }, [])

  // Fetch parser config
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

  // Business Logic - File Upload Handler
  const handleFileUpload = async (file: File) => {
    setError(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('parser_engine', parserEngine)

      const controller = new AbortController()
      const requestId = `upload-${Date.now()}`
      abortControllersRef.current.set(requestId, controller)

      const response = await fetch(API_ENDPOINTS.PARSE, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      setSegments(data.segments || [])
      setSuccessMessage(`File "${file.name}" parsed successfully. ${data.segments?.length || 0} segments found.`)
      setCurrentPage('dashboard')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMsg)
      console.error('File upload error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Business Logic - QA Check Handler
  const handleRunQA = async () => {
    if (segments.length === 0) {
      setError('No segments to check')
      return
    }

    setQARunning(true)
    setError(null)

    try {
      const controller = new AbortController()
      const requestId = `qa-${Date.now()}`
      abortControllersRef.current.set(requestId, controller)

      const response = await fetch(API_ENDPOINTS.QA_CHECK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: segments.map(s => ({
            segment_id: s.segment_id,
            source_text: s.source_text,
            target_text: s.target_text,
            status: s.status || 'translated',
            source_language: s.source_language || 'en',
            target_language: s.target_language || 'tr',
          })),
          mode: qaMode,
          use_comprehensive: qaChecker === 'comprehensive',
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`QA check failed: ${response.statusText}`)
      }

      const data = await response.json()
      setQAResults(data)
      setCurrentPage('qa-results')
      setSuccessMessage('QA check completed')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'QA check failed'
      setError(errorMsg)
      console.error('QA check error:', err)
    } finally {
      setQARunning(false)
    }
  }

  // Render Pages
  const renderPage = () => {
    switch (currentPage) {
      case 'qa-results':
        return (
          <QAResultsPage
            segments={segments}
            qaResults={qaResults}
            onBack={() => setCurrentPage('dashboard')}
          />
        )
      case 'dashboard':
      default:
        return (
          <DashboardPage
            segments={segments}
            qaResults={qaResults}
            isLoading={isLoading}
            qaRunning={qaRunning}
            qaMode={qaMode}
            qaChecker={qaChecker}
            parserEngine={parserEngine}
            toolkitAvailable={toolkitAvailable}
            onFileUpload={handleFileUpload}
            onRunQA={handleRunQA}
            onQAModeChange={setQaMode}
            onQACheckerChange={setQaChecker}
            onParserEngineChange={setParserEngine}
          />
        )
    }
  }

  return (
    <AppShell
      error={error}
      success={successMessage}
      onErrorClose={() => setError(null)}
      onSuccessClose={() => setSuccessMessage(null)}
    >
      {renderPage()}
    </AppShell>
  )
}

export default App
