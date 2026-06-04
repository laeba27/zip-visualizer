/**
 * Decompression view — upload a .myzip archive and watch the reverse pipeline
 * play out as tabs, with the restored-file download in a sticky top bar.
 * Decompression runs in a Web Worker with a progress bar, and the viewers draw
 * from bounded samples so even large archives stay responsive.
 */
import { Download, FileText, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { DecompressionResult } from '../algorithms/types'
import { BinaryViewer } from '../components/BinaryViewer'
import { BitstreamViewer } from '../components/BitstreamViewer'
import { FileUploader } from '../components/FileUploader'
import { PatternViewer } from '../components/PatternViewer'
import { DECOMPRESSION_STAGES } from '../components/stages'
import { TimelineController } from '../components/TimelineController'
import { Button, Explain, Panel, ProgressBar, Stat } from '../components/ui'
import { downloadBytes, formatBytes, readFileBytes } from '../utils/file'
import { useCompressionWorker, type Progress } from '../worker/useCompressionWorker'

export function DecompressView() {
  const { decompress } = useCompressionWorker()

  const [result, setResult] = useState<DecompressionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(false)

  const handleFile = async (file: File) => {
    setError(null)
    setResult(null)
    setStage(0)
    setPlaying(false)
    setProgress({ fraction: 0, label: 'Reading archive…' })
    try {
      const bytes = await readFileBytes(file)
      const res = await decompress(bytes, setProgress)
      setResult(res)
      setProgress(null)
      setPlaying(true)
    } catch (e) {
      setProgress(null)
      setError(e instanceof Error ? e.message : 'Failed to read archive.')
    }
  }

  useEffect(() => {
    if (!playing || !result) return
    if (stage >= DECOMPRESSION_STAGES.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setStage((s) => Math.min(s + 1, DECOMPRESSION_STAGES.length - 1)), 1400)
    return () => clearTimeout(t)
  }, [playing, stage, result])

  if (!result) {
    return (
      <Panel title="Upload a .myzip archive" accent="emerald" icon={FileText} active>
        <FileUploader mode="decompress" onFile={handleFile} disabled={!!progress} />
        {progress && (
          <div className="mt-4">
            <ProgressBar fraction={progress.fraction} label={progress.label} />
          </div>
        )}
        {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}
      </Panel>
    )
  }

  const def = DECOMPRESSION_STAGES[stage]

  return (
    <div className="space-y-5">
      {/* Sticky top action bar */}
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-edge bg-surface px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-ink" title={result.fileName}>
              {result.fileName}
            </div>
            <div className="text-xs text-muted">
              Restored {formatBytes(result.outputSize)} from {result.bitLength.toLocaleString()} bits
            </div>
          </div>
          <Button variant="success" icon={Download} onClick={() => downloadBytes(result.outputBytes, result.fileName)}>
            {result.fileName}
          </Button>
          <Button variant="ghost" icon={RotateCcw} onClick={() => { setResult(null); setStage(0) }}>
            New archive
          </Button>
        </div>
      </div>

      <Panel title="Steps" accent={def.accent} icon={def.icon}>
        <TimelineController
          stages={DECOMPRESSION_STAGES}
          current={stage}
          onSelect={(i) => { setStage(i); setPlaying(false) }}
          onPrev={() => { setStage((s) => Math.max(0, s - 1)); setPlaying(false) }}
          onNext={() => setStage((s) => Math.min(DECOMPRESSION_STAGES.length - 1, s + 1))}
          onPlay={() => setPlaying((p) => !p)}
          playing={playing}
        />
      </Panel>

      <Panel title={`${stage + 1}. ${def.title}`} subtitle={def.blurb} accent={def.accent} icon={def.icon} active>
        <Explain accent={def.accent}>{def.explain}</Explain>
        <StageBody stage={def.key} result={result} />
      </Panel>
    </div>
  )
}

function StageBody({ stage, result }: { stage: string; result: DecompressionResult }) {
  switch (stage) {
    case 'parse':
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-edge bg-surfaceMuted px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted">Original file</div>
            <div className="mt-1 truncate text-sm font-medium text-ink">{result.fileName}</div>
          </div>
          <Stat label="Algorithm" value={<span className="text-sm">{result.algorithm}</span>} />
          <Stat label="Encoded bits" value={result.bitLength.toLocaleString()} />
        </div>
      )
    case 'unpack':
      return <BitstreamViewer bits={result.bitstringSample} totalBits={result.bitLength} />
    case 'huffman':
      return (
        <div>
          <p className="mb-2 text-xs text-muted">
            {result.symbolCount.toLocaleString()} symbols recovered by walking the code tree.
          </p>
          <PatternViewer tokens={result.tokens} totalTokens={result.tokenCount} />
        </div>
      )
    case 'lz77':
      return <BinaryViewer bytes={result.outputSample} totalBytes={result.outputSize} />
    case 'rebuild':
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat
            label="Reconstructed size"
            value={formatBytes(result.outputSize)}
            hint={`${result.outputSize.toLocaleString()} bytes`}
          />
          <Stat label="File name" value={<span className="truncate text-sm">{result.fileName}</span>} />
        </div>
      )
    default:
      return null
  }
}
