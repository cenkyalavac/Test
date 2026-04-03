import { useRef, useState } from 'react'
import { Upload, AlertCircle, X, Zap, Shield, Cpu } from 'lucide-react'
import { SUPPORTED_FORMATS, MAX_FILE_SIZE } from '../config'

interface ModernFileUploadProps {
  onFileSelect: (file: File) => void
}

export default function ModernFileUpload({ onFileSelect }: ModernFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const processFile = (file: File) => {
    setValidationError(null)

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setValidationError(`File too large. Maximum: ${MAX_FILE_SIZE / 1024 / 1024}MB`)
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
      setValidationError(`File format not supported: ${ext}`)
      return
    }

    onFileSelect(file)
  }

  const allFormats: string[] = [
    ...SUPPORTED_FORMATS.XLIFF,
    ...SUPPORTED_FORMATS.PO,
    ...SUPPORTED_FORMATS.JSON,
    ...SUPPORTED_FORMATS.PACKAGES
  ] as any

  return (
    <div className="space-y-8">
      {/* Error Alert */}
      {validationError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold">Validation Error</h3>
            <p className="text-sm mt-1">{validationError}</p>
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="text-red-400 hover:text-red-300 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Upload Area - Large Central Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl cursor-pointer border-2 border-dashed transition-all p-20 text-center flex flex-col items-center justify-center min-h-64 group overflow-hidden ${
          isDragging
            ? 'border-blue-400 bg-blue-500/10'
            : validationError
            ? 'border-red-400 bg-red-500/10'
            : 'border-white/20 bg-white/3 hover:border-blue-400 hover:bg-blue-500/5'
        }`}
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition"></div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept=".xliff,.xlf,.xml,.json,.po,.yaml,.yml,.csv,.properties,.xlz,.wsxz,.sdlppx,.sdlrpx,.mqout,.sdlxliff,.mqxliff,.mxliff,.zip"
        />

        <div className={`transition-all relative z-10 ${isDragging ? 'scale-110' : 'scale-100'}`}>
          <div className="flex justify-center mb-6">
            <div className={`p-5 rounded-full transition ${isDragging ? 'bg-blue-600/40' : 'bg-blue-500/20'}`}>
              <Upload className={`w-10 h-10 ${isDragging ? 'text-blue-300' : 'text-blue-400'}`} />
            </div>
          </div>

          <h3 className="text-3xl font-bold text-white mb-3">
            {isDragging ? '✨ Drop your file here' : 'Drag & drop your file'}
          </h3>

          <p className="text-slate-300 mb-4 text-lg">
            or click to browse
          </p>

          <p className="text-xs text-slate-400">
            Maximum file size: {MAX_FILE_SIZE / 1024 / 1024}MB
          </p>
        </div>
      </div>

      {/* Supported Formats */}
      <div>
        <p className="text-sm font-semibold text-slate-300 mb-4 block text-center">
          Supported Formats
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {allFormats.map((format) => (
            <span
              key={format}
              className="px-3 py-1 bg-white/5 border border-white/10 text-white/70 text-xs font-medium rounded-full hover:bg-white/10 hover:text-white transition"
            >
              {format}
            </span>
          ))}
        </div>
      </div>

      {/* Benefits - Modern Cards */}
      <div className="grid md:grid-cols-3 gap-6 pt-8">
        <div className="group relative bg-gradient-to-br from-blue-600/20 to-blue-700/10 hover:from-blue-600/30 hover:to-blue-700/20 backdrop-blur-xl text-center p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/40 transition overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 opacity-0 group-hover:opacity-5 transition"></div>
          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
            <h4 className="font-semibold text-white mb-1">Fast Processing</h4>
            <p className="text-sm text-slate-400">Get results in seconds</p>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-green-600/20 to-green-700/10 hover:from-green-600/30 hover:to-green-700/20 backdrop-blur-xl text-center p-6 rounded-xl border border-green-500/20 hover:border-green-500/40 transition overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 opacity-0 group-hover:opacity-5 transition"></div>
          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="font-semibold text-white mb-1">Secure</h4>
            <p className="text-sm text-slate-400">Your data is never stored</p>
          </div>
        </div>

        <div className="group relative bg-gradient-to-br from-purple-600/20 to-purple-700/10 hover:from-purple-600/30 hover:to-purple-700/20 backdrop-blur-xl text-center p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 opacity-0 group-hover:opacity-5 transition"></div>
          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              <Cpu className="w-6 h-6 text-purple-400" />
            </div>
            <h4 className="font-semibold text-white mb-1">Reliable</h4>
            <p className="text-sm text-slate-400">Enterprise-grade processing</p>
          </div>
        </div>
      </div>
    </div>
  )
}
