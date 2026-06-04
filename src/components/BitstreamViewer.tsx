/** Renders the final compressed bitstream, grouped into bytes for readability. */
const MAX_BITS = 2048

export function BitstreamViewer({ bits, totalBits }: { bits: string; totalBits?: number }) {
  const total = totalBits ?? bits.length
  const shown = bits.slice(0, MAX_BITS)
  const groups: string[] = []
  for (let i = 0; i < shown.length; i += 8) groups.push(shown.slice(i, i + 8))

  return (
    <div>
      <div className="scroll-thin max-h-56 overflow-auto rounded-xl border border-edge bg-surfaceMuted p-3">
        <div className="flex flex-wrap gap-1.5 font-mono text-[11px] leading-relaxed">
          {groups.map((g, i) => (
            <span key={i} className="rounded bg-cyan-100 px-1.5 py-0.5 tracking-widest text-cyan-700">
              {g}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        {total.toLocaleString()} bits total
        {total > shown.length && ` (showing first ${shown.length.toLocaleString()})`}.
      </p>
    </div>
  )
}
