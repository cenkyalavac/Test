import React from 'react'
import { Zap } from 'lucide-react'
import { HeroIllustration } from './IllustrationHero'
import {
  SpeedIllustration,
  AccuracyIllustration,
  SecurityIllustration,
  IntegrationIllustration,
  SupportIllustration,
  AnalyticsIllustration
} from './FeatureIllustrations'

interface LandingPageProps {
  onGetStarted: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/50 bg-white/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">TranslateQA</h1>
          </div>
          <div className="flex gap-4">
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900">Docs</button>
            <button className="text-sm font-medium text-slate-600 hover:text-slate-900">Support</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center mb-20">
          <div className="inline-block mb-6 px-4 py-2 bg-blue-100/50 border border-blue-200 rounded-full">
            <p className="text-sm font-semibold text-blue-700">✨ Professional Translation QA Tool</p>
          </div>

          <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
            Ensure Perfect
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
              Translation Quality
            </span>
          </h2>

          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Upload your translation files and get instant quality analysis with AI-powered error detection. Catch issues before they matter.
          </p>

          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold text-lg hover:shadow-lg hover:shadow-blue-600/30 transition transform hover:scale-105 mb-8"
          >
            <Zap size={20} />
            Get Started Now
          </button>

          {/* Hero Illustration */}
          <div className="mt-16 mb-12">
            <HeroIllustration />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20">
            <div>
              <p className="text-3xl font-bold text-slate-900">16+</p>
              <p className="text-slate-600">Quality Checks</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">AI-Powered</p>
              <p className="text-slate-600">Error Detection</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">Real-time</p>
              <p className="text-slate-600">Analysis</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-slate-900 mb-4">Powerful Features</h3>
          <p className="text-slate-600">Everything you need for professional translation quality assurance</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-lg transition group">
            <SpeedIllustration />
            <h4 className="text-lg font-bold text-slate-900 mb-3">Lightning Fast</h4>
            <p className="text-slate-600 text-sm">
              Process hundreds of segments in seconds. 3 performance modes: Fast, Balanced, or Full analysis.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200 hover:border-green-300 hover:shadow-lg transition group">
            <AccuracyIllustration />
            <h4 className="text-lg font-bold text-slate-900 mb-3">High Accuracy</h4>
            <p className="text-slate-600 text-sm">
              10+ strict quality checks with false-positive prevention. Comprehensive QA with AI support.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-lg transition group">
            <SecurityIllustration />
            <h4 className="text-lg font-bold text-slate-900 mb-3">Secure & Private</h4>
            <p className="text-slate-600 text-sm">
              Enterprise-grade security. Files are processed securely and never permanently stored.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition group">
            <IntegrationIllustration />
            <h4 className="text-lg font-bold text-slate-900 mb-3">Multi-Format</h4>
            <p className="text-slate-600 text-sm">
              XLIFF, PO, JSON, and translation packages (SDL, MemoQ, Lionbridge formats supported).
            </p>
          </div>

          {/* Feature 5 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200 hover:border-pink-300 hover:shadow-lg transition group">
            <SupportIllustration />
            <h4 className="text-lg font-bold text-slate-900 mb-3">Expert Support</h4>
            <p className="text-slate-600 text-sm">
              Professional documentation, API access, and dedicated support for enterprise users.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="p-8 bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 hover:shadow-lg transition group">
            <AnalyticsIllustration />
            <h4 className="text-lg font-bold text-slate-900 mb-3">Deep Analytics</h4>
            <p className="text-slate-600 text-sm">
              Detailed charts, metrics, and reports. Track quality trends and improvements over time.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to improve your translation quality?</h3>
          <p className="text-blue-100 mb-8 text-lg">Start analyzing your files in seconds. No credit card required.</p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:shadow-lg transition transform hover:scale-105"
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-center text-slate-600">
            © 2024 TranslateQA. Professional Translation Quality Assurance.
          </p>
        </div>
      </footer>
    </div>
  )
}
