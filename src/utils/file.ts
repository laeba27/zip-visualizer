/**
 * File I/O helpers built on the browser FileReader / Blob APIs.
 * No backend, no storage — everything happens in memory.
 */

/** Read an uploaded File into raw bytes. */
export async function readFileBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer()
  return new Uint8Array(buffer)
}

/** Trigger a browser download of raw bytes under a given filename. */
export function downloadBytes(bytes: Uint8Array, filename: string, mime = 'application/octet-stream'): void {
  // Copy into a fresh ArrayBuffer so the Blob owns a clean, exactly-sized buffer.
  const copy = bytes.slice()
  const blob = new Blob([copy], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Human-readable byte size, e.g. 2048 -> "2.0 KB". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

/** Swap a filename's extension to `.myzip`. */
export function toMyZipName(filename: string): string {
  const dot = filename.lastIndexOf('.')
  const base = dot === -1 ? filename : filename.slice(0, dot)
  return `${base}.myzip`
}
