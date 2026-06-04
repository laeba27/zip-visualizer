/** A few small read-only viewers: file info, RLE runs, and Huffman merge steps. */
import { symbolLabel } from '../algorithms/huffman'
import type { HuffmanBuildStep } from '../algorithms/types'
import { formatBytes } from '../utils/file'
import { Stat } from './ui'

export function FileInfo({ name, size }: { name: string; size: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-edge bg-surfaceMuted px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted">File name</div>
        <div className="mt-1 truncate text-sm font-medium text-ink" title={name}>
          {name}
        </div>
      </div>
      <Stat label="Original size" value={formatBytes(size)} />
      <Stat label="Byte count" value={size.toLocaleString()} />
    </div>
  )
}

export function RlePreview({ runs }: { runs: { symbol: number; run: number }[] }) {
  const shown = runs.slice(0, 200)
  const compressible = runs.filter((r) => r.run > 1).length
  return (
    <div>
      <p className="mb-2 text-xs text-muted">
        {compressible} of {runs.length} runs span more than one byte — those are what RLE could shrink.
        ZipLab's real archive uses LZ77 + Huffman instead, which generalizes this idea.
      </p>
      <div className="scroll-thin max-h-40 overflow-auto rounded-xl border border-edge bg-surfaceMuted p-3">
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {shown.map((r, i) => (
            <span
              key={i}
              className={`rounded px-1.5 py-0.5 ${
                r.run > 1 ? 'bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200' : 'border border-edge bg-white text-muted'
              }`}
            >
              {r.run}×{symbolLabel(r.symbol)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function HuffmanBuildSteps({ steps }: { steps: HuffmanBuildStep[] }) {
  const shown = steps.slice(0, 200)
  return (
    <div className="scroll-thin max-h-48 overflow-auto rounded-xl border border-edge bg-surfaceMuted p-3 text-xs">
      {shown.length === 0 && <p className="text-muted">No merges (single symbol).</p>}
      <ol className="space-y-1 font-mono">
        {shown.map((s, i) => (
          <li key={i} className="text-ink/80">
            <span className="text-muted">{i + 1}.</span> merge{' '}
            <span className="font-semibold text-violet-600">{s.leftLabel}</span>
            <span className="text-muted"> ({s.leftWeight})</span> +{' '}
            <span className="font-semibold text-violet-600">{s.rightLabel}</span>
            <span className="text-muted"> ({s.rightWeight})</span> →{' '}
            <span className="font-semibold text-emerald-600">{s.mergedWeight}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
