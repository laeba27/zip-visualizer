import { describe, expect, it } from 'vitest'
import { buildMyZip, parseMyZip } from './myzip'

function makeArchive(filename = 'test.txt') {
  return buildMyZip({
    filename,
    originalSize: 100,
    bitLength: 20,
    codeLengths: { 65: 1, 66: 2, 67: 2 },
    packedBytes: new Uint8Array([0b10110100, 0b11000000]),
  })
}

describe('buildMyZip / parseMyZip', () => {
  it('round-trips metadata and payload', () => {
    const bytes = makeArchive('résumé.pdf') // non-ASCII filename exercises UTF-8
    const m = parseMyZip(bytes)
    expect(m.filename).toBe('résumé.pdf')
    expect(m.originalSize).toBe(100)
    expect(m.bitLength).toBe(20)
    expect(Array.from(m.packedBytes)).toEqual([0b10110100, 0b11000000])
  })

  it('rebuilds canonical codes from the stored lengths', () => {
    const m = parseMyZip(makeArchive())
    // Lengths A=1,B=2,C=2 -> canonical A=0, B=10, C=11.
    expect(m.codes).toEqual({ 65: '0', 66: '10', 67: '11' })
  })

  it('starts with the MYZP magic and version 2', () => {
    const bytes = makeArchive()
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0x4d, 0x59, 0x5a, 0x50])
    expect(bytes[4]).toBe(2)
  })
})

describe('parseMyZip rejects malformed input', () => {
  it('rejects a bad magic header', () => {
    expect(() => parseMyZip(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))).toThrow(/magic/i)
  })

  it('rejects a too-short buffer', () => {
    expect(() => parseMyZip(new Uint8Array([0x4d, 0x59]))).toThrow()
  })

  it('rejects an unsupported version', () => {
    const bytes = makeArchive()
    bytes[4] = 99 // corrupt the version byte
    expect(() => parseMyZip(bytes)).toThrow(/version/i)
  })

  it('rejects truncation before the code table', () => {
    const bytes = makeArchive()
    // Keep the header but cut off inside the code-length table.
    expect(() => parseMyZip(bytes.subarray(0, 20))).toThrow()
  })
})
