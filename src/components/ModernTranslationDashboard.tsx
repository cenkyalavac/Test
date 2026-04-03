import React, { useState, useMemo } from 'react';
import {
  ChevronDown, CheckCircle, XCircle, Edit2, AlertCircle
} from 'lucide-react';
import type { Segment, QAResults, QAIssue } from '../types';

interface SegmentWithMatch extends Segment {
  match_percentage?: number;
}

interface ModernTranslationDashboardProps {
  segments: SegmentWithMatch[];
  qaResults?: QAResults | null;
}

export const ModernTranslationDashboard: React.FC<ModernTranslationDashboardProps> = ({ segments, qaResults }) => {
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<'error' | 'warning' | 'info'>('error');

  // Get issues for current segment
  const selectedSegment = segments.find(s => s.segment_id === selectedSegmentId) || segments[0];
  const selectedSegmentId_safe = selectedSegment?.segment_id;

  const segmentIssues = useMemo(() => {
    if (!qaResults?.issues || !selectedSegmentId_safe) return [];
    return qaResults.issues.filter(issue => issue.segment_id === selectedSegmentId_safe);
  }, [qaResults, selectedSegmentId_safe]);

  const currentIssue: QAIssue | null = useMemo(() => {
    if (segmentIssues.length === 0) return null;
    return segmentIssues[0];
  }, [segmentIssues]);

  // Render text with error highlighting
  const renderHighlightedText = (text: string, issues: QAIssue[]) => {
    if (!issues || issues.length === 0) return text;

    // Simple word-level highlighting for demonstration
    const words = text.split(/(\s+)/);
    return words.map((word, idx) => {
      const issue = issues.find(i => i.target_text?.includes(word.trim()));
      if (!issue) return word;

      const underlineColor = issue.severity === 'error'
        ? 'decoration-red-500'
        : issue.severity === 'warning'
        ? 'decoration-yellow-500'
        : 'decoration-blue-500';

      return (
        <span
          key={idx}
          className={`underline decoration-wavy ${underlineColor}`}
          title={issue.message}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <h1 className="text-3xl font-bold">AI LQA Translation Workbench</h1>
        <p className="text-slate-400 text-sm">Professional translation review and QA analysis</p>
      </div>

      {/* Main Layout: 2 Columns */}
      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* LEFT COLUMN - Segment List (70%) */}
        <div className="w-[70%] border-r border-white/10 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded"></span>
              Translation Segments
              <span className="text-sm font-normal text-slate-400">({segments.length})</span>
            </h2>

            <div className="space-y-2">
              {segments.map((segment, idx) => {
                const segmentProblems = qaResults?.issues?.filter(i => i.segment_id === segment.segment_id) || [];
                const isSelected = segment.segment_id === selectedSegmentId_safe;
                const hasErrors = segmentProblems.some(i => i.severity === 'error');
                const hasWarnings = segmentProblems.some(i => i.severity === 'warning');

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedSegmentId(segment.segment_id)}
                    className={`group relative p-4 rounded-lg border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-blue-500/50'
                        : 'bg-slate-800/30 border-white/10 hover:border-white/20 hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-blue-600 rounded-l-lg"></div>
                    )}

                    {/* Status Icons */}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {hasErrors && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Error"></div>
                      )}
                      {hasWarnings && (
                        <div className="w-2 h-2 rounded-full bg-yellow-500" title="Warning"></div>
                      )}
                      {!hasErrors && !hasWarnings && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>

                    {/* Segment ID */}
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      Segment #{segment.segment_id}
                    </div>

                    {/* Source Text */}
                    <div className="mb-2">
                      <p className="text-xs text-slate-500 font-semibold uppercase mb-1">English (Source)</p>
                      <p className="text-sm text-slate-200">{segment.source_text.substring(0, 150)}</p>
                    </div>

                    {/* Target Text with Error Highlighting */}
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Turkish (Target)</p>
                      <p className="text-sm text-slate-300">
                        {renderHighlightedText(segment.target_text.substring(0, 150), segmentProblems)}
                      </p>
                    </div>

                    {/* Error Summary */}
                    {segmentProblems.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/10 flex gap-2 text-xs">
                        <span className="text-red-400">
                          {segmentProblems.filter(i => i.severity === 'error').length} errors
                        </span>
                        <span className="text-yellow-400">
                          {segmentProblems.filter(i => i.severity === 'warning').length} warnings
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - AI LQA Inspector (30%) */}
        <div className="w-[30%] bg-slate-800/30 border-l border-white/10 overflow-y-auto">
          {selectedSegment && currentIssue ? (
            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <h3 className="text-lg font-bold text-white mb-1">AI LQA Inspector</h3>
                <p className="text-xs text-slate-400">Segment #{selectedSegmentId_safe}</p>
              </div>

              {/* MQM Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  MQM Category
                </label>
                <div className="relative group">
                  <button className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200 flex items-center justify-between hover:border-white/20 transition">
                    <span>{currentIssue.check_type.replace(/_/g, ' ')}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Severity Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  Severity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { level: 'error', label: 'Critical', color: 'bg-red-600 hover:bg-red-700' },
                    { level: 'warning', label: 'Major', color: 'bg-yellow-600 hover:bg-yellow-700' },
                    { level: 'info', label: 'Minor', color: 'bg-blue-600 hover:bg-blue-700' },
                  ].map(({ level, label, color }) => (
                    <button
                      key={level}
                      onClick={() => setSelectedSeverity(level as any)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition ${
                        selectedSeverity === level
                          ? color
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-bold">{label}</div>
                      <div className="text-xs opacity-75">(
                        {level === 'error' ? 'Red' : level === 'warning' ? 'Orange' : 'Yellow'}
                        )</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  Issue Details
                </label>
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <p className="text-sm text-slate-200">{currentIssue.message}</p>
                  {currentIssue.details && Object.keys(currentIssue.details).length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 text-xs text-slate-400 space-y-1">
                      {Object.entries(currentIssue.details).map(([key, value]) => (
                        <p key={key}>
                          <strong className="text-slate-300">{key}:</strong> {String(value).substring(0, 40)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Suggestion */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  AI Suggestion
                </label>
                <div className="p-4 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-green-300">RECOMMENDED FIX</p>
                  </div>
                  <p className="text-sm text-green-100 leading-relaxed">
                    {selectedSegment.target_text.substring(0, 120)}...
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <button className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition shadow-lg hover:shadow-blue-500/50">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Accept Fix
                  </div>
                </button>

                <button className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-slate-200 font-semibold rounded-lg transition border border-white/20">
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Reject (False Positive)
                  </div>
                </button>

                <button className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-lg transition border border-white/10">
                  <div className="flex items-center justify-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    Edit Manually
                  </div>
                </button>
              </div>

              {/* Other Issues for this Segment */}
              {segmentIssues.length > 1 && (
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">
                    Other Issues ({segmentIssues.length - 1})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {segmentIssues.slice(1).map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-xs border ${
                          issue.severity === 'error'
                            ? 'bg-red-500/10 border-red-500/30 text-red-300'
                            : issue.severity === 'warning'
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                            : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                        }`}
                      >
                        <p className="font-semibold">{issue.check_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs opacity-80">{issue.message.substring(0, 50)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">Select a segment to view QA details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernTranslationDashboard;
