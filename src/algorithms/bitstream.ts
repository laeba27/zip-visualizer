/**
 * Bitstream helpers — turn a string of '0'/'1' into packed bytes and back.
 *
 * Huffman codes have variable bit lengths, so the concatenated codes form a bit
 * string that rarely lands on a byte boundary. We pack 8 bits per byte (MSB
 * first) and remember how many bits are meaningful so the trailing zero padding
 * can be discarded on decode.
 */

/** Pack a '0'/'1' string into bytes (MSB first). Returns bytes + meaningful bit count. */
export function packBits(bitstring: string): { bytes: Uint8Array; bitLength: number } {
  const bitLength = bitstring.length
  const byteLength = Math.ceil(bitLength / 8)
  const bytes = new Uint8Array(byteLength)

  for (let i = 0; i < bitLength; i++) {
    if (bitstring[i] === '1') {
      bytes[i >> 3] |= 0x80 >> (i & 7)
    }
  }
  return { bytes, bitLength }
}

/**
 * Streaming bit writer — appends '0'/'1' codes straight into a growing byte
 * buffer (MSB first), never materializing a giant bit *string*. This is what the
 * encoder uses on real files; for a multi-MB input the equivalent bit string
 * would be tens of millions of characters and blow up memory.
 */
export class BitWriter {
  private bytes: Uint8Array
  private byteLen = 0
  private cur = 0 // bits accumulated in the current (not-yet-flushed) byte
  private nbits = 0 // number of valid bits in `cur`
  bitLength = 0

  constructor(estimatedBytes = 1024) {
    this.bytes = new Uint8Array(Math.max(16, estimatedBytes))
  }

  private ensure(extra: number) {
    if (this.byteLen + extra <= this.bytes.length) return
    let cap = this.bytes.length * 2
    while (cap < this.byteLen + extra) cap *= 2
    const grown = new Uint8Array(cap)
    grown.set(this.bytes.subarray(0, this.byteLen))
    this.bytes = grown
  }

  /** Append a code string like "0110" (MSB first). */
  writeCode(code: string) {
    for (let i = 0; i < code.length; i++) {
      this.cur = (this.cur << 1) | (code.charCodeAt(i) === 49 ? 1 : 0) // '1' === 49
      this.nbits++
      this.bitLength++
      if (this.nbits === 8) {
        this.ensure(1)
        this.bytes[this.byteLen++] = this.cur
        this.cur = 0
        this.nbits = 0
      }
    }
  }

  /** Finish: flush the partial byte (left-aligned, zero-padded) and return bytes. */
  finish(): { bytes: Uint8Array; bitLength: number } {
    if (this.nbits > 0) {
      this.ensure(1)
      this.bytes[this.byteLen++] = this.cur << (8 - this.nbits) // pad on the right
      this.cur = 0
      this.nbits = 0
    }
    return { bytes: this.bytes.slice(0, this.byteLen), bitLength: this.bitLength }
  }
}

/** Unpack bytes back into a '0'/'1' string of exactly `bitLength` bits. */
export function unpackBits(bytes: Uint8Array, bitLength: number): string {
  const out = new Array<string>(bitLength)
  for (let i = 0; i < bitLength; i++) {
    out[i] = (bytes[i >> 3] >> (7 - (i & 7))) & 1 ? '1' : '0'
  }
  return out.join('')
}

/** Read a single bit (MSB first) from packed bytes. Used by the streaming decoder. */
export function getBit(bytes: Uint8Array, i: number): number {
  return (bytes[i >> 3] >> (7 - (i & 7))) & 1
}

/** Render a single byte as an 8-character binary string (for the binary viewer). */
export function byteToBinary(byte: number): string {
  return byte.toString(2).padStart(8, '0')
}

/** Render a single byte as a 2-character uppercase hex string. */
export function byteToHex(byte: number): string {
  return byte.toString(16).padStart(2, '0').toUpperCase()
}
