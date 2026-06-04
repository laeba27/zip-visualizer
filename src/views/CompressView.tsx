/**
 * Compression view — upload a file, then walk the pipeline one stage at a time
 * as TABS. Compression runs in a Web Worker (so the UI never freezes on large
 * files) with a progress bar. Each tab shows a plain-English explanation plus
 * that stage's visualization, drawn from bounded samples. The download buttons
 * live in a sticky bar at the top so the user never scrolls to find them.
 */
import { Download, FileArchive, RotateCcw, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CompressionResult } from '../algorithms/types'
import { buildZip, toZipName } from '../algorithms/zip'
import { BinaryViewer } from '../components/BinaryViewer'
import { BitstreamViewer } from '../components/BitstreamViewer'
import { CompressionStats } from '../components/CompressionStats'
import { FileUploader } from '../components/FileUploader'
import { FrequencyTable } from '../components/FrequencyTable'
import { HuffmanTreeViewer } from '../components/HuffmanTreeViewer'
import { FileInfo, HuffmanBuildSteps, RlePreview } from '../components/MiscViewers'
import { PatternViewer } from '../components/PatternViewer'
import { COMPRESSION_STAGES } from '../components/stages'
import { TimelineController } from '../components/TimelineController'
import { Button, Explain, Panel, ProgressBar } from '../components/ui'
import { downloadBytes, formatBytes, readFileBytes, toMyZipName } from '../utils/file'
import { useCompressionWorker, type Progress } from '../worker/useCompressionWorker'

export function CompressView() {
  const { compress } = useCompressionWorker()

  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null)
  const [result, setResult] = useState<CompressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(false)

  const handleFile = async (picked: File) => {
    setError(null)
    setResult(null)
    setProgress(null)
    setStage(0)
    setPlaying(false)
    setReading(true)
    try {
      const bytes = await readFileBytes(picked)
      setFile({ name: picked.name, bytes })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to read file.')
    } finally {
      setReading(false)
    }
  }

  const runCompression = async () => {
    if (!file) return
    setError(null)
    setProgress({ fraction: 0, label: 'Starting…' })
    try {
      const res = await compress(file.name, file.bytes, setProgress)
      setResult(res)
      setProgress(null)
      setStage(0)
      setPlaying(true)
    } catch (e) {
      setProgress(null)
      setError(e instanceof Error ? e.message : 'Compression failed.')
    }
  }

  const reset = () => {
    setFile(null)
    setResult(null)
    setProgress(null)
    setError(null)
    setStage(0)
    setPlaying(false)
  }

  // Auto-advance while playing.
  useEffect(() => {
    if (!playing || !result) return
    if (stage >= COMPRESSION_STAGES.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setStage((s) => Math.min(s + 1, COMPRESSION_STAGES.length - 1)), 1400)
    return () => clearTimeout(t)
  }, [playing, stage, result])

  const matchHighlights = useMemo(() => {
    const set = new Set<number>()
    if (!result) return set
    // Patterns reference absolute positions; only those within the byte sample matter.
    for (const p of result.patterns) {
      if (p.position >= result.bytesSample.length) continue
      for (let i = 0; i < p.length && p.position + i < result.bytesSample.length; i++) set.add(p.position + i)
    }
    return set
  }, [result])

  // ── No file yet: uploader ──
  if (!file) {
    return (
      <Panel title="Upload a file" accent="violet" icon={FileArchive} active>
        <FileUploader mode="compress" onFile={handleFile} disabled={reading} />
        {reading && <p className="mt-3 text-sm text-violet-600">Reading file…</p>}
        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      </Panel>
    )
  }

  const def = result ? COMPRESSION_STAGES[stage] : COMPRESSION_STAGES[0]

  return (
    <div className="space-y-5">
      {/* ── Sticky top action bar: file info + downloads always in reach ── */}
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-edge bg-surface px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink" title={file.name}>
              {file.name}
            </div>
            <div className="text-xs text-muted">
              {result ? (
                <>
                  {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
                  {result.spaceSavedBytes > 0
                    ? ` · saved ${result.spaceSavedPercent.toFixed(0)}%`
                    : ' · grew (small or already-compressed file)'}
                </>
              ) : (
                `${formatBytes(file.bytes.length)} · ready`
              )}
            </div>
          </div>

          {!result ? (
            <Button icon={Zap} onClick={runCompression} disabled={!!progress}>
              {progress ? 'Compressing…' : 'Compress & visualize'}
            </Button>
          ) : (
            <>
              <Button
                variant="success"
                icon={Download}
                onClick={() =>
                  downloadBytes(
                    buildZip([{ name: result.fileName, data: result.originalBytes }]),
                    toZipName(result.fileName),
                    'application/zip',
                  )
                }
              >
                {toZipName(result.fileName)}
              </Button>
              <Button
                variant="ghost"
                icon={Download}
                onClick={() => downloadBytes(result.archiveBytes, toMyZipName(result.fileName))}
              >
                .myzip
              </Button>
            </>
          )}
          <Button variant="ghost" icon={RotateCcw} onClick={reset}>
            New file
          </Button>
        </div>
      </div>

      {error && (
        <Panel title="Something went wrong" accent="rose" icon={FileArchive} active>
          <p className="text-sm text-rose-600">{error}</p>
          <p className="mt-2 text-xs text-muted">
            Very large files can exhaust the browser tab's memory. Try a smaller file, or close other tabs and retry.
          </p>
        </Panel>
      )}

      {/* ── Before run: ready card (with progress while compressing) ── */}
      {!result ? (
        <Panel title="Ready" accent="violet" icon={FileArchive} active>
          <FileInfo name={file.name} size={file.bytes.length} />
          {progress ? (
            <div className="mt-4">
              <ProgressBar fraction={progress.fraction} label={progress.label} />
              <p className="mt-2 text-xs text-muted">
                Working in the background — the page stays responsive even for large files.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Hit <span className="font-medium text-ink">Compress &amp; visualize</span> above to watch the file shrink,
              step by step. You can download the result any time from the bar at the top.
            </p>
          )}
        </Panel>
      ) : (
        <>
          {/* Tabs + controls */}
          <Panel title="Steps" accent={def.accent} icon={def.icon}>
            <TimelineController
              stages={COMPRESSION_STAGES}
              current={stage}
              onSelect={(i) => { setStage(i); setPlaying(false) }}
              onPrev={() => { setStage((s) => Math.max(0, s - 1)); setPlaying(false) }}
              onNext={() => setStage((s) => Math.min(COMPRESSION_STAGES.length - 1, s + 1))}
              onPlay={() => setPlaying((p) => !p)}
              playing={playing}
            />
          </Panel>

          {/* Active stage: explanation + its visualization */}
          <Panel title={`${stage + 1}. ${def.title}`} subtitle={def.blurb} accent={def.accent} icon={def.icon} active>
            <Explain accent={def.accent}>{def.explain}</Explain>
            <StageBody stage={def.key} result={result} highlights={matchHighlights} />
          </Panel>
        </>
      )}
    </div>
  )
}

