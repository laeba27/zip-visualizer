/** Symbol frequency table with proportional bars — the input to Huffman. */
import type { FrequencyEntry, HuffmanCodes } from '../algorithms/types'

export function FrequencyTable({
  entries,
  codes,
}: {
  entries: FrequencyEntry[]
  codes?: HuffmanCodes
}) {
  const max = entries.reduce((m, e) => Math.max(m, e.count), 1)
  const top = entries.slice(0, 24)

  return (
    <div className="scroll-thin max-h-72 overflow-auto rounded-xl border border-edge bg-surfaceMuted p-1">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-surfaceMuted text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Symbol</th>
            <th className="px-3 py-2 font-medium">Count</th>
            <th className="px-3 py-2 font-medium">Frequency</th>
            {codes && <th className="px-3 py-2 font-medium">Code</th>}
          </tr>
        </thead>
        <tbody className="font-mono">
          {top.map((e) => (
            <tr key={e.symbol} className="border-t border-edge">
              <td className="px-3 py-1.5 text-ink">{e.label}</td>
              <td className="px-3 py-1.5 text-muted">{e.count}</td>
              <td className="px-3 py-1.5">
                <div className="h-2 w-32 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${(e.count / max) * 100}%` }}
                  />
                </div>
              </td>
              {codes && <td className="px-3 py-1.5 font-semibold text-emerald-600">{codes[e.symbol] ?? '—'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length > top.length && (
        <p className="px-3 py-2 text-xs text-muted">
          Showing top {top.length} of {entries.length} distinct symbols (most frequent first).
        </p>
      )}
    </div>
  )
}
