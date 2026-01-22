/**
 * AI Engine Settings Component
 *
 * Allows users to configure API keys for OpenAI and Gemini,
 * and select the default AI engine for predictions.
 */

import React, { useState, useEffect } from 'react';
import { Settings, Check, Eye, EyeOff } from 'lucide-react';

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

  // Fetch configured engines on mount
  useEffect(() => {
    fetchConfiguredEngines();
  }, []);

  const fetchConfiguredEngines = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/config/engines');
      const data = await response.json();
      setConfiguredEngines(data.configured_engines);
      setDefaultEngine(data.default_engine);
    } catch (error) {
      console.error('Failed to fetch engines:', error);
    }
  };

  const handleSetOpenAIKey = async () => {
    if (!openAIKey.trim()) {
      setMessage('Please enter an OpenAI API key');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/config/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'openai',
          api_key: openAIKey
        })
      });

      if (response.ok) {
        setMessage('OpenAI key saved successfully');
        setOpenAIKey('');
        fetchConfiguredEngines();
      } else {
        setMessage('Failed to save OpenAI key');
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetGeminiKey = async () => {
    if (!geminiKey.trim()) {
      setMessage('Please enter a Gemini API key');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/config/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'gemini',
          api_key: geminiKey
        })
      });

      if (response.ok) {
        setMessage('Gemini key saved successfully');
        setGeminiKey('');
        fetchConfiguredEngines();
      } else {
        setMessage('Failed to save Gemini key');
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefaultEngine = async (engine: string) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/config/default-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine })
      });

      if (response.ok) {
        setDefaultEngine(engine);
        onEngineChange?.(engine);
        setMessage(`Default engine set to ${engine}`);
      } else {
        setMessage('Failed to set default engine');
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Settings Toggle Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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
            <div className={`mb-4 p-3 rounded text-sm ${
              message.includes('success') || message.includes('successfully')
                ? 'bg-green-100 text-green-800'
                : message.includes('Error')
                ? 'bg-red-100 text-red-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {message}
            </div>
          )}

          {/* Configured Engines Status */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Configured Engines</h3>
            <div className="grid grid-cols-3 gap-4">
              {configuredEngines.map((engine) => (
                <div
                  key={engine.engine}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                    defaultEngine === engine.engine
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 bg-gray-50 hover:border-purple-300'
                  }`}
                  onClick={() => handleSetDefaultEngine(engine.engine)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-800 capitalize">
                      {engine.engine}
                    </span>
                    {engine.configured && <Check size={18} className="text-green-600" />}
                  </div>
                  <div className="text-xs text-gray-600">{engine.key_preview}</div>
                  {defaultEngine === engine.engine && (
                    <div className="text-xs text-purple-600 font-semibold mt-2">
                      ✓ Default Engine
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* API Key Configuration */}
          <div className="space-y-6">
            {/* OpenAI Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">OpenAI Configuration</h3>
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showOpenAIKey ? 'text' : 'password'}
                      value={openAIKey}
                      onChange={(e) => setOpenAIKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showOpenAIKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Get your API key from <a href="https://platform.openai.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">platform.openai.com</a>
                  </p>
                </div>
                <button
                  onClick={handleSetOpenAIKey}
                  disabled={loading || !openAIKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  Save OpenAI Key
                </button>
              </div>
            </div>

            {/* Gemini Configuration */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Google Gemini Configuration</h3>
              <div className="space-y-3">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gemini API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showGeminiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Get your API key from <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">ai.google.dev</a>
                  </p>
                </div>
                <button
                  onClick={handleSetGeminiKey}
                  disabled={loading || !geminiKey.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  Save Gemini Key
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> API keys are stored in the backend and never transmitted to third parties.
              Use the 'Mock' engine for testing without API keys.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISettings;
