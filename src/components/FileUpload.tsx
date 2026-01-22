import { useRef, useState } from 'react'
import { Cloud, Upload, CheckCircle, FileText, Zap, Shield } from 'lucide-react'
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
    <div className="w-full space-y-6">
      {/* Main Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative w-full rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden group ${
          isDragging
            ? 'bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-2 border-blue-400 shadow-lg shadow-blue-500/30 scale-[1.02]'
            : 'bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-dashed border-slate-600 hover:border-slate-500 hover:from-slate-600 hover:to-slate-700'
        }`}
      >
        <div className="p-16">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept={allFormats.join(',')}
          />

          <div className="flex flex-col items-center justify-center">
            {/* Icon with animation */}
            <div className={`relative mb-6 transition-all duration-300 ${isDragging ? 'scale-125 text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`}>
              <Cloud className="w-20 h-20" />
              <Upload className={`w-8 h-8 absolute -bottom-2 -right-2 transition-all duration-300 ${isDragging ? 'text-blue-300' : 'text-slate-300'}`} />
            </div>

            {/* Main Text */}
            <h2 className="text-3xl font-bold text-white mb-3 text-center">
              {isDragging ? 'Drop your file here' : 'Upload Translation File'}
            </h2>

            <p className="text-slate-300 mb-6 text-center max-w-md leading-relaxed">
              {isDragging
                ? 'Release to upload your translation file'
                : 'Drag and drop your translation file here, or click to browse'}
            </p>

            {/* Supported Formats */}
            <div className="mb-8 w-full max-w-2xl">
              <p className="text-sm text-slate-400 mb-3 text-center font-semibold">Supported Formats:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {allFormats.map((format) => (
                  <div
                    key={format}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isDragging
                        ? 'bg-blue-600/30 text-blue-200 border border-blue-400'
                        : 'bg-slate-600 text-slate-200 border border-slate-500 group-hover:bg-slate-500'
                    }`}
                  >
                    {format}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={handleClick}
              className={`px-8 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${
                isDragging
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
              }`}
            >
              <FileText size={20} />
              Choose File
            </button>

            {/* Size Info */}
            <p className="text-xs text-slate-500 mt-6 text-center">
              Maximum file size: {MAX_FILE_SIZE / 1024 / 1024}MB
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          icon={<Zap className="w-5 h-5" />}
          title="Fast Processing"
          description="Analyze translation files instantly with advanced QA checks"
        />
        <FeatureCard
          icon={<Shield className="w-5 h-5" />}
          title="Secure & Safe"
          description="Your files are processed locally and never stored"
        />
        <FeatureCard
          icon={<CheckCircle className="w-5 h-5" />}
          title="16+ QA Checks"
          description="Comprehensive quality assurance with spelling, consistency checks and more"
        />
      </div>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="p-4 rounded-lg bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-slate-600 hover:border-slate-500 transition-all group cursor-default">
      <div className="flex items-start gap-3">
        <div className="text-blue-400 mt-1 group-hover:text-blue-300 transition-colors">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold text-white mb-1">{title}</h4>
          <p className="text-sm text-slate-300">{description}</p>
        </div>
      </div>
    </div>
  )
}
