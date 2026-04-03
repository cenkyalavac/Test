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
        return { bg: 'bg-red-900/20', border: 'border-red-600', icon: 'text-red-400', badge: 'badge-error' }
      case 'warning':
        return { bg: 'bg-yellow-900/20', border: 'border-yellow-600', icon: 'text-yellow-400', badge: 'badge-warning' }
      case 'info':
        return { bg: 'bg-blue-900/20', border: 'border-blue-600', icon: 'text-blue-400', badge: 'badge-info' }
      default:
        return { bg: 'bg-slate-800/50', border: 'border-slate-600', icon: 'text-slate-400', badge: 'badge-ghost' }
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
    <div className="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-700 bg-gradient-to-r from-slate-900 via-blue-900/30 to-slate-900 p-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">QA Analysis Results</h2>
            <p className="text-slate-300">
              Analyzed <span className="font-semibold text-blue-400">{segments.length}</span> segments in{' '}
              <span className="font-semibold text-cyan-400">{qaResults.mode}</span> mode
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle text-white"
          >
            ✕
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="stat bg-slate-800/50 rounded-lg border border-slate-600">
            <div className="stat-title text-slate-400">Total Issues</div>
            <div className="stat-value text-blue-400 text-2xl">{qaResults.total_issues}</div>
          </div>
          <div className="stat bg-slate-800/50 rounded-lg border border-red-600/30">
            <div className="stat-title text-slate-400">Errors</div>
            <div className="stat-value text-red-400 text-2xl">{qaResults.summary.by_severity.error || 0}</div>
          </div>
          <div className="stat bg-slate-800/50 rounded-lg border border-yellow-600/30">
            <div className="stat-title text-slate-400">Warnings</div>
            <div className="stat-value text-yellow-400 text-2xl">{qaResults.summary.by_severity.warning || 0}</div>
          </div>
          <div className="stat bg-slate-800/50 rounded-lg border border-blue-600/30">
            <div className="stat-title text-slate-400">Info</div>
            <div className="stat-value text-blue-400 text-2xl">{qaResults.summary.by_severity.info || 0}</div>
          </div>
        </div>

        {/* Charts Toggle Button */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="btn btn-outline btn-sm gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-blue-500"
          >
            <BarChart3 size={18} />
            {showCharts ? 'Hide' : 'Show'} Detailed Charts
            <ChevronDown size={16} className={`transition transform ${showCharts ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && (
        <div className="border-b border-slate-700 p-8 bg-slate-800/30">
          <QAChartsPanel qaResults={qaResults} />
        </div>
      )}

      {/* Issues by Type */}
      {qaResults.summary.by_type && Object.keys(qaResults.summary.by_type).length > 0 && (
        <div className="border-b border-slate-700 p-8">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 size={20} />
            Issues by Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(qaResults.summary.by_type).map(([type, count]) => (
              <div key={type} className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                <p className="text-xs text-slate-400 font-semibold uppercase mb-2">
                  {type.replace(/_/g, ' ')}
                </p>
                <p className="text-2xl font-bold text-slate-200">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Controls */}
      <div className="border-b border-slate-700 p-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-3 flex-wrap">
          {(['all', 'error', 'warning', 'info'] as const).map((severity) => (
            <button
              key={severity}
              onClick={() => setSelectedSeverity(severity)}
              className={`btn btn-sm gap-2 ${
                selectedSeverity === severity
                  ? severity === 'error'
                    ? 'btn-error'
                    : severity === 'warning'
                    ? 'btn-warning'
                    : severity === 'info'
                    ? 'btn-info'
                    : 'btn-primary'
                  : 'btn-outline btn-ghost'
              }`}
            >
              {severity === 'all' ? 'All Issues' : severity.charAt(0).toUpperCase() + severity.slice(1)}
              {severity !== 'all' && (
                <span>
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
        <button className="btn btn-outline btn-sm gap-2 border-slate-600 text-slate-300 hover:text-white hover:border-cyan-500">
          <Download size={18} />
          Export
        </button>
      </div>

      {/* Issues List */}
      <div className="p-8">
        {filteredIssues.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-white">No issues found!</p>
            <p className="text-slate-400">Your translation file passed all quality checks.</p>
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
                        <span className={`badge ${colors.badge}`}>
                          {issue.severity.toUpperCase()}
                        </span>
                        <span className="badge badge-outline text-slate-300">
                          {issue.check_type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-400">Segment #{issue.segment_id}</span>
                      </div>

                      <p className="font-semibold text-white mb-2">{issue.message}</p>

                      {(issue.source_text || issue.target_text) && (
                        <div className="text-sm text-slate-300 space-y-1 bg-slate-800/50 rounded p-3 mb-2">
                          {issue.source_text && (
                            <p>
                              <span className="font-semibold text-blue-400">Source:</span> {issue.source_text.substring(0, 100)}
                              {issue.source_text.length > 100 ? '...' : ''}
                            </p>
                          )}
                          {issue.target_text && (
                            <p>
                              <span className="font-semibold text-cyan-400">Target:</span> {issue.target_text.substring(0, 100)}
                              {issue.target_text.length > 100 ? '...' : ''}
                            </p>
                          )}
                        </div>
                      )}

                      {issue.details && Object.keys(issue.details).length > 0 && (
                        <details className="text-xs text-slate-400 mt-2">
                          <summary className="cursor-pointer font-semibold hover:text-slate-300">
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
              <div className="text-center py-4 text-slate-400 text-sm">
                Showing 30 of {filteredIssues.length} issues
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
