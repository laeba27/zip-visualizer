import { describe, expect, it } from 'vitest'
import { lz77Decode, lz77Encode, MIN_MATCH } from './lz77'

const enc = (s: string) => new TextEncoder().encode(s)

describe('lz77Encode / lz77Decode', () => {
  it('decode(encode(x)) === x for repetitive text', () => {
    const input = enc('ABCABCABCABC')
    const { tokens } = lz77Encode(input)
    expect(lz77Decode(tokens)).toEqual(input)
  })

  it('emits literals when there is nothing to match', () => {
    const input = enc('abcdef')
    const { tokens, matchCount } = lz77Encode(input)
    expect(matchCount).toBe(0)
    expect(tokens.every((t) => t.type === 'literal')).toBe(true)
  })

  it('produces back-references for repeats and they expand correctly', () => {
    const input = enc('the cat sat the cat sat the cat sat')
    const { tokens, matchCount } = lz77Encode(input)
    expect(matchCount).toBeGreaterThan(0)
    expect(lz77Decode(tokens)).toEqual(input)
  })

  it('never emits a match shorter than MIN_MATCH', () => {
    const input = enc('xyz xyz xyz xyz xyz')
    const { tokens } = lz77Encode(input)
    for (const t of tokens) if (t.type === 'match') expect(t.length).toBeGreaterThanOrEqual(MIN_MATCH)
  })

  it('handles overlapping references (offset < length)', () => {
    const input = enc('AAAAAAAAAAAAAAAA') // a run -> offset 1, long length
    const { tokens } = lz77Encode(input)
    expect(lz77Decode(tokens)).toEqual(input)
  })

  it('matchCount is the true total even when the pattern sample is capped', () => {
    const input = enc('abcd'.repeat(5000))
    const { matchCount, patterns } = lz77Encode(input)
    expect(matchCount).toBeGreaterThanOrEqual(patterns.length)
  })

  it('handles empty input', () => {
    const { tokens } = lz77Encode(new Uint8Array(0))
    expect(tokens).toEqual([])
    expect(lz77Decode([])).toEqual(new Uint8Array(0))
  })
})
