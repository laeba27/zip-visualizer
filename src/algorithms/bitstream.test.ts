import { describe, expect, it } from 'vitest'
import { BitWriter, byteToBinary, byteToHex, getBit, packBits, unpackBits } from './bitstream'

describe('packBits / unpackBits', () => {
  it('round-trips an arbitrary bit string', () => {
    const bits = '110100011110000101'
    const { bytes, bitLength } = packBits(bits)
    expect(unpackBits(bytes, bitLength)).toBe(bits)
  })

  it('packs MSB-first', () => {
    const { bytes } = packBits('10000000')
    expect(bytes[0]).toBe(0x80)
  })

  it('handles a non-byte-aligned length with zero padding', () => {
    const bits = '101' // 3 bits -> 1 byte, padded
    const { bytes, bitLength } = packBits(bits)
    expect(bitLength).toBe(3)
    expect(unpackBits(bytes, bitLength)).toBe('101')
  })

  it('empty bit string', () => {
    const { bytes, bitLength } = packBits('')
    expect(bitLength).toBe(0)
    expect(unpackBits(bytes, 0)).toBe('')
  })
})

describe('BitWriter matches packBits', () => {
  it('produces identical bytes to packing the equivalent string', () => {
    const codes = ['0', '110', '1', '0010', '111', '10']
    const writer = new BitWriter()
    for (const c of codes) writer.writeCode(c)
    const fromWriter = writer.finish()

    const fromString = packBits(codes.join(''))
    expect(Array.from(fromWriter.bytes)).toEqual(Array.from(fromString.bytes))
    expect(fromWriter.bitLength).toBe(fromString.bitLength)
  })

  it('grows its buffer across many writes', () => {
    const writer = new BitWriter(4) // tiny initial buffer forces growth
    for (let i = 0; i < 1000; i++) writer.writeCode('1010')
    const { bitLength } = writer.finish()
    expect(bitLength).toBe(4000)
  })
})

describe('getBit', () => {
  it('reads MSB-first bits consistently with unpackBits', () => {
    const { bytes, bitLength } = packBits('10110001')
    let s = ''
    for (let i = 0; i < bitLength; i++) s += getBit(bytes, i)
    expect(s).toBe('10110001')
  })
})

describe('byte rendering helpers', () => {
  it('byteToBinary pads to 8 chars', () => {
    expect(byteToBinary(5)).toBe('00000101')
    expect(byteToBinary(255)).toBe('11111111')
  })
  it('byteToHex is 2 uppercase chars', () => {
    expect(byteToHex(10)).toBe('0A')
    expect(byteToHex(255)).toBe('FF')
  })
})
