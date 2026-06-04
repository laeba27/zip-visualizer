/**
 * Run-Length Encoding — the simplest compression idea, used here as a teaching
 * warm-up before LZ77. We only compute an illustrative preview of runs over the
 * raw bytes; RLE is NOT part of the actual .myzip pipeline (that's LZ77+Huffman).
 * Keeping it separate lets the UI show "the simplest possible compression" first.
 */

export interface RleRun {
  symbol: number
  run: number
}

/** Collapse consecutive equal bytes into (symbol, run) pairs. */
export function rleEncode(bytes: Uint8Array): RleRun[] {
  const runs: RleRun[] = []
  if (bytes.length === 0) return runs

  let current = bytes[0]
  let count = 1
  for (let i = 1; i < bytes.length; i++) {
    if (bytes[i] === current) {
      count++
    } else {
      runs.push({ symbol: current, run: count })
      current = bytes[i]
      count = 1
    }
  }
  runs.push({ symbol: current, run: count })
  return runs
}

/** Expand (symbol, run) pairs back into the original byte sequence. */
export function rleDecode(runs: RleRun[]): Uint8Array {
  const total = runs.reduce((sum, r) => sum + r.run, 0)
  const out = new Uint8Array(total)
  let i = 0
  for (const { symbol, run } of runs) {
    out.fill(symbol, i, i + run)
    i += run
  }
  return out
}
