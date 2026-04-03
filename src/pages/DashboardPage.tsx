import { Upload, Search, FileText, AlertCircle, AlertTriangle } from 'lucide-react'
import type { Segment, QAResults, QAMode } from '../types'

interface DashboardPageProps {
  segments: Segment[]
  qaResults: QAResults | null
  isLoading: boolean
  qaRunning: boolean
  qaMode: QAMode
  qaChecker: 'advanced' | 'comprehensive'
  parserEngine: 'lxml' | 'translate-toolkit'
  toolkitAvailable: boolean
  onFileUpload: (file: File) => void
  onRunQA: () => void
  onQAModeChange: (mode: QAMode) => void
  onQACheckerChange: (checker: 'advanced' | 'comprehensive') => void
  onParserEngineChange: (engine: 'lxml' | 'translate-toolkit') => void
}

export const DashboardPage = ({
  segments,
  qaResults,
  isLoading,
  qaRunning,
  qaMode,
  qaChecker,
  parserEngine,
  toolkitAvailable,
  onFileUpload,
  onRunQA,
  onQAModeChange,
  onQACheckerChange,
  onParserEngineChange,
}: DashboardPageProps) => {
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const errorCount = qaResults?.summary?.by_severity?.['error'] ?? 0
  const warningCount = qaResults?.summary?.by_severity?.['warning'] ?? 0

  return (
    <div className="p-8 space-y-8">
      {/* Top Section: Upload Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">SaaS dashboard</h2>
            <p className="text-slate-400 text-sm mt-1">Upload and analyze translation files</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm">
            <Upload className="w-4 h-4" />
            Files Upload
          </button>
        </div>

        {/* Upload Area */}
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-slate-700 rounded-lg p-12 text-center hover:border-slate-600 transition-colors"
        >
          <input
            type="file"
            onChange={handleFileSelect}
            disabled={isLoading}
            className="hidden"
            id="file-upload"
            accept=".xlf,.xliff,.xml,.sdlxliff,.mqxliff,.mxliff,.xlz,.wsxz,.sdlppx,.sdlrpx,.mqout,.zip"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <p className="text-white font-medium">
                  {isLoading ? 'Uploading...' : 'XLIFF dosyasını buraya sürükleyin veya tıklayın'}
                </p>
                <p className="text-slate-400 text-sm mt-1">Drag a file here or click</p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Stats Cards */}
      {segments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {/* Total Segments */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Toplam Segment</p>
                <p className="text-3xl font-bold text-white mt-2">{segments.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </div>

          {/* Errors */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Hatalar</p>
                <p className="text-3xl font-bold text-red-400 mt-2">{errorCount}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Uyarılar</p>
                <p className="text-3xl font-bold text-yellow-400 mt-2">{warningCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      {segments.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 space-y-4">
          <h3 className="text-white font-semibold">QA Controls</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Parser Engine */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">Parser Engine</label>
              <select
                value={parserEngine}
                onChange={(e) => onParserEngineChange(e.target.value as 'lxml' | 'translate-toolkit')}
                disabled={isLoading}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm hover:border-slate-500 transition-colors disabled:opacity-50"
              >
                <option value="lxml">lxml</option>
                {toolkitAvailable && <option value="translate-toolkit">translate-toolkit</option>}
              </select>
            </div>

            {/* QA Checker */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">QA Checker</label>
              <select
                value={qaChecker}
                onChange={(e) => onQACheckerChange(e.target.value as 'advanced' | 'comprehensive')}
                disabled={qaRunning}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm hover:border-slate-500 transition-colors disabled:opacity-50"
              >
                <option value="advanced">Advanced</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
          </div>

          {/* QA Mode */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">QA Mode</label>
            <div className="flex gap-2">
              {['fast', 'balanced', 'comprehensive'] .map((mode) => (
                <button
                  key={mode}
                  onClick={() => onQAModeChange(mode as QAMode)}
                  disabled={qaRunning}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    qaMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  } disabled:opacity-50`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Run QA Button */}
          <button
            onClick={onRunQA}
            disabled={qaRunning || segments.length === 0}
            className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {qaRunning ? 'QA Running...' : 'Run QA Check'}
          </button>
        </div>
      )}

      {/* Segment Table */}
      {segments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Segment Data</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 hover:border-slate-500 focus:border-slate-400 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="px-6 py-4 text-left font-semibold text-slate-300">Segment ID</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-300">Kaynak Metin</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-300">Hedef Metin</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-300">QA Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {segments.slice(0, 10).map((segment, idx) => {
                  const hasError = qaResults?.issues?.some(
                    (issue) => issue.segment_id === segment.segment_id && issue.severity === 'error'
                  )
                  const hasWarning = qaResults?.issues?.some(
                    (issue) => issue.segment_id === segment.segment_id && issue.severity === 'warning'
                  )

                  return (
                    <tr key={idx} className={hasError ? 'bg-red-950/20' : hasWarning ? 'bg-yellow-950/10' : ''}>
                      <td className="px-6 py-4 text-slate-300">{segment.segment_id}</td>
                      <td className="px-6 py-4 text-slate-300">{segment.source_text}</td>
                      <td className="px-6 py-4 text-slate-300">{segment.target_text}</td>
                      <td className="px-6 py-4">
                        {hasError && <span className="text-red-400 font-medium">Hata var</span>}
                        {hasWarning && !hasError && <span className="text-yellow-400 font-medium">Uyarı var</span>}
                        {!hasError && !hasWarning && <span className="text-green-400 font-medium">Tamam</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {segments.length > 10 && (
            <p className="text-slate-400 text-sm text-center py-4">
              Showing 10 of {segments.length} segments
            </p>
          )}
        </div>
      )}
    </div>
  )
}
