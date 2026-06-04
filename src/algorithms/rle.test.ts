import { describe, expect, it } from 'vitest'
import { rleDecode, rleEncode } from './rle'

const enc = (s: string) => new TextEncoder().encode(s)

describe('rleEncode / rleDecode', () => {
  it('collapses runs', () => {
    const runs = rleEncode(enc('AAAAABBBCC'))
    expect(runs).toEqual([
      { symbol: 65, run: 5 },
      { symbol: 66, run: 3 },
      { symbol: 67, run: 2 },
    ])
  })

  it('round-trips', () => {
    const input = enc('AAAAABBBCCDDDDDDDD')
    expect(rleDecode(rleEncode(input))).toEqual(input)
  })

  it('handles no repeats', () => {
    const input = enc('abcdef')
    expect(rleEncode(input).every((r) => r.run === 1)).toBe(true)
    expect(rleDecode(rleEncode(input))).toEqual(input)
  })

  it('handles empty input', () => {
    expect(rleEncode(new Uint8Array(0))).toEqual([])
    expect(rleDecode([])).toEqual(new Uint8Array(0))
  })
})
