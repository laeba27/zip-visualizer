/**
 * Decoder — the reverse pipeline, run when a user uploads a .myzip file.
 *
 *   .myzip container
 *     -> parse header + code lengths (rebuilds canonical codes), raw payload
 *     -> Huffman decode straight from packed bytes -> symbol stream
 *     -> rebuild LZ77 tokens
 *     -> expand references -> original bytes
 *
 * Like the encoder, the heavy intermediates are returned only as bounded samples
 * for the reverse animation; the full reconstructed bytes are returned for download.
 */

import { unpackBits } from './bitstream'
import { symbolsToTokens } from './encoder'
import { huffmanDecodeBytes } from './huffman'
import { lz77Decode } from './lz77'
import { parseMyZip } from './myzip'
import { type DecompressionResult } from './types'

const TOKENS_SAMPLE = 1000
const OUTPUT_SAMPLE = 1024
const BITSTRING_SAMPLE = 4096

export interface DecompressOptions {
  onProgress?: (fraction: number, label: string) => void
}

/** Run the full decompression pipeline over .myzip container bytes. */
export function decompress(archiveBytes: Uint8Array, options: DecompressOptions = {}): DecompressionResult {
  const { onProgress } = options

  // parseMyZip rebuilds the canonical codebook from the stored code lengths.
  onProgress?.(0, 'Reading archive')
  const manifest = parseMyZip(archiveBytes)

  // Huffman decode straight from the packed bytes (no giant bit string).
  onProgress?.(0.1, 'Huffman decode')
  const decodedSymbols = huffmanDecodeBytes(manifest.packedBytes, manifest.bitLength, manifest.codes, (f) =>
    onProgress?.(0.1 + f * 0.55, 'Huffman decode'),
  )

  // Rebuild tokens, then expand back-references to the original bytes.
  onProgress?.(0.68, 'Rebuilding tokens')
  const tokens = symbolsToTokens(decodedSymbols)

  onProgress?.(0.78, 'Expanding references')
  const outputBytes = lz77Decode(tokens)

  // Bounded display sample of the leading bitstream.
  const sampleBits = Math.min(manifest.bitLength, BITSTRING_SAMPLE)
  const bitstringSample = unpackBits(manifest.packedBytes, sampleBits)

  onProgress?.(1, 'Done')
  return {
    fileName: manifest.filename,
    algorithm: manifest.algorithm,
    bitstringSample,
    bitLength: manifest.bitLength,
    symbolCount: decodedSymbols.length,
    tokens: tokens.slice(0, TOKENS_SAMPLE),
    tokenCount: tokens.length,
    outputBytes,
    outputSample: outputBytes.subarray(0, OUTPUT_SAMPLE),
    outputSize: outputBytes.length,
  }
}
