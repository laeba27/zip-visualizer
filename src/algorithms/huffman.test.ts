import { describe, expect, it } from 'vitest'
import {
  buildFrequencyTable,
  buildHuffman,
  canonicalCodes,
  codeLengthsFrom,
  huffmanDecode,
  huffmanDecodeBytes,
  symbolLabel,
  type CodeLengths,
} from './huffman'
import { BitWriter } from './bitstream'

describe('buildFrequencyTable', () => {
  it('counts and sorts by frequency (descending)', () => {
    const table = buildFrequencyTable([1, 1, 1, 2, 2, 3])
    expect(table[0]).toMatchObject({ symbol: 1, count: 3 })
    expect(table[1]).toMatchObject({ symbol: 2, count: 2 })
    expect(table[2]).toMatchObject({ symbol: 3, count: 1 })
  })

  it('returns an empty table for no symbols', () => {
    expect(buildFrequencyTable([])).toEqual([])
  })
})

describe('Huffman codes are prefix-free', () => {
  const isPrefixFree = (codes: Record<number, string>) => {
    const list = Object.values(codes)
    for (let i = 0; i < list.length; i++)
      for (let j = 0; j < list.length; j++) if (i !== j && list[j].startsWith(list[i])) return false
    return true
  }

  it('tree-assigned codes are prefix-free', () => {
    const table = buildFrequencyTable([65, 65, 65, 66, 66, 67, 67, 67, 67])
    const { codes } = buildHuffman(table)
    expect(isPrefixFree(codes)).toBe(true)
  })

  it('frequent symbols get codes no longer than rare ones', () => {
    const table = buildFrequencyTable([1, 1, 1, 1, 1, 2, 2, 3]) // 1 most frequent
    const { codes } = buildHuffman(table)
    expect(codes[1].length).toBeLessThanOrEqual(codes[3].length)
  })

  it('single distinct symbol gets a 1-bit code', () => {
    const table = buildFrequencyTable([88, 88, 88])
    const { codes } = buildHuffman(table)
    expect(codes[88]).toBe('0')
  })
})

describe('canonical codes', () => {
  it('matches the RFC 1951 worked example', () => {
    // Lengths A=2 B=1 C=3 D=3 -> B=0, A=10, C=110, D=111
    const lengths: CodeLengths = { 65: 2, 66: 1, 67: 3, 68: 3 }
    expect(canonicalCodes(lengths)).toEqual({ 66: '0', 65: '10', 67: '110', 68: '111' })
  })

  it('round-trips through codeLengthsFrom', () => {
    const table = buildFrequencyTable([1, 1, 1, 2, 2, 3, 4, 4, 4, 4])
    const { codes } = buildHuffman(table)
    const rebuilt = canonicalCodes(codeLengthsFrom(codes))
    // Same code *lengths* for every symbol (canonical may differ in exact bits).
    for (const s of Object.keys(codes)) {
      expect(rebuilt[Number(s)].length).toBe(codes[Number(s)].length)
    }
  })

  it('canonical codes are still prefix-free', () => {
    const codes = canonicalCodes({ 1: 1, 2: 2, 3: 3, 4: 3 })
    const list = Object.values(codes)
    for (let i = 0; i < list.length; i++)
      for (let j = 0; j < list.length; j++)
        if (i !== j) expect(list[j].startsWith(list[i])).toBe(false)
  })
})

describe('huffmanDecode (string) and huffmanDecodeBytes (streaming) agree', () => {
  it('decode inverts encode for a known stream', () => {
    const symbols = [65, 66, 65, 67, 65, 66, 65]
    const table = buildFrequencyTable(symbols)
    const { codes } = buildHuffman(table)
    const canon = canonicalCodes(codeLengthsFrom(codes))

    const bits = symbols.map((s) => canon[s]).join('')
    expect(huffmanDecode(bits, canon)).toEqual(symbols)

    const writer = new BitWriter()
    for (const s of symbols) writer.writeCode(canon[s])
    const { bytes, bitLength } = writer.finish()
    expect(huffmanDecodeBytes(bytes, bitLength, canon)).toEqual(symbols)
  })

  it('single-symbol stream decodes from packed bytes', () => {
    const symbols = [42, 42, 42, 42, 42]
    const canon = canonicalCodes({ 42: 1 })
    const writer = new BitWriter()
    for (const s of symbols) writer.writeCode(canon[s])
    const { bytes, bitLength } = writer.finish()
    expect(huffmanDecodeBytes(bytes, bitLength, canon)).toEqual(symbols)
  })
})

describe('symbolLabel', () => {
  it('labels printable ASCII, hex bytes, and the match marker', () => {
    expect(symbolLabel(65)).toBe("'A'")
    expect(symbolLabel(0)).toBe('0x00')
    expect(symbolLabel(256)).toBe('MATCH')
  })
})
