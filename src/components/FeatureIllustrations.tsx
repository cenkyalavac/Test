/**
 * Feature Illustration Components
 * SVG illustrations for each feature in the feature grid
 */

export function SpeedIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="w-20 h-20 mx-auto mb-4">
      <defs>
        <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#speedGrad)" opacity="0.1" />
      <circle cx="100" cy="100" r="70" fill="none" stroke="url(#speedGrad)" strokeWidth="2" />
      {/* Lightning bolt */}
      <path d="M 100 50 L 85 90 L 105 90 L 80 150 L 120 100 L 95 100 Z" fill="url(#speedGrad)" />
      {/* Speed lines */}
      <line x1="120" y1="70" x2="145" y2="65" stroke="url(#speedGrad)" strokeWidth="2" strokeLinecap="round" />
      <line x1="125" y1="100" x2="155" y2="100" stroke="url(#speedGrad)" strokeWidth="2" strokeLinecap="round" />
      <line x1="120" y1="130" x2="145" y2="135" stroke="url(#speedGrad)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function AccuracyIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="w-20 h-20 mx-auto mb-4">
      <defs>
        <linearGradient id="accuracyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#accuracyGrad)" opacity="0.1" />
      {/* Target circles */}
      <circle cx="100" cy="100" r="70" fill="none" stroke="url(#accuracyGrad)" strokeWidth="2" />
      <circle cx="100" cy="100" r="50" fill="none" stroke="url(#accuracyGrad)" strokeWidth="2" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="url(#accuracyGrad)" strokeWidth="2" />
      {/* Center dot */}
      <circle cx="100" cy="100" r="8" fill="url(#accuracyGrad)" />
      {/* Checkmark */}
      <path
        d="M 80 120 L 95 135 L 130 85"
        stroke="url(#accuracyGrad)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SecurityIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="w-20 h-20 mx-auto mb-4">
      <defs>
        <linearGradient id="securityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#securityGrad)" opacity="0.1" />
      {/* Shield */}
      <path
        d="M 100 50 L 140 70 L 140 110 C 140 140 100 160 100 160 C 100 160 60 140 60 110 L 60 70 Z"
        fill="none"
        stroke="url(#securityGrad)"
        strokeWidth="2"
      />
      {/* Lock */}
      <rect x="85" y="110" width="30" height="25" rx="2" fill="none" stroke="url(#securityGrad)" strokeWidth="2" />
      <path d="M 90 110 L 90 95 Q 90 85 100 85 Q 110 85 110 95 L 110 110" fill="none" stroke="url(#securityGrad)" strokeWidth="2" />
      <circle cx="100" cy="125" r="3" fill="url(#securityGrad)" />
    </svg>
  )
}

export function IntegrationIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="w-20 h-20 mx-auto mb-4">
      <defs>
        <linearGradient id="integrationGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#integrationGrad)" opacity="0.1" />
      {/* Left box */}
      <rect x="45" y="75" width="35" height="35" rx="4" fill="none" stroke="url(#integrationGrad)" strokeWidth="2" />
      {/* Right box */}
      <rect x="120" y="75" width="35" height="35" rx="4" fill="none" stroke="url(#integrationGrad)" strokeWidth="2" />
      {/* Connection line with arrow */}
      <line x1="80" y1="92" x2="120" y2="92" stroke="url(#integrationGrad)" strokeWidth="2" />
      <polygon points="120,92 110,87 110,97" fill="url(#integrationGrad)" />
      {/* Icons in boxes */}
      <circle cx="62" cy="92" r="4" fill="url(#integrationGrad)" />
      <circle cx="137" cy="92" r="4" fill="url(#integrationGrad)" />
    </svg>
  )
}

export function SupportIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="w-20 h-20 mx-auto mb-4">
      <defs>
        <linearGradient id="supportGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#supportGrad)" opacity="0.1" />
      {/* Headphones */}
      <path
        d="M 70 110 Q 70 140 100 140 Q 130 140 130 110"
        fill="none"
        stroke="url(#supportGrad)"
        strokeWidth="2"
      />
      <circle cx="60" cy="110" r="12" fill="none" stroke="url(#supportGrad)" strokeWidth="2" />
      <circle cx="140" cy="110" r="12" fill="none" stroke="url(#supportGrad)" strokeWidth="2" />
      <path d="M 85 75 Q 85 65 100 65 Q 115 65 115 75" fill="none" stroke="url(#supportGrad)" strokeWidth="2" />
      {/* Mic dot */}
      <circle cx="100" cy="130" r="3" fill="url(#supportGrad)" />
    </svg>
  )
}

export function AnalyticsIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="w-20 h-20 mx-auto mb-4">
      <defs>
        <linearGradient id="analyticsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="90" fill="url(#analyticsGrad)" opacity="0.1" />
      {/* Chart bars */}
      <rect x="55" y="110" width="12" height="25" rx="2" fill="url(#analyticsGrad)" />
      <rect x="75" y="95" width="12" height="40" rx="2" fill="url(#analyticsGrad)" />
      <rect x="95" y="80" width="12" height="55" rx="2" fill="url(#analyticsGrad)" />
      <rect x="115" y="100" width="12" height="35" rx="2" fill="url(#analyticsGrad)" />
      <line x1="50" y1="140" x2="135" y2="140" stroke="url(#analyticsGrad)" strokeWidth="1" />
      {/* Trend line */}
      <polyline
        points="60,125 80,115 100,105 120,120"
        fill="none"
        stroke="url(#analyticsGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
