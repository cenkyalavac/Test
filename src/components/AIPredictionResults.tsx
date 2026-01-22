/**
 * AI Prediction Results Component
 *
 * Displays translation error predictions classified using MQM typology
 * with severity levels and suggestions.
 */

import React, { useState } from 'react';
import { AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface MQMError {
  error_type: string;
  category: string;
  severity: string;
  message: string;
  explanation?: string;
  suggestion?: string;
}

interface PredictionStats {
  total_errors: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  confidence: number;
}

interface AIPrediction {
  segment_id: string;
  source_text: string;
  target_text: string;
  errors: MQMError[];
  overall_comment: string;
  confidence: number;
  stats: PredictionStats;
}

interface AIPredictionResultsProps {
  predictions: AIPrediction[];
  engine: string;
  loading?: boolean;
}

const severityColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-900', border: 'border-red-300', icon: '🔴' },
  major: { bg: 'bg-orange-50', text: 'text-orange-900', border: 'border-orange-300', icon: '🟠' },
  minor: { bg: 'bg-yellow-50', text: 'text-yellow-900', border: 'border-yellow-300', icon: '🟡' },
  neutral: { bg: 'bg-blue-50', text: 'text-blue-900', border: 'border-blue-300', icon: '🔵' },
};

const categoryColors: Record<string, string> = {
  'Terminology': 'bg-purple-100 text-purple-800',
  'Accuracy': 'bg-red-100 text-red-800',
  'Fluency': 'bg-green-100 text-green-800',
  'Conventions': 'bg-blue-100 text-blue-800',
  'Design': 'bg-indigo-100 text-indigo-800',
  'Other': 'bg-gray-100 text-gray-800',
};

const PredictionCard: React.FC<{ prediction: AIPrediction }> = ({
  prediction,
}) => {
  const [expanded, setExpanded] = useState(true);
  const hasErrors = prediction.errors.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      {/* Header */}
      <div
        className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-800">
                Segment {prediction.segment_id}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                prediction.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                prediction.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {(prediction.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Source:</strong> {prediction.source_text}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <strong>Target:</strong> {prediction.target_text || <span className="text-red-600 italic">untranslated</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {hasErrors && (
              <div className="flex items-center gap-1">
                <AlertCircle size={20} className="text-red-600" />
                <span className="font-semibold text-red-600">{prediction.errors.length}</span>
              </div>
            )}
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Overall Comment */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Overall Assessment:</strong> {prediction.overall_comment}
            </p>
          </div>

          {/* Errors */}
          {hasErrors ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800">Detected Issues:</h4>
              {prediction.errors.map((error, errorIdx) => {
                const severityColor = severityColors[error.severity] || severityColors.neutral;
                const categoryColor = categoryColors[error.category] || categoryColors['Other'];

                return (
                  <div
                    key={errorIdx}
                    className={`p-3 border-l-4 ${severityColor.bg} ${severityColor.border}`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-lg">{severityColor.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-800">{error.error_type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor}`}>
                            {error.category}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${severityColor.text}`}>
                            {error.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{error.message}</p>
                      </div>
                    </div>

                    {error.explanation && (
                      <div className="ml-7 text-sm text-gray-600 italic mb-2">
                        {error.explanation}
                      </div>
                    )}

                    {error.suggestion && (
                      <div className="ml-7 text-sm bg-white bg-opacity-50 p-2 rounded border-l-2 border-green-400">
                        <strong className="text-green-700">💡 Suggestion:</strong> {error.suggestion}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-900">✓ No significant issues detected</p>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Total Issues</div>
              <div className="text-lg font-bold text-gray-800">{prediction.stats.total_errors}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-600">Error Distribution</div>
              <div className="text-xs text-gray-700 mt-1 space-y-0.5">
                {Object.entries(prediction.stats.by_severity).map(([sev, count]) => (
                  <div key={sev}>{sev}: {count}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AIPredictionResults: React.FC<AIPredictionResultsProps> = ({
  predictions,
  engine,
  loading,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing translations with {engine}...</p>
        </div>
      </div>
    );
  }

  if (!predictions || predictions.length === 0) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <Info size={32} className="mx-auto mb-2 text-gray-400" />
        <p className="text-gray-600">No predictions available. Upload a file and run analysis.</p>
      </div>
    );
  }

  // Calculate summary statistics
  const totalPredictions = predictions.length;
  const segmentsWithErrors = predictions.filter(p => p.errors.length > 0).length;
  const allErrors = predictions.flatMap(p => p.errors);
  const errorBySeverity: Record<string, number> = {};
  const errorByCategory: Record<string, number> = {};

  allErrors.forEach(error => {
    errorBySeverity[error.severity] = (errorBySeverity[error.severity] || 0) + 1;
    errorByCategory[error.category] = (errorByCategory[error.category] || 0) + 1;
  });

  const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / totalPredictions;

  return (
    <div className="w-full space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Total Segments</div>
          <div className="text-2xl font-bold text-gray-800 mt-1">{totalPredictions}</div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-600 uppercase tracking-wide">With Issues</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{segmentsWithErrors}</div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Total Issues</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">{allErrors.length}</div>
        </div>
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="text-xs text-gray-600 uppercase tracking-wide">Avg Confidence</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{(avgConfidence * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Error Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">By Severity</h3>
          <div className="space-y-2">
            {Object.entries(errorBySeverity).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{severity}</span>
                <span className={`font-semibold px-3 py-1 rounded text-sm ${
                  severityColors[severity]?.bg || 'bg-gray-100'
                }`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-3">By Category</h3>
          <div className="space-y-2">
            {Object.entries(errorByCategory).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category}</span>
                <span className={`font-semibold px-3 py-1 rounded text-sm ${
                  categoryColors[category] || 'bg-gray-100 text-gray-800'
                }`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Information Box */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-purple-900">
          <strong>AI Engine:</strong> {engine.toUpperCase()} •
          <strong className="ml-3">MQM Classification:</strong> Errors are categorized using Multidimensional Quality Metrics typology
        </p>
      </div>

      {/* Predictions */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Segment Predictions</h2>
        <div className="space-y-0">
          {predictions.map((prediction) => (
            <PredictionCard
              key={prediction.segment_id}
              prediction={prediction}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIPredictionResults;
