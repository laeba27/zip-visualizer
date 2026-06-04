/**
 * The .myzip container format (version 2 — compact binary).
 *
 * Earlier versions stored a JSON manifest with a full Huffman codebook and a
 * base64 payload. That was readable but bulky: base64 alone adds ~33%, and the
 * JSON codebook could be several KB. Version 2 is a tight binary layout that
 * stores raw bytes and only one *code length* per symbol (canonical Huffman),
 * so archives are dramatically smaller — files with real redundancy now shrink.
 *
 * Layout (little-endian):
 *
 *   offset  size   field
 *   0       4      magic "MYZP" (0x4D 0x59 0x5A 0x50)
 *   4       1      version = 2
 *   5       4      originalSize (uint32)        — bytes in the source file
 *   9       4      bitLength (uint32)           — meaningful bits in payload
 *   13      2      filenameLength (uint16)
 *   15      n      filename (UTF-8)
 *   15+n    257    code lengths for symbols 0..256, one byte each (0 = absent)
 *   …       rest   raw packed bitstream bytes
 *
 * The 257-byte table covers the whole symbol alphabet (0..255 literals + the
 * match marker 256). A length of 0 means "this symbol never occurred." The
 * decoder feeds these lengths to canonicalCodes() to rebuild the exact codebook.
 */

import { ALPHABET_SIZE, type MyZipManifest } from './types'
import { canonicalCodes, type CodeLengths } from './huffman'

const MAGIC = [0x4d, 0x59, 0x5a, 0x50] // "MYZP"
const VERSION = 2
const HEADER_FIXED = 15 // magic(4) + version(1) + originalSize(4) + bitLength(4) + filenameLen(2)

export interface BuildMyZipInput {
  filename: string
  originalSize: number
  bitLength: number
  /** Per-symbol code lengths (0 for absent symbols). */
  codeLengths: CodeLengths
  packedBytes: Uint8Array
}

/** Serialize the compressed data + metadata into compact .myzip container bytes. */
export function buildMyZip(input: BuildMyZipInput): Uint8Array {
  const nameBytes = new TextEncoder().encode(input.filename)
  const total = HEADER_FIXED + nameBytes.length + ALPHABET_SIZE + input.packedBytes.length

  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  let offset = 0

  out.set(MAGIC, offset)
  offset += 4
  out[offset++] = VERSION
  view.setUint32(offset, input.originalSize, true)
  offset += 4
  view.setUint32(offset, input.bitLength, true)
  offset += 4
  view.setUint16(offset, nameBytes.length, true)
  offset += 2

  out.set(nameBytes, offset)
  offset += nameBytes.length

  // Code-length table: one byte per symbol id, 0..256.
  for (let s = 0; s < ALPHABET_SIZE; s++) {
    out[offset++] = input.codeLengths[s] ?? 0
  }

  out.set(input.packedBytes, offset)
  return out
}

/** Parse compact .myzip container bytes back into a manifest. Throws if malformed. */
export function parseMyZip(bytes: Uint8Array): MyZipManifest {
  if (bytes.length < HEADER_FIXED || !MAGIC.every((b, i) => bytes[i] === b)) {
    throw new Error('Not a valid .myzip file (bad magic header).')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  const version = bytes[4]
  if (version !== VERSION) {
    throw new Error(`Unsupported .myzip version ${version} (expected ${VERSION}).`)
  }

  const originalSize = view.getUint32(5, true)
  const bitLength = view.getUint32(9, true)
  const nameLength = view.getUint16(13, true)

  let offset = HEADER_FIXED
  const filename = new TextDecoder().decode(bytes.subarray(offset, offset + nameLength))
  offset += nameLength

  if (bytes.length < offset + ALPHABET_SIZE) {
    throw new Error('Corrupt .myzip file (truncated code table).')
  }
  const codeLengths: CodeLengths = {}
  for (let s = 0; s < ALPHABET_SIZE; s++) {
    const len = bytes[offset++]
    if (len > 0) codeLengths[s] = len
  }

  const packedBytes = bytes.subarray(offset)
  const codes = canonicalCodes(codeLengths)

  return {
    format: 'myzip',
    version: VERSION,
    filename,
    algorithm: 'RLE+LZ77+Huffman',
    originalSize,
    bitLength,
    codes,
    packedBytes,
  }
}
