/**
 * Hero Illustration Component
 * Modern animated SVG banner for hero section
 */

export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 1200 400"
      className="w-full h-auto max-w-4xl mx-auto"
      style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.1))' }}
    >
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="heroGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <linearGradient id="heroGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background shapes */}
      <circle cx="100" cy="80" r="60" fill="url(#heroGrad1)" opacity="0.1" />
      <circle cx="1100" cy="320" r="80" fill="url(#heroGrad2)" opacity="0.1" />
      <rect x="600" y="50" width="3" height="300" fill="url(#heroGrad1)" opacity="0.2" />

      {/* Document/File icon (left) */}
      <g transform="translate(150, 100)">
        <rect x="0" y="0" width="140" height="200" rx="12" fill="white" stroke="url(#heroGrad1)" strokeWidth="2" />
        <rect x="15" y="20" width="110" height="15" rx="3" fill="url(#heroGrad1)" />
        <rect x="15" y="45" width="110" height="8" rx="2" fill="#E5E7EB" />
        <rect x="15" y="60" width="110" height="8" rx="2" fill="#E5E7EB" />
        <rect x="15" y="75" width="70" height="8" rx="2" fill="#E5E7EB" />
        <rect x="15" y="95" width="110" height="8" rx="2" fill="#E5E7EB" />
        <rect x="15" y="110" width="110" height="8" rx="2" fill="#E5E7EB" />
        <rect x="15" y="125" width="90" height="8" rx="2" fill="#E5E7EB" />
      </g>

      {/* Upload arrow (center-top) */}
      <g transform="translate(600, 60)" filter="url(#glow)">
        <circle cx="0" cy="0" r="40" fill="url(#heroGrad1)" />
        <path
          d="M -10 8 L 0 -8 L 10 8 M 0 -8 L 0 12"
          stroke="white"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Check marks (right side) - quality indicators */}
      <g transform="translate(900, 100)">
        {/* First check */}
        <circle cx="0" cy="0" r="25" fill="#10B981" opacity="0.2" />
        <path
          d="M -10 0 L -2 8 L 12 -8"
          stroke="#10B981"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Second check */}
        <circle cx="50" cy="40" r="25" fill="#10B981" opacity="0.2" />
        <path
          d="M 40 40 L 48 48 L 62 32"
          stroke="#10B981"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Third check */}
        <circle cx="0" cy="90" r="25" fill="#10B981" opacity="0.2" />
        <path
          d="M -10 90 L -2 98 L 12 82"
          stroke="#10B981"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Chart bars (bottom-left) - analytics */}
      <g transform="translate(120, 280)">
        <rect x="0" y="50" width="20" height="80" rx="4" fill="url(#heroGrad1)" />
        <rect x="30" y="30" width="20" height="100" rx="4" fill="url(#heroGrad1)" opacity="0.7" />
        <rect x="60" y="60" width="20" height="70" rx="4" fill="url(#heroGrad1)" opacity="0.5" />
        <line x1="-10" y1="130" x2="100" y2="130" stroke="#D1D5DB" strokeWidth="1" />
      </g>

      {/* Settings/Tool icon (bottom-right) */}
      <g transform="translate(920, 280)">
        <circle cx="0" cy="0" r="35" fill="white" stroke="url(#heroGrad2)" strokeWidth="2" />
        <circle cx="0" cy="0" r="8" fill="url(#heroGrad2)" />
        {/* Gear teeth */}
        <g stroke="url(#heroGrad2)" strokeWidth="2" fill="none">
          <rect x="-4" y="-28" width="8" height="8" rx="1" />
          <rect x="-4" y="20" width="8" height="8" rx="1" />
          <rect x="-28" y="-4" width="8" height="8" rx="1" />
          <rect x="20" y="-4" width="8" height="8" rx="1" />
        </g>
      </g>

      {/* Animated pulse circles */}
      <circle cx="600" cy="200" r="60" fill="none" stroke="url(#heroGrad1)" strokeWidth="2" opacity="0.3">
        <animate attributeName="r" from="60" to="120" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.3" to="0" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Text labels */}
      <text x="150" y="320" fontSize="16" fontWeight="600" fill="#374151" textAnchor="middle">
        Upload
      </text>
      <text x="600" y="320" fontSize="16" fontWeight="600" fill="#374151" textAnchor="middle">
        Process
      </text>
      <text x="950" y="320" fontSize="16" fontWeight="600" fill="#374151" textAnchor="middle">
        Validate
      </text>
    </svg>
  )
}
