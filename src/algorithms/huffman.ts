/**
 * Huffman coding — built from scratch with a simple priority queue.
 *
 * We count how often each symbol appears, repeatedly merge the two least-frequent
 * nodes into a parent, and the resulting binary tree assigns short codes to
 * frequent symbols and long codes to rare ones. Every merge step is recorded so
 * the UI can animate the tree being assembled bottom-up.
 */

import {
  MATCH_MARKER,
  type FrequencyEntry,
  type HuffmanBuildStep,
  type HuffmanCodes,
  type HuffmanNode,
} from './types'

/** Human-readable label for a symbol id (printable ASCII, hex byte, or MATCH). */
export function symbolLabel(symbol: number): string {
  if (symbol === MATCH_MARKER) return 'MATCH'
  if (symbol >= 0x20 && symbol <= 0x7e) return `'${String.fromCharCode(symbol)}'`
  return '0x' + symbol.toString(16).padStart(2, '0').toUpperCase()
}

/** Count symbol frequencies and return a display-sorted table. */
export function buildFrequencyTable(symbols: number[]): FrequencyEntry[] {
  const counts = new Map<number, number>()
  for (const s of symbols) counts.set(s, (counts.get(s) ?? 0) + 1)

  const table: FrequencyEntry[] = []
  for (const [symbol, count] of counts) {
    table.push({ symbol, label: symbolLabel(symbol), count })
  }
  // Most frequent first — that's the interesting end for the visualization.
  table.sort((a, b) => b.count - a.count || a.symbol - b.symbol)
  return table
}

export interface HuffmanResult {
  tree: HuffmanNode | null
  codes: HuffmanCodes
  steps: HuffmanBuildStep[]
}

/**
 * Build the Huffman tree and derive codes.
 *
 * A tiny array-backed priority queue is enough for educational sizes. We always
 * pull the two lowest-weight nodes; ties are broken by insertion id to keep the
 * tree deterministic (so decompression rebuilds the identical structure).
 */
export function buildHuffman(frequencyTable: FrequencyEntry[]): HuffmanResult {
  const steps: HuffmanBuildStep[] = []
  let nextId = 0

  // Seed the queue with one leaf per distinct symbol.
  const queue: HuffmanNode[] = frequencyTable.map((entry) => ({
    id: nextId++,
    weight: entry.count,
    symbol: entry.symbol,
    label: entry.label,
  }))

  if (queue.length === 0) {
    return { tree: null, codes: {}, steps }
  }

  // Edge case: a single distinct symbol still needs a 1-bit code, so we give it
  // a parent with one child. We assign code "0" to it below.
  if (queue.length === 1) {
    const only = queue[0]
    const root: HuffmanNode = {
      id: nextId++,
      weight: only.weight,
      left: only,
    }
    const codes: HuffmanCodes = { [only.symbol as number]: '0' }
    return { tree: root, codes, steps }
  }

  const pullMin = (): HuffmanNode => {
    let bestIdx = 0
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i]
      const b = queue[bestIdx]
      if (a.weight < b.weight || (a.weight === b.weight && a.id < b.id)) {
        bestIdx = i
      }
    }
    return queue.splice(bestIdx, 1)[0]
  }

  while (queue.length > 1) {
    const left = pullMin()
    const right = pullMin()
    const parent: HuffmanNode = {
      id: nextId++,
      weight: left.weight + right.weight,
      left,
      right,
    }
    steps.push({
      leftWeight: left.weight,
      rightWeight: right.weight,
      leftLabel: left.label ?? `(${left.weight})`,
      rightLabel: right.label ?? `(${right.weight})`,
      mergedWeight: parent.weight,
      remaining: queue.length + 1, // after re-inserting parent
    })
    queue.push(parent)
  }

  const tree = queue[0]
  const codes: HuffmanCodes = {}
  assignCodes(tree, '', codes)
  return { tree, codes, steps }
}

/** Walk the tree assigning '0' for left edges and '1' for right edges. */
function assignCodes(node: HuffmanNode, prefix: string, codes: HuffmanCodes): void {
  if (node.symbol !== undefined) {
    codes[node.symbol] = prefix || '0'
    return
  }
  if (node.left) assignCodes(node.left, prefix + '0', codes)
  if (node.right) assignCodes(node.right, prefix + '1', codes)
}

