import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  accept?: Record<string, string[]>
  maxFiles?: number
  maxSize?: number
  onFilesChange?: (files: File[]) => void
  className?: string
  description?: string
}

export default function FileUpload({
  accept,
  maxFiles = 5,
  maxSize = 50 * 1024 * 1024, // 50MB
  onFilesChange,
  className,
  description = '拖拽文件到此处，或点击选择文件',
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles)
      setFiles(newFiles)
      onFilesChange?.(newFiles)
    },
    [files, maxFiles, onFilesChange]
  )

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onFilesChange?.(newFiles)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
  })

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-blue-400 bg-blue-50/60 scale-[1.01]'
            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
        )}
      >
        <input {...getInputProps()} />
        <div className={cn(
          'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors',
          isDragActive ? 'bg-blue-100' : 'bg-gray-50'
        )}>
          <Upload className={cn(
            'h-6 w-6 transition-colors',
            isDragActive ? 'text-blue-500' : 'text-gray-400'
          )} />
        </div>
        <p className="text-sm font-medium text-gray-600">{description}</p>
        <p className="text-xs text-gray-400 mt-1.5">
          最多 {maxFiles} 个文件，单个文件不超过 {formatFileSize(maxSize)}
        </p>
      </div>

      {/* 已选文件列表 */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between px-4 py-3 bg-blue-50/50 rounded-xl border border-blue-100 group animate-fade-in"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <File className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-700 truncate block">{file.name}</span>
                  <span className="text-[11px] text-gray-400">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(index) }}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
