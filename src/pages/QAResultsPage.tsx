import { useState } from 'react'
import { X, CheckCircle, ChevronDown } from 'lucide-react'
import type { Segment, QAResults } from '../types'

interface QAResultsPageProps {
  segments: Segment[]
  qaResults: QAResults | null
  onBack: () => void
}

export const QAResultsPage = ({ segments, qaResults, onBack }: QAResultsPageProps) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    segments[0]?.segment_id || null
  )
  const [selectedSeverity, setSelectedSeverity] = useState<'error' | 'warning' | 'info'>('error')

  // Get unique segment IDs that have issues
  const segmentIdsWithIssues = new Set(
    qaResults?.issues?.map((issue) => issue.segment_id) || []
  )

  // Filter segments to only show those with issues
  const segmentsWithIssues = segments.filter((s) =>
    segmentIdsWithIssues.has(s.segment_id)
  )

  // Set first segment with issues as selected by default
  if (selectedSegmentId === null && segmentsWithIssues.length > 0) {
    setSelectedSegmentId(segmentsWithIssues[0].segment_id)
  }

  const selectedSegment = segmentsWithIssues.find((s) => s.segment_id === selectedSegmentId)
  const segmentIssues = qaResults?.issues?.filter(
    (issue) => issue.segment_id === selectedSegmentId
  ) || []

  const currentIssue = segmentIssues.find((issue) => issue.severity === selectedSeverity)

  // Render text with highlighted errors
  const renderHighlightedText = (text: string, issues: typeof segmentIssues) => {
    if (!text) return text

    const words = text.split(/(\s+)/)
    return words.map((word, idx) => {
      const issue = issues.find((i) => i.target_text?.includes(word) && i.target_text === word)
      if (!issue) return word

      const underlineColor =
        issue.severity === 'error'
          ? 'decoration-red-500'
          : issue.severity === 'warning'
            ? 'decoration-yellow-500'
            : 'decoration-blue-500'

      return (
        <span key={idx} className={`underline decoration-wavy ${underlineColor}`}>
          {word}
        </span>
      )
    })
  }

  return (
    <div className="flex h-full bg-slate-950">
      {/* Left Column - Translation Workbench (70%) */}
      <div className="w-[70%] border-r border-slate-800 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-slate-800 px-8 flex items-center justify-between bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white">Translation Workbench</h2>
            <p className="text-xs text-slate-400 mt-1">
              {segmentsWithIssues.length} of {segments.length} segments with issues
            </p>
          </div>
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segment Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-slate-300 w-1/2">
                  Source (English)
                </th>
                <th className="px-6 py-4 text-left font-semibold text-slate-300 w-1/2">
                  Target (Turkish)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {segmentsWithIssues.map((segment) => {
                const isSelected = segment.segment_id === selectedSegmentId
                const hasErrors = qaResults?.issues?.some(
                  (issue) => issue.segment_id === segment.segment_id && issue.severity === 'error'
                )
                const hasWarnings = qaResults?.issues?.some(
                  (issue) => issue.segment_id === segment.segment_id && issue.severity === 'warning'
                )

                return (
                  <tr
                    key={segment.segment_id}
                    onClick={() => setSelectedSegmentId(segment.segment_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600"></div>
                    )}

                    {/* Source Text */}
                    <td className="px-6 py-4 text-slate-300">
                      <div className="flex items-center gap-2">
                        {!hasErrors && !hasWarnings && (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                        {hasErrors && (
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        )}
                        {hasWarnings && !hasErrors && (
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        )}
                        <span>{segment.source_text}</span>
                      </div>
                    </td>

                    {/* Target Text with Error Highlighting */}
                    <td className="px-6 py-4 text-slate-300">
                      <div className="space-y-1">
                        <div>{renderHighlightedText(segment.target_text, segmentIssues)}</div>
                        {segmentIssues.length > 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            {segmentIssues.length} issue{segmentIssues.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column - AI LQA Inspector (30%) */}
      <div className="w-[30%] bg-slate-900/30 border-l border-slate-800 flex flex-col overflow-auto">
        {/* Header */}
        <div className="h-16 border-b border-slate-800 px-6 flex items-center">
          <h3 className="text-lg font-semibold text-white">AI LQA Inspector</h3>
        </div>

        {/* Content */}
        {selectedSegment && (
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* MQM Category Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase">MQM Category</label>
              <div className="relative">
                <button className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 text-sm flex items-center justify-between hover:border-slate-600 transition-colors">
                  <span>Accuracy &gt; Mistranslation</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Severity Selection */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-400 uppercase">Severity</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { level: 'error' as const, label: 'Critical', color: 'border-red-600 bg-red-950/20' },
                  { level: 'warning' as const, label: 'Major', color: 'border-yellow-600 bg-yellow-950/20' },
                  { level: 'info' as const, label: 'Minor', color: 'border-blue-600 bg-blue-950/20' },
                ].map(({ level, label, color }) => (
                  <button
                    key={level}
                    onClick={() => setSelectedSeverity(level)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      selectedSeverity === level
                        ? `${color} text-white`
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div>{label}</div>
                    {level === 'error' && <div className="text-xs opacity-75">(Red)</div>}
                    {level === 'warning' && <div className="text-xs opacity-75">(Orange)</div>}
                    {level === 'info' && <div className="text-xs opacity-75">(Yellow)</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Suggestion */}
            {currentIssue ? (
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-green-300">RECOMMENDED FIX</p>
                  </div>
                  <p className="text-sm text-green-100">{currentIssue.message}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-lg">
                <p className="text-sm text-slate-400">No issues found for this severity level</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4" />
                Accept Fix
              </button>

              <button className="w-full px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 border border-red-600/50 text-red-400 rounded-lg font-medium transition-colors text-sm">
                Reject (False Positive)
              </button>

              <button className="w-full px-4 py-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700 text-slate-300 rounded-lg font-medium transition-colors text-sm">
                Edit Manually
              </button>
            </div>

            {/* Other Issues */}
            {segmentIssues.length > 1 && (
              <div className="pt-4 border-t border-slate-700 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase">Other Issues</p>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {segmentIssues
                    .filter((issue) => issue.severity !== selectedSeverity)
                    .map((issue, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedSeverity(issue.severity as any)}
                        className="w-full text-left p-2 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                      >
                        <div className="font-medium">{issue.check_type}</div>
                        <div className="text-slate-500 mt-0.5">{issue.message}</div>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
