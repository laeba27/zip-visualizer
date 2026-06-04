/** Drag-and-drop / click file upload area. Mode-aware (compress vs decompress). */
import { FileArchive, FileUp } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

export function FileUploader({
  mode,
  onFile,
  disabled,
}: {
  mode: 'compress' | 'decompress'
  onFile: (file: File) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files?.[0]
      if (file) onFile(file)
    },
    [onFile, disabled],
  )

  const accept = mode === 'compress' ? '.txt,.pdf,text/plain,application/pdf' : '.myzip'
  const prompt =
    mode === 'compress'
      ? 'Drop a text or PDF file here, or click to browse'
      : 'Drop a .myzip archive here, or click to browse'
  const Icon = mode === 'compress' ? FileUp : FileArchive

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        dragging ? 'border-violet-400 bg-violet-50' : 'border-edge bg-surfaceMuted hover:border-violet-300'
      } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-600">
        <Icon size={26} />
      </span>
      <div className="text-sm font-medium text-ink">{prompt}</div>
      <div className="text-xs text-muted">
        {mode === 'compress'
          ? 'Supported: .txt, .pdf — processed entirely in your browser'
          : 'Upload an archive created by ZipLab'}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