/**
 * Canonical Huffman codes.
 *
 * The codebook we ship in the archive used to be a full {symbol: "0110"} map,
 * which is bulky. Instead we ship only each symbol's *code length*. Both the
 * encoder and decoder can then regenerate the EXACT same codes from the lengths
 * alone, using one deterministic rule — this is what real DEFLATE does, and it
 * shrinks the stored codebook from a JSON blob to one byte per symbol.
 *
 * The rule (RFC 1951 §3.2.2): order symbols by (length, then symbol value).
 * Start code = 0. Walk in that order; whenever the length increases by d, shift
 * the running code left by d first. Assign the running code, then increment.
 */

/** Map symbol -> bit length of its code (0 = symbol not present). */
export type CodeLengths = Record<number, number>

/** Extract code lengths from a freshly-built codebook. */
export function codeLengthsFrom(codes: HuffmanCodes): CodeLengths {
  const lengths: CodeLengths = {}
  for (const key of Object.keys(codes)) {
    const symbol = Number(key)
    lengths[symbol] = codes[symbol].length
  }
  return lengths
}

/** Rebuild canonical codes (symbol -> code string) from code lengths alone. */
export function canonicalCodes(lengths: CodeLengths): HuffmanCodes {
  // Symbols that actually have a code, ordered by (length, symbol).
  const symbols = Object.keys(lengths)
    .map(Number)
    .filter((s) => lengths[s] > 0)
    .sort((a, b) => lengths[a] - lengths[b] || a - b)

  const codes: HuffmanCodes = {}
  let code = 0
  let prevLen = symbols.length ? lengths[symbols[0]] : 0
  for (const symbol of symbols) {
    const len = lengths[symbol]
    code <<= len - prevLen // shift left when the length grows
    prevLen = len
    codes[symbol] = code.toString(2).padStart(len, '0')
    code += 1
  }
  return codes
}

/**
 * Rebuild a decode tree from a codebook (symbol -> code string). Used on the
 * decompression side, where we don't ship the tree itself, only the codes.
 */
export function buildDecodeTree(codes: HuffmanCodes): HuffmanNode {
  let nextId = 0
  const root: HuffmanNode = { id: nextId++, weight: 0 }

  for (const symbolStr of Object.keys(codes)) {
    const symbol = Number(symbolStr)
    const code = codes[symbol]
    let node = root
    for (const bit of code) {
      if (bit === '0') {
        node.left ??= { id: nextId++, weight: 0 }
        node = node.left
      } else {
        node.right ??= { id: nextId++, weight: 0 }
        node = node.right
      }
    }
    node.symbol = symbol
    node.label = symbolLabel(symbol)
  }
  return root
}

/** Decode a bitstring into symbols by walking the decode tree. */
export function huffmanDecode(bitstring: string, codes: HuffmanCodes): number[] {
  const root = buildDecodeTree(codes)
  const symbols: number[] = []

  // Single-symbol archives: every bit maps to the one symbol.
  const entries = Object.keys(codes)
  if (entries.length === 1) {
    const only = Number(entries[0])
    for (let i = 0; i < bitstring.length; i++) symbols.push(only)
    return symbols
  }

  let node = root
  for (const bit of bitstring) {
    node = (bit === '0' ? node.left : node.right) as HuffmanNode
    if (!node) break
    if (node.symbol !== undefined) {
      symbols.push(node.symbol)
      node = root
    }
  }
  return symbols
}

/**
 * Streaming decode straight from packed bytes — no giant bit string. Used on the
 * decompression side for real files. `bitLength` is the number of meaningful
 * bits (the rest is padding).
 */
export function huffmanDecodeBytes(
  packed: Uint8Array,
  bitLength: number,
  codes: HuffmanCodes,
  onProgress?: (fraction: number) => void,
): number[] {
  const symbols: number[] = []
  const entries = Object.keys(codes)

  // Single-symbol archives: every bit maps to the one symbol.
  if (entries.length === 1) {
    const only = Number(entries[0])
    for (let i = 0; i < bitLength; i++) symbols.push(only)
    onProgress?.(1)
    return symbols
  }

  const root = buildDecodeTree(codes)
  let node = root
  let nextProgressAt = 0
  for (let i = 0; i < bitLength; i++) {
    const bit = (packed[i >> 3] >> (7 - (i & 7))) & 1
    node = (bit === 0 ? node.left : node.right) as HuffmanNode
    if (!node) break
    if (node.symbol !== undefined) {
      symbols.push(node.symbol)
      node = root
    }
    if (onProgress && i >= nextProgressAt) {
      onProgress(i / bitLength)
      nextProgressAt = i + 500000
    }
  }
  onProgress?.(1)
  return symbols
}
