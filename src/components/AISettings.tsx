/**
 * AI Engine Settings Component
 *
 * Allows users to configure API keys for OpenAI and Gemini,
 * and select the default AI engine for predictions.
 *
 * IMPORTANT: API keys are never stored in frontend state after submission.
 * Keys are sent to backend for secure storage.
 */

import React, { useState, useEffect } from 'react';
import { Settings, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS, VALIDATION } from '../config';

interface EngineConfig {
  engine: string;
  configured: boolean;
  key_preview: string;
}

interface AISettingsProps {
  onEngineChange?: (engine: string) => void;
}

export const AISettings: React.FC<AISettingsProps> = ({ onEngineChange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [openAIKey, setOpenAIKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [defaultEngine, setDefaultEngine] = useState('mock');
  const [configuredEngines, setConfiguredEngines] = useState<EngineConfig[]>([]);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // Fetch configured engines on mount with cleanup
  useEffect(() => {
    let isMounted = true;

    const fetchEngines = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.CONFIG_ENGINES);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch engines`);
        }

        const data = await response.json();

        if (isMounted) {
          if (!Array.isArray(data.configured_engines)) {
            throw new Error('Invalid response format: expected configured_engines array');
          }

          setConfiguredEngines(data.configured_engines);
          setDefaultEngine(data.default_engine ?? 'mock');
        }
      } catch (error) {
        if (isMounted) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch engines';
          setMessage(errorMessage);
          setMessageType('error');
          console.error('Fetch engines error:', error);
        }
      }
    };

    fetchEngines();

    return () => {
      isMounted = false; // Prevent state updates on unmounted component
    };
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(text);
    setMessageType(type);

    // Auto-clear success messages after 5 seconds
    if (type === 'success') {
      const timer = setTimeout(() => {
        if (document) setMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  };

  const handleSetOpenAIKey = async () => {
    const trimmedKey = openAIKey.trim();

    if (!trimmedKey) {
      showFeedback('Please enter an OpenAI API key', 'error');
      return;
    }

    if (trimmedKey.length < VALIDATION.MIN_API_KEY_LENGTH) {
      showFeedback(`API key must be at least ${VALIDATION.MIN_API_KEY_LENGTH} characters`, 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CONFIG_AI_KEYS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'openai',
          api_key: trimmedKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save OpenAI key' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      showFeedback('OpenAI key saved successfully', 'success');
      setOpenAIKey(''); // Clear from state immediately

      // Refresh engine list
      const enginesResponse = await fetch(API_ENDPOINTS.CONFIG_ENGINES);
      if (enginesResponse.ok) {
        const data = await enginesResponse.json();
        if (Array.isArray(data.configured_engines)) {
          setConfiguredEngines(data.configured_engines);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showFeedback(`Error: ${errorMessage}`, 'error');
      console.error('Set OpenAI key error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetGeminiKey = async () => {
    const trimmedKey = geminiKey.trim();

    if (!trimmedKey) {
      showFeedback('Please enter a Gemini API key', 'error');
      return;
    }

    if (trimmedKey.length < VALIDATION.MIN_API_KEY_LENGTH) {
      showFeedback(`API key must be at least ${VALIDATION.MIN_API_KEY_LENGTH} characters`, 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CONFIG_AI_KEYS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'gemini',
          api_key: trimmedKey
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save Gemini key' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      showFeedback('Gemini key saved successfully', 'success');
      setGeminiKey(''); // Clear from state immediately

      // Refresh engine list
      const enginesResponse = await fetch(API_ENDPOINTS.CONFIG_ENGINES);
      if (enginesResponse.ok) {
        const data = await enginesResponse.json();
        if (Array.isArray(data.configured_engines)) {
          setConfiguredEngines(data.configured_engines);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showFeedback(`Error: ${errorMessage}`, 'error');
      console.error('Set Gemini key error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultEngine = async (engine: string) => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CONFIG_DEFAULT_ENGINE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to set engine' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      setDefaultEngine(engine);
      onEngineChange?.(engine);
      showFeedback(`Default engine set to ${engine}`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showFeedback(`Error: ${errorMessage}`, 'error');
      console.error('Set default engine error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMessageStyle = () => {
    switch (messageType) {
      case 'success':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'error':
        return 'bg-red-100 text-red-800 border border-red-300';
      default:
        return 'bg-blue-100 text-blue-800 border border-blue-300';
    }
  };

  return (
    <div className="w-full">
      {/* Settings Toggle Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        aria-expanded={showSettings}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
      >
        <Settings size={18} />
        AI Settings
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mt-4 p-6 bg-white border border-gray-200 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-6 text-gray-800">AI Engine Configuration</h2>

          {/* Message Display */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${getMessageStyle()}`}>
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p>{message}</p>
              </div>
              <button
                onClick={() => setMessage('')}
                className="text-current hover:opacity-70 flex-shrink-0"
                aria-label="Dismiss message"
              >
                ×
              </button>
            </div>
          )}

          {/* Configured Engines Status */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Configured Engines</h3>
            <div className="grid grid-cols-3 gap-4">
              {configuredEngines.length > 0 ? (
                configuredEngines.map((engine) => (
                  <button
                    key={engine.engine}
                    onClick={() => handleSetDefaultEngine(engine.engine)}
                    disabled={loading}
                    className={`p-4 rounded-lg border-2 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      defaultEngine === engine.engine
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 bg-gray-50 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-800 capitalize">
                        {engine.engine}
                      </span>
                      {engine.configured && <Check size={18} className="text-green-600" />}
                    </div>
                    <div className="text-xs text-gray-600 text-left">{engine.key_preview}</div>
                    {defaultEngine === engine.engine && (
                      <div className="text-xs text-purple-600 font-semibold mt-2">
                        ✓ Default Engine
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <p className="col-span-3 text-gray-500 text-sm">No engines configured yet</p>
              )}
            </div>
          </div>

          {/* API Key Configuration */}
          <div className="space-y-6">
            {/* OpenAI Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">OpenAI Configuration</h3>
              <div className="space-y-3">
                <div className="relative">
                  <label htmlFor="openai-key" className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <div className="relative">
                    <input
                      id="openai-key"
                      type={showOpenAIKey ? 'text' : 'password'}
                      value={openAIKey}
                      onChange={(e) => setOpenAIKey(e.target.value)}
                      placeholder="sk-..."
                      disabled={loading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      aria-label={showOpenAIKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showOpenAIKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Get your API key from{' '}
                    <a
                      href="https://platform.openai.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      platform.openai.com
                    </a>
                  </p>
                </div>
                <button
                  onClick={handleSetOpenAIKey}
                  disabled={loading || !openAIKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
                >
                  {loading ? 'Saving...' : 'Save OpenAI Key'}
                </button>
              </div>
            </div>

            {/* Gemini Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Google Gemini Configuration</h3>
              <div className="space-y-3">
                <div className="relative">
                  <label htmlFor="gemini-key" className="block text-sm font-medium text-gray-700 mb-2">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      id="gemini-key"
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      disabled={loading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                      aria-label={showGeminiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showGeminiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Get your API key from{' '}
                    <a
                      href="https://ai.google.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline"
                    >
                      ai.google.dev
                    </a>
                  </p>
                </div>
                <button
                  onClick={handleSetGeminiKey}
                  disabled={loading || !geminiKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold"
                >
                  {loading ? 'Saving...' : 'Save Gemini Key'}
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Security Note:</strong> API keys are sent securely to the backend and never stored in browser state
              or local storage. Use the 'Mock' engine for testing without API keys.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISettings;
