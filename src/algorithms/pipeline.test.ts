/**
 * End-to-end round-trip tests: the whole point of a lossless compressor is that
 * decompress(compress(x)) === x, byte-for-byte, for *every* input. These tests
 * are the project's safety net — if any stage regresses, one of these fails.
 */
import { describe, expect, it } from 'vitest'
import { compress } from './encoder'
import { decompress } from './decoder'

const enc = (s: string) => new TextEncoder().encode(s)

/** Assert that a byte array survives a full compress → .myzip → decompress cycle. */
function expectRoundTrip(name: string, input: Uint8Array) {
  const result = compress(name, input)
  const back = decompress(result.archiveBytes)
  expect(back.outputSize, `${name}: length`).toBe(input.length)
  expect(back.outputBytes, `${name}: bytes`).toEqual(input)
  return result
}

describe('compress → decompress round-trip', () => {
  it('repeating text (best case for LZ77)', () => {
    expectRoundTrip('repeat', enc('ABCABCABCABC'.repeat(50)))
  })

  it('natural-language text', () => {
    expectRoundTrip('lorem', enc('The quick brown fox jumps over the lazy dog. '.repeat(40)))
  })

  it('a single repeated byte', () => {
    expectRoundTrip('single', enc('aaaaaaaaaa'))
  })

  it('one byte', () => {
    expectRoundTrip('one', enc('x'))
  })

  it('empty input', () => {
    expectRoundTrip('empty', new Uint8Array(0))
  })

  it('all 256 byte values', () => {
    const bytes = new Uint8Array(256)
    for (let i = 0; i < 256; i++) bytes[i] = i
    expectRoundTrip('all-bytes', bytes)
  })

  it('binary data with the full byte range, repeated', () => {
    const unit = new Uint8Array(256)
    for (let i = 0; i < 256; i++) bytes(unit, i)
    function bytes(a: Uint8Array, i: number) {
      a[i] = (i * 7 + 3) & 0xff
    }
    const big = new Uint8Array(unit.length * 20)
    for (let i = 0; i < 20; i++) big.set(unit, i * unit.length)
    expectRoundTrip('binary-repeat', big)
  })

  it('pseudo-random (incompressible) data still round-trips', () => {
    const bytes = new Uint8Array(5000)
    let seed = 12345
    for (let i = 0; i < bytes.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      bytes[i] = seed & 0xff
    }
    expectRoundTrip('random', bytes)
  })

  it('overlapping back-references (offset < length) reconstruct correctly', () => {
    // "ABABABAB..." forces matches whose copy region overlaps the write head.
    expectRoundTrip('overlap', enc('AB'.repeat(500)))
  })

  it('larger input completes and round-trips', () => {
    const bytes = enc('Lorem ipsum dolor sit amet. '.repeat(20000)) // ~560 KB
    const result = expectRoundTrip('large', bytes)
    // Highly repetitive text should compress dramatically.
    expect(result.compressedSize).toBeLessThan(bytes.length / 2)
  })
})

describe('compression statistics', () => {
  it('reports real space savings on compressible input', () => {
    const result = compress('t', enc('ABCABCABC'.repeat(200)))
    expect(result.spaceSavedBytes).toBeGreaterThan(0)
    expect(result.compressionRatio).toBeLessThan(1)
    expect(result.compressedSize).toBe(result.archiveBytes.length)
  })

  it('exposes true counts even when display arrays are sampled', () => {
    const result = compress('t', enc('hello world '.repeat(500)))
    // tokens array is a bounded sample, but tokenCount is the true total.
    expect(result.tokenCount).toBeGreaterThanOrEqual(result.tokens.length)
    expect(result.literalCount + result.matchCount).toBe(result.tokenCount)
  })
})
