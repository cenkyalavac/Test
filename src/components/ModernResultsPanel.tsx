import React, { useState } from 'react'
import { AlertCircle, CheckCircle, Info, Download, BarChart3, ChevronDown } from 'lucide-react'
import type { QAResults, Segment } from '../types'
import { QAChartsPanel } from './QAChartsPanel'

interface ModernResultsPanelProps {
  segments: Segment[]
  qaResults: QAResults
  onClose: () => void
}

export const ModernResultsPanel: React.FC<ModernResultsPanelProps> = ({
  segments,
  qaResults,
  onClose
}) => {
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [showCharts, setShowCharts] = useState(true)

  const filteredIssues = qaResults.issues.filter(issue => {
    if (selectedSeverity === 'all') return true
    return issue.severity === selectedSeverity
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' }
      case 'warning':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' }
      case 'info':
        return { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' }
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600', badge: 'bg-slate-100 text-slate-700' }
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'warning':
        return <AlertCircle className="w-5 h-5" />
      case 'info':
        return <Info className="w-5 h-5" />
      default:
        return <CheckCircle className="w-5 h-5" />
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">QA Analysis Results</h2>
            <p className="text-slate-600">
              Analyzed <span className="font-semibold">{segments.length}</span> segments in{' '}
              <span className="font-semibold">{qaResults.mode}</span> mode
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">Total Issues</p>
            <p className="text-2xl font-bold text-slate-900">{qaResults.total_issues}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <p className="text-sm text-slate-600 mb-1">Errors</p>
            <p className="text-2xl font-bold text-red-600">{qaResults.summary.by_severity.error || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-yellow-200">
            <p className="text-sm text-slate-600 mb-1">Warnings</p>
            <p className="text-2xl font-bold text-yellow-600">{qaResults.summary.by_severity.warning || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-slate-600 mb-1">Info</p>
            <p className="text-2xl font-bold text-blue-600">{qaResults.summary.by_severity.info || 0}</p>
          </div>
        </div>

        {/* Charts Toggle Button */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-blue-50 text-slate-700 rounded-lg font-medium transition border border-slate-200"
          >
            <BarChart3 size={18} />
            {showCharts ? 'Hide' : 'Show'} Detailed Charts
            <ChevronDown size={16} className={`transition transform ${showCharts ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <div className="border-b border-slate-200 p-8 bg-slate-50">
          <QAChartsPanel qaResults={qaResults} />
        </div>
      )}

      {/* Issues by Type */}
      {qaResults.summary.by_type && Object.keys(qaResults.summary.by_type).length > 0 && (
        <div className="border-b border-slate-200 p-8">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <BarChart3 size={20} />
            Issues by Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(qaResults.summary.by_type).map(([type, count]) => (
              <div key={type} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 font-semibold uppercase mb-2">
                  {type.replace(/_/g, ' ')}
                </p>
                <p className="text-2xl font-bold text-slate-900">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Controls */}
      <div className="border-b border-slate-200 p-8 flex items-center justify-between">
        <div className="flex gap-3">
          {(['all', 'error', 'warning', 'info'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => setSelectedSeverity(severity)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedSeverity === severity
                  ? severity === 'error'
                    ? 'bg-red-100 text-red-700'
                    : severity === 'warning'
                    ? 'bg-yellow-100 text-yellow-700'
                    : severity === 'info'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {severity === 'all' ? 'All Issues' : severity.charAt(0).toUpperCase() + severity.slice(1)}
              {severity !== 'all' && (
                <span className="ml-2">
                  {severity === 'error'
                    ? qaResults.summary.by_severity.error || 0
                    : severity === 'warning'
                    ? qaResults.summary.by_severity.warning || 0
                    : qaResults.summary.by_severity.info || 0}
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Issues List */}
      <div className="p-8">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-semibold text-slate-900">No issues found!</p>
            <p className="text-slate-600">Your translation file passed all quality checks.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredIssues.slice(0, 30).map((issue, idx) => {
              const colors = getSeverityColor(issue.severity)
              return (
                <div
                  key={idx}
                  className={`${colors.bg} border ${colors.border} rounded-lg p-4 hover:shadow-md transition`}
                >
                  <div className="flex items-start gap-4">
                    <div className={colors.icon}>{getSeverityIcon(issue.severity)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`${colors.badge} text-xs font-semibold px-2 py-1 rounded`}>
                          {issue.severity.toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded">
                          {issue.check_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-600">Segment #{issue.segment_id}</span>
                      </div>

                      <p className="font-semibold text-slate-900 mb-2">{issue.message}</p>

                      {(issue.source_text || issue.target_text) && (
                        <div className="text-sm text-slate-700 space-y-1 bg-white/50 rounded p-3 mb-2">
                          {issue.source_text && (
                            <p>
                              <span className="font-semibold">Source:</span> {issue.source_text.substring(0, 100)}
                              {issue.source_text.length > 100 ? '...' : ''}
                            </p>
                          )}
                          {issue.target_text && (
                            <p>
                              <span className="font-semibold">Target:</span> {issue.target_text.substring(0, 100)}
                              {issue.target_text.length > 100 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {issue.details && Object.keys(issue.details).length > 0 && (
                        <details className="text-xs text-slate-600 mt-2">
                          <summary className="cursor-pointer font-semibold hover:text-slate-900">
                            Details
                          </summary>
                          <div className="mt-2 space-y-1 ml-4">
                            {Object.entries(issue.details).map(([key, value]) => (
                              <p key={key}>
                                <strong>{key}:</strong> {String(value).substring(0, 80)}
                              </p>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {filteredIssues.length > 30 && (
              <div className="text-center py-4 text-slate-600 text-sm">
                Showing 30 of {filteredIssues.length} issues
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