/** Renders the visualization for whichever stage tab is active (from bounded samples). */
function StageBody({
  stage,
  result,
  highlights,
}: {
  stage: string
  result: CompressionResult
  highlights: Set<number>
}) {
  switch (stage) {
    case 'bytes':
      return <BinaryViewer bytes={result.bytesSample} totalBytes={result.originalSize} />
    case 'rle':
      return <RlePreview runs={result.rlePreview} />
    case 'lz77':
      return (
        <div className="space-y-4">
          <BinaryViewer bytes={result.bytesSample} totalBytes={result.originalSize} highlights={highlights} />
          <PatternViewer tokens={result.tokens} totalTokens={result.tokenCount} />
        </div>
      )
    case 'frequency':
      return <FrequencyTable entries={result.frequencyTable} />
    case 'huffman':
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <HuffmanTreeViewer tree={result.huffmanTree} />
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Merge steps</h3>
              <HuffmanBuildSteps steps={result.buildSteps} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Code table (shorter codes → frequent symbols)
              </h3>
              <FrequencyTable entries={result.frequencyTable} codes={result.huffmanCodes} />
            </div>
          </div>
        </div>
      )
    case 'bitstream':
      return <BitstreamViewer bits={result.bitstringSample} totalBits={result.bitLength} />
    case 'package':
      return (
        <CompressionStats
          originalSize={result.originalSize}
          compressedSize={result.compressedSize}
          ratio={result.compressionRatio}
          savedBytes={result.spaceSavedBytes}
          savedPercent={result.spaceSavedPercent}
        />
      )
    default:
      return null
  }
}
