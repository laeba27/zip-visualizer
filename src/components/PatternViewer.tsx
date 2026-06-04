/**
 * LZ77 pattern viewer — renders the token stream, distinguishing literals from
 * back-references, and summarizes how many raw bytes each reference replaced.
 */
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'
import { symbolLabel } from '../algorithms/huffman'
import type { Lz77Token } from '../algorithms/types'

const MAX_TOKENS = 400

export function PatternViewer({ tokens, totalTokens }: { tokens: Lz77Token[]; totalTokens?: number }) {
  const shown = tokens.slice(0, MAX_TOKENS)
  const total = totalTokens ?? tokens.length
  const sampled = total > tokens.length
  const literals = tokens.filter((t) => t.type === 'literal').length
  const matches = tokens.length - literals
  const bytesSavedByRefs = tokens.reduce((sum, t) => (t.type === 'match' ? sum + (t.length - 1) : sum), 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Pill className="bg-surfaceMuted text-ink">{total.toLocaleString()} tokens</Pill>
        <Pill className="bg-sky-100 text-sky-700">{literals.toLocaleString()} literals{sampled ? ' (sample)' : ''}</Pill>
        <Pill className="bg-amber-100 text-amber-700">
          {matches.toLocaleString()} back-references{sampled ? ' (sample)' : ''}
        </Pill>
        <Pill className="bg-emerald-100 text-emerald-700">~{bytesSavedByRefs.toLocaleString()} bytes folded in</Pill>
      </div>

      <div className="scroll-thin max-h-64 overflow-auto rounded-xl border border-edge bg-surfaceMuted p-3">
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
          {shown.map((token, i) =>
            token.type === 'literal' ? (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-700 ring-1 ring-sky-200"
              >
                {symbolLabel(token.byte)}
              </motion.span>
            ) : (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                title={`Copy ${token.length} bytes from ${token.offset} back`}
                className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 ring-1 ring-amber-200"
              >
                <RotateCcw size={10} />({token.offset},{token.length})
              </motion.span>
            ),
          )}
        </div>
      </div>

      {total > shown.length && (
        <p className="mt-2 text-xs text-muted">
          Showing first {shown.length.toLocaleString()} of {total.toLocaleString()} tokens.
        </p>
      )}
    </div>
  )
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded-full px-2.5 py-1 font-medium ${className}`}>{children}</span>
}
