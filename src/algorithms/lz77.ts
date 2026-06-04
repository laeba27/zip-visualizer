/**
 * LZ77 — a from-scratch implementation that stays fast on large files.
 *
 * The classic idea: as we scan the input we keep a "search buffer" of bytes we
 * have already emitted. For the upcoming bytes ("lookahead buffer") we try to
 * find the longest match that begins somewhere in the search buffer. If a match
 * of useful length is found, we emit a back-reference (offset, length) instead
 * of the literal bytes. Otherwise we emit one literal byte and advance.
 *
 * Performance: a naive search re-scans the whole window at every position, which
 * is O(n · window) — fine for a paragraph, but it freezes the tab on a multi-MB
 * PDF. Instead we use a **hash chain** (the same structure real DEFLATE uses):
 *
 *   - hash the next 3 bytes into a bucket,
 *   - `head[bucket]` holds the most recent position with that 3-byte prefix,
 *   - `prev[pos]` links each position to the previous one in the same bucket.
 *
 * To find matches at `pos` we hash its first 3 bytes and walk that chain — only
 * positions that already share a 3-byte prefix, newest first. We cap the walk at
 * MAX_CHAIN candidates so the worst case (highly repetitive data) stays linear.
 *
 * Tuning notes:
 *   - WINDOW_SIZE bounds how far back a reference may point.
 *   - MIN_MATCH avoids emitting references that cost more than they save.
 *   - MAX_CHAIN bounds search effort per position (speed vs. ratio trade-off).
 */

import type { Lz77Token, PatternHighlight } from './types'

export const WINDOW_SIZE = 32768 // 32 KB window (matches DEFLATE)
export const MIN_MATCH = 4
export const MAX_MATCH = 255 // length fits in one byte for our simple encoding
export const MAX_CHAIN = 128 // max candidates examined per position

const HASH_BITS = 15
const HASH_SIZE = 1 << HASH_BITS // 32768 buckets
const NIL = -1

/** How many matched patterns we keep for visualization (the rest are dropped). */
export const MAX_PATTERNS = 2000

export interface Lz77Result {
  tokens: Lz77Token[]
  /** A bounded sample of detected matches, for the UI. Not the full set. */
  patterns: PatternHighlight[]
  /** Total number of matches found (patterns may be a truncated sample). */
  matchCount: number
}

/** Mix three bytes into a hash bucket. */
function hash3(a: number, b: number, c: number): number {
  // A cheap, well-spread multiplicative hash.
  return ((a << 10) ^ (b << 5) ^ c) & (HASH_SIZE - 1)
}

export interface Lz77Options {
  /** Called periodically with a 0..1 fraction of input processed. */
  onProgress?: (fraction: number) => void
}

/** Compress raw bytes into a stream of LZ77 tokens using hash-chain matching. */
export function lz77Encode(bytes: Uint8Array, options: Lz77Options = {}): Lz77Result {
  const n = bytes.length
  const tokens: Lz77Token[] = []
  const patterns: PatternHighlight[] = []
  let matchCount = 0

  const head = new Int32Array(HASH_SIZE).fill(NIL)
  const prev = new Int32Array(n).fill(NIL)

  const insert = (pos: number): number => {
    const h = hash3(bytes[pos], bytes[pos + 1], bytes[pos + 2])
    prev[pos] = head[h]
    head[h] = pos
    return h
  }

  const { onProgress } = options
  let nextProgressAt = 0

  let pos = 0
  while (pos < n) {
    if (onProgress && pos >= nextProgressAt) {
      onProgress(pos / n)
      nextProgressAt = pos + Math.max(65536, (n / 100) | 0)
    }

    let bestLength = 0
    let bestStart = -1

    // We can only hash when at least 3 bytes remain.
    if (pos + 2 < n) {
      const h = hash3(bytes[pos], bytes[pos + 1], bytes[pos + 2])
      const windowStart = pos - WINDOW_SIZE
      const maxLen = Math.min(MAX_MATCH, n - pos)

      let candidate = head[h]
      let chain = MAX_CHAIN
      while (candidate !== NIL && candidate >= windowStart && chain-- > 0) {
        // Quick reject: if this candidate can't beat the best, skip the scan.
        if (bestLength === 0 || bytes[candidate + bestLength] === bytes[pos + bestLength]) {
          let length = 0
          while (length < maxLen && bytes[candidate + length] === bytes[pos + length]) length++
          if (length > bestLength) {
            bestLength = length
            bestStart = candidate
            if (length >= maxLen) break // can't do better
          }
        }
        candidate = prev[candidate]
      }
    }

    if (bestLength >= MIN_MATCH) {
      const offset = pos - bestStart
      tokens.push({ type: 'match', offset, length: bestLength, preview: bytes[pos] })
      matchCount++
      if (patterns.length < MAX_PATTERNS) {
        patterns.push({
          position: pos,
          offset,
          length: bestLength,
          bytes: Array.from(bytes.subarray(pos, pos + Math.min(bestLength, 64))),
        })
      }
      // Insert hash entries for every position the match covered, so future
      // lookups can reference into the middle of this run.
      const end = pos + bestLength
      while (pos < end) {
        if (pos + 2 < n) insert(pos)
        pos++
      }
    } else {
      tokens.push({ type: 'literal', byte: bytes[pos] })
      if (pos + 2 < n) insert(pos)
      pos++
    }
  }

  onProgress?.(1)
  return { tokens, patterns, matchCount }
}

/** Expand a stream of LZ77 tokens back into the original bytes. */
export function lz77Decode(tokens: Lz77Token[]): Uint8Array {
  // First pass: compute the exact output length so we can allocate once.
  let total = 0
  for (const token of tokens) total += token.type === 'literal' ? 1 : token.length

  const out = new Uint8Array(total)
  let i = 0
  for (const token of tokens) {
    if (token.type === 'literal') {
      out[i++] = token.byte
    } else {
      let start = i - token.offset
      // Copy byte-by-byte so overlapping references (offset < length) work,
      // which is exactly how repeated runs like "ABCABCABC" are encoded.
      for (let k = 0; k < token.length; k++) out[i++] = out[start++]
    }
  }
  return out
}
