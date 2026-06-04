/**
 * Shared types for the ZipLab compression engine.
 *
 * The guiding principle (see project-overview.md): every algorithm exposes its
 * full intermediate state so the UI can visualize *what* the algorithm is doing,
 * not just the final result. Nothing here is a black box.
 */

/** A single LZ77 token. Either a literal byte, or a back-reference into prior output. */
export type Lz77Token =
  | { type: 'literal'; byte: number }
  | { type: 'match'; offset: number; length: number; /** byte that the match decodes to first, for display */ preview?: number }

/**
 * In the Huffman/encoder stage we operate over a stream of *symbols*, not raw
 * bytes. A symbol is one of 256 literal byte values, OR a flattened LZ77 match
 * encoded as a small set of dedicated symbol ids above 255. Keeping matches in
 * the same symbol alphabet lets a single Huffman tree cover the whole stream,
 * which mirrors how DEFLATE merges literals and length/distance codes.
 *
 * For Version 1 we keep it deliberately simple and human-readable:
 *   - symbols 0..255   -> literal byte values
 *   - symbol  256      -> "match marker"; the following two symbols are the
 *                         offset and length, each emitted as a pair of bytes.
 * This is documented in encoder.ts where the token stream is serialized.
 */
export const MATCH_MARKER = 256
export const ALPHABET_SIZE = 257 // 0..255 literals + 1 match marker

/** One row of the symbol frequency table, sorted for display. */
export interface FrequencyEntry {
  symbol: number
  /** Human label: a printable char, hex byte, or "MATCH". */
  label: string
  count: number
}

/** A node in the Huffman tree. Leaves carry a symbol; internal nodes carry children. */
export interface HuffmanNode {
  id: number
  weight: number
  symbol?: number
  label?: string
  left?: HuffmanNode
  right?: HuffmanNode
}

/** Map from symbol -> its assigned binary code string (e.g. "010"). */
export type HuffmanCodes = Record<number, string>

/** One step of Huffman tree construction, captured for animation. */
export interface HuffmanBuildStep {
  /** The two nodes merged in this step (by weight). */
  leftWeight: number
  rightWeight: number
  leftLabel: string
  rightLabel: string
  /** Resulting combined weight. */
  mergedWeight: number
  /** How many nodes remain in the priority queue after the merge. */
  remaining: number
}

/** A detected repeated pattern, for the pattern-matching visualization. */
export interface PatternHighlight {
  /** Where the match was found in the lookahead. */
  position: number
  offset: number
  length: number
  /** The literal bytes that were matched (for display). */
  bytes: number[]
}

/**
 * Result of compression.
 *
 * On a multi-megabyte file the full intermediate arrays (every token, the whole
 * bit string) would be tens of millions of entries — too much to hold and far
 * too much to render. So we keep the *real outputs* needed to download
 * (`originalBytes`, `archiveBytes`) at full size, but everything that exists only
 * to be *visualized* is a bounded **sample** with a count of the true total. The
 * UI shows "first N of M" using these.
 */
export interface CompressionResult {
  fileName: string
  /** Full source bytes — kept so the .zip download can store them. */
  originalBytes: Uint8Array
  originalSize: number

  /** Bounded sample of the leading bytes, for the binary viewer. */
  bytesSample: Uint8Array

  /** RLE warm-up: a bounded sample of runs. */
  rlePreview: { symbol: number; run: number }[]

  /** LZ77 stage — bounded token sample + true counts. */
  tokens: Lz77Token[]
  tokenCount: number
  literalCount: number
  matchCount: number
  patterns: PatternHighlight[]

  /** Huffman stage (frequency table covers the full stream — it's at most 257 rows). */
  frequencyTable: FrequencyEntry[]
  huffmanTree: HuffmanNode | null
  huffmanCodes: HuffmanCodes
  buildSteps: HuffmanBuildStep[]

  /** Bounded leading slice of the bitstream, for display, + the true bit length. */
  bitstringSample: string
  bitLength: number

  /** The serialized .myzip container bytes, ready to download. */
  archiveBytes: Uint8Array

  /** Statistics. */
  compressedSize: number
  compressionRatio: number // compressedSize / originalSize
  spaceSavedBytes: number
  spaceSavedPercent: number
}

/** Result of decompression — full output for download + bounded display samples. */
export interface DecompressionResult {
  fileName: string
  algorithm: string
  /** Bounded leading slice of the bitstream, for display, + the true bit length. */
  bitstringSample: string
  bitLength: number
  /** True number of symbols recovered. */
  symbolCount: number
  /** Bounded token sample for the reverse animation. */
  tokens: Lz77Token[]
  tokenCount: number
  /** Final reconstructed original bytes (full, for download). */
  outputBytes: Uint8Array
  /** Bounded leading slice of the output, for the binary viewer. */
  outputSample: Uint8Array
  outputSize: number
}

/**
 * The parsed contents of a .myzip archive.
 *
 * The archive is a compact *binary* container (see myzip.ts). Rather than ship
 * the full Huffman codebook as JSON + a base64 payload, we ship one byte of
 * code-*length* per symbol and the raw packed bytes. The decoder regenerates the
 * exact same canonical codes from the lengths. `codes` here is reconstructed at
 * parse time from those lengths so the rest of the pipeline is unchanged.
 */
export interface MyZipManifest {
  format: 'myzip'
  version: 2
  filename: string
  algorithm: 'RLE+LZ77+Huffman'
  originalSize: number
  /** Number of meaningful bits in the packed payload (the rest is zero padding). */
  bitLength: number
  /** Canonical Huffman codebook, rebuilt from the stored code lengths. */
  codes: HuffmanCodes
  /** Raw packed bitstream bytes. */
  packedBytes: Uint8Array
}
