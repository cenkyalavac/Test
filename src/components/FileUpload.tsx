import { useRef, useState } from 'react'
import { Cloud, Upload } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: { name: string; size: number }) => void
}

export default function FileUpload({ onFileSelect }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

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
    onFileSelect({
      name: file.name,
      size: file.size,
    })
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`relative w-full p-12 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
        isDragging
          ? 'border-blue-400 bg-blue-900/20'
          : 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept=".json,.xml,.csv,.yaml,.yml,.xliff,.po,.properties"
      />

      <div className="flex flex-col items-center justify-center">
        <Cloud className={`w-16 h-16 mb-4 transition-colors ${
          isDragging ? 'text-blue-400' : 'text-gray-500'
        }`} />

        <h3 className="text-xl font-semibold text-white mb-2">Dosya Yükleyin</h3>

        <p className="text-gray-400 mb-4 text-center">
          Çeviri dosyasını buraya sürükleyip bırakın veya{' '}
          <span className="text-blue-400 font-semibold">tıklayın</span> dosya seçmek için
        </p>

        <div className="text-sm text-gray-500 text-center">
          <p className="mb-2">Desteklenen Formatlar:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['JSON', 'XML', 'CSV', 'YAML', 'XLIFF', 'PO', 'Properties'].map((format) => (
              <span key={format} className="px-3 py-1 bg-gray-700 text-gray-300 rounded">
                .{format.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 text-blue-400">
          <Upload className="w-4 h-4" />
          <span className="text-sm">Dosya seçmeye hazır</span>
        </div>
      </div>
    </div>
  )
}
