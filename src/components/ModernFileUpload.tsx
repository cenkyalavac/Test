import { useRef, useState } from 'react'
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
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
        <div className="alert alert-error shadow-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold">Validation Error</h3>
              <p className="text-sm mt-1">{validationError}</p>
            </div>
            <button
              onClick={() => setValidationError(null)}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl cursor-pointer border-2 border-dashed transition-all p-16 text-center flex flex-col items-center justify-center ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : validationError
            ? 'border-red-400 bg-red-50'
            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          accept=".xliff,.xlf,.xml,.json,.po,.yaml,.yml,.csv,.properties,.xlz,.wsxz,.sdlppx,.sdlrpx,.mqout,.sdlxliff,.mqxliff,.mxliff,.zip"
        />

        <div className={`transition-transform ${isDragging ? 'scale-110' : 'scale-100'}`}>
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-200' : 'bg-blue-100'}`}>
              <Upload className={`w-8 h-8 ${isDragging ? 'text-blue-600' : 'text-blue-500'}`} />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-slate-800 mb-3">
            {isDragging ? 'Drop your file here' : 'Click or drag to upload'}
          </h3>

          <p className="text-slate-600 mb-4">
            Select your translation file or zip archive
          </p>

          <p className="text-xs text-slate-500">
            Maximum file size: {MAX_FILE_SIZE / 1024 / 1024}MB
          </p>
        </div>
      </div>

      {/* Supported Formats */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-4 block text-center">
          Supported Formats
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {allFormats.map((format) => (
            <span
              key={format}
              className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded-full"
            >
              {format}
            </span>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="grid md:grid-cols-3 gap-6 pt-4">
        <div className="bg-blue-50 border border-blue-200 text-center p-6 rounded-lg">
          <div className="flex justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-blue-600" />
          </div>
          <h4 className="font-semibold text-slate-800 mb-1">Fast Processing</h4>
          <p className="text-sm text-slate-600">Get results in seconds</p>
        </div>
        <div className="bg-green-50 border border-green-200 text-center p-6 rounded-lg">
          <div className="flex justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-slate-800 mb-1">Secure</h4>
          <p className="text-sm text-slate-600">Your data is never stored</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 text-center p-6 rounded-lg">
          <div className="flex justify-center mb-3">
            <CheckCircle className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-slate-800 mb-1">Reliable</h4>
          <p className="text-sm text-slate-600">Enterprise-grade processing</p>
        </div>
      </div>
    </div>
  )
}
