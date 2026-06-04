/**
 * Encoder — ties the whole compression pipeline together, built to scale to
 * multi-megabyte files without freezing or running out of memory.
 *
 *   raw bytes
 *     -> RLE preview (illustrative only, not part of the payload)
 *     -> LZ77 tokens (hash-chain matcher)
 *     -> symbol frequencies -> Huffman codes (canonical)
 *     -> bits packed straight into bytes (streaming, no giant string)
 *     -> .myzip container
 *
 * Symbol stream format (see types.ts):
 *   - A literal token emits its byte value (0..255).
 *   - A match token emits MATCH_MARKER (256), then offset-hi, offset-lo, length
 *     as three literal byte symbols (0..255). The decoder reverses this exactly.
 *
 * For visualization we keep only bounded *samples* of the heavy intermediates
 * (tokens, bytes, bitstream) plus their true counts — see CompressionResult.
 */

import { BitWriter } from './bitstream'
import {
  buildHuffman,
  canonicalCodes,
  codeLengthsFrom,
  symbolLabel,
  type CodeLengths,
} from './huffman'
import { lz77Encode } from './lz77'
import { rleEncode } from './rle'
import { buildMyZip } from './myzip'
import {
  ALPHABET_SIZE,
  MATCH_MARKER,
  type CompressionResult,
  type FrequencyEntry,
  type Lz77Token,
} from './types'

/** Sampling caps for visualization (the real outputs are never truncated). */
const BYTES_SAMPLE = 1024
const TOKENS_SAMPLE = 1000
const RLE_SAMPLE = 500
const BITSTRING_SAMPLE = 4096

/** Append the symbols a single token expands to. (Used for the small samples.) */
function pushTokenSymbols(token: Lz77Token, out: number[]): void {
  if (token.type === 'literal') {
    out.push(token.byte)
  } else {
    out.push(MATCH_MARKER, (token.offset >> 8) & 0xff, token.offset & 0xff, token.length & 0xff)
  }
}

/** Flatten LZ77 tokens into the symbol stream. (Small inputs / tests only.) */
export function tokensToSymbols(tokens: Lz77Token[]): number[] {
  const symbols: number[] = []
  for (const token of tokens) pushTokenSymbols(token, symbols)
  return symbols
}

/** Rebuild LZ77 tokens from a flattened symbol stream (decoder side). */
export function symbolsToTokens(symbols: number[]): Lz77Token[] {
  const tokens: Lz77Token[] = []
  let i = 0
  while (i < symbols.length) {
    const s = symbols[i]
    if (s === MATCH_MARKER) {
      const offset = (symbols[i + 1] << 8) | symbols[i + 2]
      const length = symbols[i + 3]
      tokens.push({ type: 'match', offset, length })
      i += 4
    } else {
      tokens.push({ type: 'literal', byte: s })
      i += 1
    }
  }
  return tokens
}

/** Encode a symbol stream into a '0'/'1' bitstring using a Huffman codebook. */
export function encodeBitstring(symbols: number[], codes: Record<number, string>): string {
  let out = ''
  for (const s of symbols) out += codes[s]
  return out
}

export interface CompressOptions {
  /** Progress in 0..1, with a coarse stage label. */
  onProgress?: (fraction: number, label: string) => void
}

