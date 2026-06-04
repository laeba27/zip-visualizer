/**
 * Real ZIP container writer — built from scratch, no libraries.
 *
 * This produces a genuine, spec-compliant .zip file that the operating system
 * (macOS Archive Utility, Windows Explorer, WinRAR, `unzip`) can open directly.
 *
 * Why "stored" (method 0) and not DEFLATE?
 *   A real ZIP entry's compressed bytes must be valid DEFLATE if method=8. Our
 *   educational LZ77+Huffman bitstream is NOT DEFLATE-compatible, so wrapping it
 *   as method=8 would make every unzip tool reject the data. Method 0 ("stored",
 *   i.e. no compression) is fully part of the ZIP spec and universally supported,
 *   so we store the original bytes verbatim with a correct CRC32. The file opens
 *   everywhere; the compression *learning* still happens via the .myzip pipeline
 *   and its visualization.
 *
 * Format reference (PKZIP APPNOTE), little-endian throughout:
 *   [Local File Header + filename + data] per entry
 *   [Central Directory Header + filename] per entry
 *   [End Of Central Directory record]
 */

/** Standard CRC32 (IEEE 802.3 polynomial 0xEDB88320), table-driven. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** Growable little-endian byte writer. */
class ByteWriter {
  private parts: Uint8Array[] = []
  length = 0

  private push(arr: Uint8Array) {
    this.parts.push(arr)
    this.length += arr.length
  }

  u16(value: number) {
    const b = new Uint8Array(2)
    new DataView(b.buffer).setUint16(0, value, true)
    this.push(b)
  }

  u32(value: number) {
    const b = new Uint8Array(4)
    new DataView(b.buffer).setUint32(0, value >>> 0, true)
    this.push(b)
  }

  bytes(arr: Uint8Array) {
    this.push(arr)
  }

  toUint8Array(): Uint8Array {
    const out = new Uint8Array(this.length)
    let offset = 0
    for (const p of this.parts) {
      out.set(p, offset)
      offset += p.length
    }
    return out
  }
}

const LOCAL_SIG = 0x04034b50
const CENTRAL_SIG = 0x02014b50
const EOCD_SIG = 0x06054b50

export interface ZipEntry {
  /** Path inside the archive, e.g. "resume.pdf". */
  name: string
  /** Raw file bytes (stored uncompressed). */
  data: Uint8Array
}

/**
 * Build a ZIP archive from one or more entries using the "stored" method.
 * Returns the complete .zip file bytes, ready to download.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const out = new ByteWriter()

  // DOS date/time fields are mandatory but not meaningful here; use a fixed
  // 1980-01-01 00:00:00 (the ZIP epoch) so the build is deterministic and we
  // never call Date.now(). Time = 0, date = 0x0021 (1980-01-01).
  const dosTime = 0
  const dosDate = 0x0021

  interface Central {
    name: Uint8Array
    crc: number
    size: number
    offset: number
  }
  const central: Central[] = []

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const crc = crc32(entry.data)
    const size = entry.data.length
    const offset = out.length

    // ----- Local file header -----
    out.u32(LOCAL_SIG)
    out.u16(20) // version needed to extract (2.0)
    out.u16(0) // general purpose bit flag
    out.u16(0) // compression method: 0 = stored
    out.u16(dosTime)
    out.u16(dosDate)
    out.u32(crc)
    out.u32(size) // compressed size (== uncompressed for stored)
    out.u32(size) // uncompressed size
    out.u16(nameBytes.length)
    out.u16(0) // extra field length
    out.bytes(nameBytes)
    out.bytes(entry.data)

    central.push({ name: nameBytes, crc, size, offset })
  }

  // ----- Central directory -----
  const centralStart = out.length
  for (const c of central) {
    out.u32(CENTRAL_SIG)
    out.u16(20) // version made by
    out.u16(20) // version needed to extract
    out.u16(0) // general purpose bit flag
    out.u16(0) // compression method: stored
    out.u16(dosTime)
    out.u16(dosDate)
    out.u32(c.crc)
    out.u32(c.size) // compressed size
    out.u32(c.size) // uncompressed size
    out.u16(c.name.length)
    out.u16(0) // extra field length
    out.u16(0) // file comment length
    out.u16(0) // disk number start
    out.u16(0) // internal file attributes
    out.u32(0) // external file attributes
    out.u32(c.offset) // relative offset of local header
    out.bytes(c.name)
  }
  const centralSize = out.length - centralStart

  // ----- End of central directory -----
  out.u32(EOCD_SIG)
  out.u16(0) // number of this disk
  out.u16(0) // disk where central directory starts
  out.u16(central.length) // central directory records on this disk
  out.u16(central.length) // total central directory records
  out.u32(centralSize)
  out.u32(centralStart)
  out.u16(0) // comment length

  return out.toUint8Array()
}

/** Swap a filename's extension to `.zip`. */
export function toZipName(filename: string): string {
  const dot = filename.lastIndexOf('.')
  const base = dot === -1 ? filename : filename.slice(0, dot)
  return `${base}.zip`
}
