/**
 * Application Configuration
 * Handles environment-based settings for API endpoints and other config
 */

/**
 * Determine API base URL based on environment
 * - Production (same server): Empty string or '/' for relative paths
 * - Development (localhost): http://localhost:8000 for separate backend
 * - Environment override: VITE_API_URL takes precedence
 */
function getApiBaseUrl(): string {
  // 1. Check environment variable first (takes precedence)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    console.log('Using API URL from environment:', envUrl);
    return envUrl;
  }

  // 2. Development: localhost with separate backend server
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    const localUrl = 'http://localhost:8000';
    console.log('Using local development URL:', localUrl);
    return localUrl;
  }

  // 3. Production: same server deployment (Railway, Netlify, etc.)
  // Use relative paths for API calls to same origin
  console.log('Using same-origin API calls (relative paths)');
  return '';
}

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  PARSE: `${API_BASE_URL}/api/files/parse`,
  QA_CHECK: `${API_BASE_URL}/api/qa/check`,
  PREDICT: `${API_BASE_URL}/api/ai/predict`,
  CONFIG_ENGINES: `${API_BASE_URL}/api/config/engines`,
  CONFIG_AI_KEYS: `${API_BASE_URL}/api/config/ai-keys`,
  CONFIG_DEFAULT_ENGINE: `${API_BASE_URL}/api/config/default-engine`,
  CHECKLIST_PARSE: `${API_BASE_URL}/api/checklists/parse`,
  HEALTH: `${API_BASE_URL}/api/health`,
} as const;

// Supported AI engines
export const AI_ENGINES = {
  OPENAI: 'openai',
  GEMINI: 'gemini',
  MOCK: 'mock',
} as const;

// Supported file formats
export const SUPPORTED_FORMATS = {
  XLIFF: ['.xliff', '.xlf', '.xml', '.sdlxliff', '.mqxliff', '.mxliff'],
  PO: ['.po'],
  JSON: ['.json'],
  PACKAGES: ['.xlz', '.wsxz', '.sdlppx', '.sdlrpx', '.mqout'],
} as const;

// Maximum file size (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// UI Configuration
export const UI_CONFIG = {
  ITEMS_PER_PAGE: 25,
  TOAST_TIMEOUT: 5000,
  MAX_RETRY_ATTEMPTS: 3,
} as const;

// Validation rules
export const VALIDATION = {
  MIN_API_KEY_LENGTH: 10,
  MAX_SEGMENT_DISPLAY: 10,
  MATCH_PERCENTAGE_RANGE: { MIN: 0, MAX: 100 },
} as const;

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  AI_ENGINES,
  SUPPORTED_FORMATS,
  MAX_FILE_SIZE,
  UI_CONFIG,
  VALIDATION,
};
