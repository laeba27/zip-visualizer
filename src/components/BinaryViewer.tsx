/**
 * Binary viewer — shows the file's raw bytes as decimal, hex, binary, or text.
 * Bytes that are part of a detected LZ77 pattern can be highlighted.
 */
import { useMemo, useState } from 'react'
import { byteToBinary, byteToHex } from '../algorithms/bitstream'

type ViewMode = 'hex' | 'decimal' | 'binary' | 'text'

const MAX_RENDER = 1024 // cap rendered cells so huge files stay responsive

export function BinaryViewer({
  bytes,
  highlights,
  totalBytes,
}: {
  bytes: Uint8Array
  /** Set of byte indices to highlight (e.g. matched LZ77 ranges). */
  highlights?: Set<number>
  /** True total in the source (bytes may be a leading sample). */
  totalBytes?: number
}) {
  const total = totalBytes ?? bytes.length
  const [view, setView] = useState<ViewMode>('hex')

  const cells = useMemo(() => {
    const limit = Math.min(bytes.length, MAX_RENDER)
    const out: { index: number; text: string }[] = []
    for (let i = 0; i < limit; i++) out.push({ index: i, text: render(bytes[i], view) })
    return out
  }, [bytes, view])

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['hex', 'decimal', 'binary', 'text'] as ViewMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setView(m)}
            className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
              view === m ? 'bg-sky-500 text-white shadow-sm' : 'bg-surfaceMuted text-muted hover:text-ink'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="scroll-thin max-h-64 overflow-auto rounded-xl border border-edge bg-surfaceMuted p-3">
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {cells.map((cell) => {
            const hot = highlights?.has(cell.index)
            return (
              <span
                key={cell.index}
                title={`byte ${cell.index}`}
                className={`rounded px-1.5 py-0.5 ${
                  hot ? 'bg-amber-200 text-amber-900 ring-1 ring-amber-300' : 'bg-white text-ink/80 border border-edge'
                }`}
              >
                {cell.text}
              </span>
            )
          })}
        </div>
      </div>

      {(total > cells.length || bytes.length > MAX_RENDER) && (
        <p className="mt-2 text-xs text-muted">
          Showing first {Math.min(cells.length, MAX_RENDER).toLocaleString()} of {total.toLocaleString()} bytes for
          readability.
        </p>
      )}
    </div>
  )
}

function render(byte: number, view: ViewMode): string {
  switch (view) {
    case 'hex':
      return byteToHex(byte)
    case 'decimal':
      return String(byte)
    case 'binary':
      return byteToBinary(byte)
    case 'text':
      return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : '·'
  }
}
