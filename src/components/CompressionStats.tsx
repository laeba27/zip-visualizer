/** Headline compression statistics + a before/after size bar. */
import { formatBytes } from '../utils/file'
import { Stat } from './ui'

export function CompressionStats({
  originalSize,
  compressedSize,
  ratio,
  savedBytes,
  savedPercent,
}: {
  originalSize: number
  compressedSize: number
  ratio: number
  savedBytes: number
  savedPercent: number
}) {
  const compressedPct = originalSize === 0 ? 0 : Math.min(100, (compressedSize / originalSize) * 100)
  const shrank = savedBytes > 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Original" value={formatBytes(originalSize)} hint={`${originalSize.toLocaleString()} bytes`} />
        <Stat label="Compressed" value={formatBytes(compressedSize)} hint={`${compressedSize.toLocaleString()} bytes`} />
        <Stat label="Ratio" value={`${(ratio * 100).toFixed(1)}%`} hint="compressed ÷ original" />
        <Stat
          label="Space saved"
          value={
            <span className={shrank ? 'text-emerald-600' : 'text-rose-500'}>
              {savedPercent >= 0 ? '' : '+'}
              {Math.abs(savedPercent).toFixed(1)}%
            </span>
          }
          hint={`${shrank ? '−' : '+'}${formatBytes(Math.abs(savedBytes))}`}
        />
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs text-muted">
          <span>Compressed size vs original</span>
          <span>{compressedPct.toFixed(1)}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surfaceMuted">
          <div
            className={`h-full rounded-full ${shrank ? 'bg-emerald-500' : 'bg-rose-400'}`}
            style={{ width: `${Math.max(2, compressedPct)}%` }}
          />
        </div>
        {!shrank && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            This file grew slightly — small or already-random inputs can't compress, and the .myzip metadata
            (filename + code table) adds fixed overhead. That trade-off is itself part of the lesson.
          </p>
        )}
      </div>
    </div>
  )
}
