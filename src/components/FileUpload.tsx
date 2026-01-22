import { useRef, useState } from 'react'
import { Zap, Shield, CheckCircle, Sparkles, Lock, Gauge } from 'lucide-react'
import { SUPPORTED_FORMATS, MAX_FILE_SIZE } from '../config'

interface FileUploadProps {
  onFileSelect: (file: File | { name: string; size: number } | null) => void
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev + 1)
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCounter(prev => prev - 1)
    if (dragCounter <= 1) {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDragCounter(0)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      processFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const processFile = (file: File) => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    // Validate file extension
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}` as any
    const allSupported: string[] = [
      ...SUPPORTED_FORMATS.XLIFF,
      ...SUPPORTED_FORMATS.PO,
      ...SUPPORTED_FORMATS.JSON,
      ...SUPPORTED_FORMATS.PACKAGES
    ] as any

    if (!allSupported.includes(ext)) {
      alert(`File format not supported. Allowed: ${allSupported.join(', ')}`)
      return
    }

    onFileSelect(file)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const allFormats: string[] = [
    ...SUPPORTED_FORMATS.XLIFF,
    ...SUPPORTED_FORMATS.PO,
    ...SUPPORTED_FORMATS.JSON,
    ...SUPPORTED_FORMATS.PACKAGES
  ] as any

  return (
    <div className="w-full space-y-12">
      {/* Hero Section with Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative w-full rounded-3xl cursor-pointer transition-all duration-500 overflow-hidden group ${
          isDragging
            ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 border-2 border-white/50 shadow-2xl shadow-blue-500/60 scale-[1.02]'
            : 'bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 border-2 border-dashed border-purple-500/40 hover:border-purple-400/70 hover:from-indigo-900 hover:to-purple-900'
        }`}
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept=".xliff,.xlf,.xml,.json,.po,.yaml,.yml,.csv,.properties,.xlz,.wsxz,.sdlppx,.sdlrpx,.mqout,.sdlxliff,.mqxliff,.mxliff"
        />

        <div className="relative z-10 p-20 flex flex-col items-center justify-center min-h-96">
          {/* Icon Animation */}
          <div className={`mb-8 transition-all duration-300 ${isDragging ? 'scale-150' : 'scale-100 group-hover:scale-110'}`}>
            <div className={`relative inline-block ${isDragging ? 'text-white' : 'text-purple-300 group-hover:text-white'}`}>
              <svg className="w-32 h-32 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className={`text-5xl md:text-6xl font-bold text-center mb-4 transition-all duration-300 ${
            isDragging
              ? 'text-white drop-shadow-lg'
              : 'bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent group-hover:from-blue-200 group-hover:via-purple-200 group-hover:to-pink-200'
          }`}>
            {isDragging ? 'Drop Your File' : 'Upload Translation File'}
          </h1>

          {/* Subtitle */}
          <p className={`text-lg text-center mb-8 max-w-xl transition-colors duration-300 ${
            isDragging ? 'text-white/90' : 'text-slate-300 group-hover:text-slate-100'
          }`}>
            {isDragging
              ? 'Release to analyze your translation file instantly'
              : 'Drag your translation file here, or click anywhere to browse'}
          </p>

          {/* Supported Formats - Below Upload Area */}
          <div className="mt-8 text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Supported Formats
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {allFormats.map((format) => (
                <span
                  key={format}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isDragging
                      ? 'bg-white/20 text-white border border-white/50'
                      : 'bg-slate-800/50 text-slate-300 border border-slate-600/50 group-hover:bg-slate-700/50 group-hover:text-slate-100'
                  }`}
                >
                  {format}
                </span>
              ))}
            </div>

            {/* File Size Info */}
            <p className="text-xs text-slate-500">
              Maximum file size: {MAX_FILE_SIZE / 1024 / 1024}MB • Processes locally & securely
            </p>
          </div>
        </div>
      </div>

      {/* Features Bento Grid - 3 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard
          icon={<Gauge className="w-6 h-6" />}
          title="16+ QA Checks"
          description="Comprehensive quality assurance with spelling, consistency, formatting, and more"
          gradient="from-blue-900/20 to-blue-800/10"
        />
        <FeatureCard
          icon={<Zap className="w-6 h-6" />}
          title="Real-Time Analysis"
          description="Instant processing of translation files with AI-powered insights"
          gradient="from-purple-900/20 to-purple-800/10"
        />
        <FeatureCard
          icon={<Lock className="w-6 h-6" />}
          title="Secure & Private"
          description="Your files are processed locally and never stored on our servers"
          gradient="from-pink-900/20 to-pink-800/10"
        />
        <FeatureCard
          icon={<Sparkles className="w-6 h-6" />}
          title="AI Predictions"
          description="Advanced error detection using OpenAI GPT-4 and Google Gemini"
          gradient="from-amber-900/20 to-amber-800/10"
        />
        <FeatureCard
          icon={<CheckCircle className="w-6 h-6" />}
          title="Multi-Format Support"
          description="XLIFF, PO, JSON, and translation packages (SDLXLIFF, MemoQ, etc.)"
          gradient="from-emerald-900/20 to-emerald-800/10"
        />
        <FeatureCard
          icon={<Shield className="w-6 h-6" />}
          title="Enterprise Grade"
          description="Professional platform trusted by translation teams worldwide"
          gradient="from-cyan-900/20 to-cyan-800/10"
        />
      </div>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}

function FeatureCard({ icon, title, description, gradient }: FeatureCardProps) {
  return (
    <div className={`group relative rounded-2xl bg-gradient-to-br ${gradient} backdrop-blur-xl border border-white/10 hover:border-white/20 p-6 transition-all duration-300 cursor-default hover:shadow-xl hover:shadow-purple-500/20 transform hover:scale-105 overflow-hidden`}>
      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10">
        <div className="text-white/70 group-hover:text-white transition-colors mb-3">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-white/95 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  )
}
