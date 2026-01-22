/**
 * AI Analysis Panel Component
 *
 * Integrates AI error prediction, MQM classification, and QA analysis.
 * Main panel for running AI predictions on translation segments.
 */

import React, { useState } from 'react';
import { Zap, RotateCw, Download } from 'lucide-react';
import AISettings from './AISettings';
import AIPredictionResults from './AIPredictionResults';

interface Segment {
  segment_id: string;
  source_text: string;
  target_text: string;
  status: string;
  source_language?: string;
  target_language?: string;
}

interface AIAnalysisPanelProps {
  segments: Segment[];
  onClose?: () => void;
}

interface PredictionData {
  engine: string;
  predictions: any[];
  total_predictions: number;
}

export const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({ segments }) => {
  const [selectedEngine, setSelectedEngine] = useState('mock');
  const [predictions, setPredictions] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'results'>('settings');

  const handleRunAnalysis = async () => {
    if (!segments || segments.length === 0) {
      setError('No segments available for analysis');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: segments,
          engine: selectedEngine
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const data = await response.json();
      setPredictions(data);
      setActiveTab('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExportResults = () => {
    if (!predictions) return;

    const exportData = {
      engine: predictions.engine,
      timestamp: new Date().toISOString(),
      predictions: predictions.predictions,
      summary: {
        total_predictions: predictions.total_predictions,
        total_issues: predictions.predictions.reduce(
          (sum: number, p: any) => sum + p.errors.length,
          0
        )
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `ai-predictions-${new Date().getTime()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Zap className="text-purple-600" size={28} />
          AI Translation Analysis
        </h1>
        <p className="text-gray-600 mt-1">Powered by AI with MQM Typology Classification</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'settings'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveTab('results')}
          disabled={!predictions}
          className={`px-6 py-3 font-medium ${
            activeTab === 'results'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800 disabled:text-gray-300'
          }`}
        >
          Results {predictions && `(${predictions.total_predictions})`}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <AISettings onEngineChange={setSelectedEngine} />

            {/* Analysis Section */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Run Analysis</h2>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Segments to analyze:</strong> {segments.length}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900">{error}</p>
                </div>
              )}

              <button
                onClick={handleRunAnalysis}
                disabled={loading || segments.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
              >
                {loading ? (
                  <>
                    <RotateCw size={18} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    Run AI Analysis
                  </>
                )}
              </button>
            </div>

            {/* Feature Info */}
            <div className="p-6 bg-white border border-gray-200 rounded-lg space-y-4">
              <h3 className="font-bold text-gray-800">AI Analysis Features</h3>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="text-2xl">🧠</div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Multiple AI Engines</h4>
                    <p className="text-sm text-gray-600">
                      Choose between OpenAI (GPT-4), Google Gemini, or Mock for testing
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <h4 className="font-semibold text-gray-800">MQM Classification</h4>
                    <p className="text-sm text-gray-600">
                      Errors categorized by Multidimensional Quality Metrics typology
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Severity Levels</h4>
                    <p className="text-sm text-gray-600">
                      Critical, Major, Minor, and Neutral issues with detailed suggestions
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="text-2xl">💬</div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Expert Commentary</h4>
                    <p className="text-sm text-gray-600">
                      Overall assessment and specific recommendations for each segment
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && predictions && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Analysis Results</h2>
              <button
                onClick={handleExportResults}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                <Download size={16} />
                Export JSON
              </button>
            </div>
            <AIPredictionResults
              predictions={predictions.predictions}
              engine={predictions.engine}
              loading={false}
            />
          </div>
        )}

        {/* Empty Results */}
        {activeTab === 'results' && !predictions && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-gray-600">Run analysis to see results</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisPanel;