/** Run the full compression pipeline over raw file bytes. */
export function compress(fileName: string, bytes: Uint8Array, options: CompressOptions = {}): CompressionResult {
  const { onProgress } = options
  const originalSize = bytes.length

  // Stage 0 — RLE preview (teaching warm-up, not stored in payload). Sampled.
  onProgress?.(0, 'Scanning bytes')
  const rlePreview = rleEncode(bytes.subarray(0, Math.min(bytes.length, 1 << 20))).slice(0, RLE_SAMPLE)

  // Stage 1 — LZ77 pattern matching (hash chains; ~60% of the work).
  const { tokens, patterns, matchCount } = lz77Encode(bytes, {
    onProgress: (f) => onProgress?.(0.05 + f * 0.55, 'Finding patterns (LZ77)'),
  })
  const tokenCount = tokens.length
  const literalCount = tokenCount - matchCount

  // Stage 2/3 — symbol frequencies over the WHOLE stream, computed by streaming
  // over tokens (no giant symbol array). The alphabet is only 257 symbols.
  onProgress?.(0.62, 'Counting symbols')
  const counts = new Uint32Array(ALPHABET_SIZE)
  for (const token of tokens) {
    if (token.type === 'literal') {
      counts[token.byte]++
    } else {
      counts[MATCH_MARKER]++
      counts[(token.offset >> 8) & 0xff]++
      counts[token.offset & 0xff]++
      counts[token.length & 0xff]++
    }
  }
  const frequencyTable: FrequencyEntry[] = []
  for (let s = 0; s < ALPHABET_SIZE; s++) {
    if (counts[s] > 0) frequencyTable.push({ symbol: s, label: symbolLabel(s), count: counts[s] })
  }
  frequencyTable.sort((a, b) => b.count - a.count || a.symbol - b.symbol)

  // Build the Huffman tree, then canonical codes (so encode == what decode rebuilds).
  onProgress?.(0.66, 'Building Huffman tree')
  const { tree, codes: treeCodes, steps } = buildHuffman(frequencyTable)
  const codeLengths: CodeLengths = codeLengthsFrom(treeCodes)
  const codes = canonicalCodes(codeLengths)

  // Stage 4 — stream the codes straight into packed bytes (no giant bit string).
  onProgress?.(0.7, 'Packing bitstream')
  const writer = new BitWriter(Math.max(1024, originalSize >> 1))
  let bitstringSample = ''
  let progressTick = 0
  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t]
    if (token.type === 'literal') {
      writer.writeCode(codes[token.byte])
    } else {
      writer.writeCode(codes[MATCH_MARKER])
      writer.writeCode(codes[(token.offset >> 8) & 0xff])
      writer.writeCode(codes[token.offset & 0xff])
      writer.writeCode(codes[token.length & 0xff])
    }
    if (bitstringSample.length < BITSTRING_SAMPLE) {
      // Reconstruct just the leading bits for display.
      const sampleSymbols: number[] = []
      pushTokenSymbols(token, sampleSymbols)
      for (const s of sampleSymbols) bitstringSample += codes[s]
    }
    if (onProgress && ++progressTick >= 100000) {
      progressTick = 0
      onProgress(0.7 + (t / tokens.length) * 0.2, 'Packing bitstream')
    }
  }
  const { bytes: packedBytes, bitLength } = writer.finish()
  bitstringSample = bitstringSample.slice(0, BITSTRING_SAMPLE)

  // Stage 5 — package into the .myzip container (stores code lengths, raw bytes).
  onProgress?.(0.92, 'Writing archive')
  const archiveBytes = buildMyZip({ filename: fileName, originalSize, bitLength, codeLengths, packedBytes })

  const compressedSize = archiveBytes.length
  const compressionRatio = originalSize === 0 ? 0 : compressedSize / originalSize
  const spaceSavedBytes = originalSize - compressedSize
  const spaceSavedPercent = originalSize === 0 ? 0 : (spaceSavedBytes / originalSize) * 100

  onProgress?.(1, 'Done')
  return {
    fileName,
    originalBytes: bytes,
    originalSize,
    bytesSample: bytes.subarray(0, BYTES_SAMPLE),
    rlePreview,
    tokens: tokens.slice(0, TOKENS_SAMPLE),
    tokenCount,
    literalCount,
    matchCount,
    patterns,
    frequencyTable,
    huffmanTree: tree,
    huffmanCodes: codes,
    buildSteps: steps.slice(0, 500),
    bitstringSample,
    bitLength,
    archiveBytes,
    compressedSize,
    compressionRatio,
    spaceSavedBytes,
    spaceSavedPercent,
  }
}
