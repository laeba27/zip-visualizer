import { describe, expect, it } from 'vitest'
import { buildZip, crc32, toZipName } from './zip'

const enc = (s: string) => new TextEncoder().encode(s)

describe('crc32', () => {
  it('matches known CRC-32 (IEEE) test vectors', () => {
    // Standard vectors. "123456789" -> 0xCBF43926; empty -> 0.
    expect(crc32(enc('123456789')) >>> 0).toBe(0xcbf43926)
    expect(crc32(new Uint8Array(0))).toBe(0)
    expect(crc32(enc('The quick brown fox jumps over the lazy dog')) >>> 0).toBe(0x414fa339)
  })

  it('returns an unsigned 32-bit value', () => {
    const c = crc32(enc('abc'))
    expect(c).toBeGreaterThanOrEqual(0)
    expect(c).toBeLessThanOrEqual(0xffffffff)
  })
})

describe('buildZip', () => {
  it('writes the three required signatures (local, central, EOCD)', () => {
    const zip = buildZip([{ name: 'a.txt', data: enc('hello') }])
    const view = new DataView(zip.buffer)
    // Local file header at offset 0.
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    // EOCD signature appears near the end.
    let foundEocd = false
    for (let i = zip.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        foundEocd = true
        break
      }
    }
    expect(foundEocd).toBe(true)
  })

  it('stores the file uncompressed (method 0) with a correct CRC', () => {
    const data = enc('hello world')
    const zip = buildZip([{ name: 'h.txt', data }])
    const view = new DataView(zip.buffer)
    expect(view.getUint16(8, true)).toBe(0) // compression method = stored
    expect(view.getUint32(14, true) >>> 0).toBe(crc32(data)) // CRC field
    expect(view.getUint32(18, true)).toBe(data.length) // compressed size
    expect(view.getUint32(22, true)).toBe(data.length) // uncompressed size
  })

  it('records the entry count in the EOCD', () => {
    const zip = buildZip([
      { name: 'a', data: enc('1') },
      { name: 'b', data: enc('2') },
    ])
    const view = new DataView(zip.buffer)
    // Find EOCD and read the total-records field.
    for (let i = zip.length - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        expect(view.getUint16(i + 10, true)).toBe(2)
        return
      }
    }
    throw new Error('EOCD not found')
  })
})

describe('toZipName', () => {
  it('swaps the extension to .zip', () => {
    expect(toZipName('resume.pdf')).toBe('resume.zip')
    expect(toZipName('notes.txt')).toBe('notes.zip')
    expect(toZipName('noext')).toBe('noext.zip')
  })
})
