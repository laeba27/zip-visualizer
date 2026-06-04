/** Central definition of the pipeline stages shown as tabs. */
import {
  Binary,
  FileArchive,
  PackageOpen,
  Repeat,
  Search,
  BarChart3,
  Boxes,
  FileText,
  Hash,
  Sparkles,
  TreePine,
  type LucideIcon,
} from 'lucide-react'
import type { AccentColor } from './theme'

export interface StageDef {
  key: string
  /** Short label for the tab. */
  title: string
  /** One-line technical summary (header). */
  blurb: string
  /** Plain-English "what's happening" — written for a non-expert. */
  explain: string
  accent: AccentColor
  icon: LucideIcon
}

export const COMPRESSION_STAGES: StageDef[] = [
  {
    key: 'bytes',
    title: 'Read bytes',
    blurb: 'The file is read into memory as raw bytes.',
    explain:
      'Every file — text, PDF, anything — is really just a long list of numbers from 0 to 255 called bytes. Here we read your file and show those numbers. Flip between decimal, hex, binary, and text views to see the exact same data written four different ways.',
    accent: 'sky',
    icon: Binary,
  },
  {
    key: 'rle',
    title: 'Find runs',
    blurb: 'RLE warm-up: collapse repeated bytes into value × count.',
    explain:
      'The simplest compression idea: if the same byte repeats several times in a row, write it once with a count instead. "AAAA" becomes "4×A". This warm-up shows the basic principle before the smarter algorithms take over.',
    accent: 'cyan',
    icon: Repeat,
  },
  {
    key: 'lz77',
    title: 'Spot patterns',
    blurb: 'LZ77 replaces repeated sequences with short back-references.',
    explain:
      'Files repeat themselves a lot. Instead of storing the same chunk twice, LZ77 leaves a note: "copy 9 characters from 3 steps back." The highlighted bytes are the repeats it found; each ⟲(offset, length) tag is one of those space-saving notes.',
    accent: 'amber',
    icon: Search,
  },
  {
    key: 'frequency',
    title: 'Count symbols',
    blurb: 'Tally how often each symbol appears.',
    explain:
      'Next we count how often each value shows up. Some appear constantly, others almost never. This tally is the clue we need to give the common ones the shortest codes — the heart of the next step.',
    accent: 'violet',
    icon: BarChart3,
  },
  {
    key: 'huffman',
    title: 'Build code tree',
    blurb: 'Huffman assigns short codes to frequent symbols.',
    explain:
      'Like Morse code, where common letters get short signals: we build a tree that gives frequent symbols tiny codes (like "0") and rare ones longer codes. Following the tree from the top, left = 0 and right = 1, spells out each symbol\'s code.',
    accent: 'violet',
    icon: TreePine,
  },
  {
    key: 'bitstream',
    title: 'Pack bits',
    blurb: 'Swap each symbol for its code and pack into bytes.',
    explain:
      'Now we replace every symbol with its short code from the tree and glue all those bits together. Because frequent symbols became tiny, the whole stream shrinks. This is the actual compressed data.',
    accent: 'cyan',
    icon: Boxes,
  },
  {
    key: 'package',
    title: 'Save file',
    blurb: 'Bundle the data + metadata into a downloadable archive.',
    explain:
      'Finally we wrap the compressed bits together with the info needed to undo it later (the filename and the code table) into a file you can download. The stats show how much smaller it got.',
    accent: 'emerald',
    icon: FileArchive,
  },
]

export const DECOMPRESSION_STAGES: StageDef[] = [
  {
    key: 'parse',
    title: 'Open archive',
    blurb: 'Read the .myzip header and metadata.',
    explain:
      'We open the archive and read its label: the original filename, the code table, and the packed data. Everything needed to rebuild the file is right here.',
    accent: 'emerald',
    icon: FileText,
  },
  {
    key: 'unpack',
    title: 'Unpack bits',
    blurb: 'Expand the packed bytes back into the bitstream.',
    explain:
      'We spread the packed bytes back out into the exact stream of 0s and 1s that compression produced — the raw material for decoding.',
    accent: 'cyan',
    icon: Boxes,
  },
  {
    key: 'huffman',
    title: 'Decode codes',
    blurb: 'Walk the code tree to recover symbols.',
    explain:
      'Using the saved code table, we read the bits one at a time, walking the tree until we hit a symbol, then start again. This turns the bit soup back into the original symbols.',
    accent: 'violet',
    icon: Hash,
  },
  {
    key: 'lz77',
    title: 'Expand patterns',
    blurb: 'Replay back-references to regrow the data.',
    explain:
      'Remember those "copy from earlier" notes? We follow them now, copying the referenced chunks back into place. The data grows back to its full length.',
    accent: 'amber',
    icon: Sparkles,
  },
  {
    key: 'rebuild',
    title: 'Restore file',
    blurb: 'Reassemble the original bytes, ready to download.',
    explain:
      'The bytes are now exactly what you started with — verified to match perfectly. Download your original file back, good as new.',
    accent: 'sky',
    icon: PackageOpen,
  },
]
