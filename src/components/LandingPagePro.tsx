import React from 'react'
import { Zap, CheckCircle2, Shield, BarChart3, Zap as Lightning, Lock } from 'lucide-react'

interface LandingPageProProps {
  onGetStarted: () => void
}

export const LandingPagePro: React.FC<LandingPageProProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="navbar bg-slate-900/50 backdrop-blur sticky top-0 z-50 border-b border-slate-700">
        <div className="flex-1">
          <button className="btn btn-ghost text-xl">
            <Zap className="w-6 h-6 text-blue-500" />
            TranslateQA Pro
          </button>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm">Docs</button>
          <button className="btn btn-ghost btn-sm">Support</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900">
        <div className="hero-content text-center">
          <div className="max-w-3xl">
            <div className="badge badge-lg gap-2 mb-6 bg-blue-900/50 text-blue-300 border-blue-700">
              <Zap className="w-4 h-4" />
              AI-Powered Quality Assurance
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Perfect Translations,
              <br />
              Every Time
            </h1>

            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Upload your translation files and get instant quality analysis. Catch issues before they matter. AI-powered error detection with 16+ quality checks.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={onGetStarted}
                className="btn btn-primary btn-lg gap-2"
              >
                <Zap className="w-5 h-5" />
                Get Started Free
              </button>
              <button className="btn btn-outline btn-lg text-slate-200 border-slate-600 hover:border-slate-400">
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-16">
              <div className="stat bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="stat-title text-slate-300">Quality Checks</div>
                <div className="stat-value text-blue-400 text-3xl">16+</div>
              </div>
              <div className="stat bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="stat-title text-slate-300">Processing Speed</div>
                <div className="stat-value text-cyan-400 text-3xl">&lt;5s</div>
              </div>
              <div className="stat bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="stat-title text-slate-300">Accuracy Rate</div>
                <div className="stat-value text-emerald-400 text-3xl">99%+</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-800/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-slate-300 text-lg">Everything you need for professional translation QA</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card bg-slate-700/50 border border-slate-600 hover:border-blue-500 transition group">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="card-title text-blue-400 mb-3">16+ Quality Checks</h3>
                    <p className="text-slate-300">
                      Comprehensive QA including spelling, consistency, tags, numbers, URLs, and translation integrity.
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-blue-500 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="card bg-slate-700/50 border border-slate-600 hover:border-cyan-500 transition group">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="card-title text-cyan-400 mb-3">AI Error Detection</h3>
                    <p className="text-slate-300">
                      Advanced AI models predict translation errors before they reach customers.
                    </p>
                  </div>
                  <Lightning className="w-8 h-8 text-cyan-500 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="card bg-slate-700/50 border border-slate-600 hover:border-emerald-500 transition group">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="card-title text-emerald-400 mb-3">Detailed Analytics</h3>
                    <p className="text-slate-300">
                      Charts, metrics, and reports for actionable insights on translation quality.
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="card bg-slate-700/50 border border-slate-600 hover:border-purple-500 transition group">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="card-title text-purple-400 mb-3">Secure & Private</h3>
                    <p className="text-slate-300">
                      Enterprise-grade security. Your files never stored permanently on our servers.
                    </p>
                  </div>
                  <Shield className="w-8 h-8 text-purple-500 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Feature 5 */}
            <div className="card bg-slate-700/50 border border-slate-600 hover:border-pink-500 transition group">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="card-title text-pink-400 mb-3">Multi-Format Support</h3>
                    <p className="text-slate-300">
                      XLIFF, PO, JSON, and translation packages (SDL, MemoQ, Lionbridge).
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-pink-500 flex-shrink-0" />
                </div>
              </div>
            </div>

            {/* Feature 6 */}
            <div className="card bg-slate-700/50 border border-slate-600 hover:border-yellow-500 transition group">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="card-title text-yellow-400 mb-3">Multiple Parsers</h3>
                    <p className="text-slate-300">
                      Choose between lxml and translate-toolkit parsers for maximum compatibility.
                    </p>
                  </div>
                  <Lock className="w-8 h-8 text-yellow-500 flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border-t border-slate-700">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to improve your translation quality?</h2>
          <p className="text-xl text-slate-300 mb-8">Start analyzing your files in seconds. No credit card required.</p>
          <button
            onClick={onGetStarted}
            className="btn btn-primary btn-lg gap-2"
          >
            <Zap className="w-5 h-5" />
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer bg-slate-900 border-t border-slate-700 text-slate-400">
        <div className="footer-content">
          <p>© 2024 TranslateQA. Professional Translation Quality Assurance.</p>
        </div>
      </footer>
    </div>
  )
}
