# ZipLab — Interactive Compression Visualizer

An educational, **100% client-side** web app that shows how ZIP-style compression
works internally. Upload a text or PDF file and watch the pipeline run step by
step: raw bytes → RLE warm-up → LZ77 pattern matching → Huffman coding →
compressed bitstream → a downloadable `.myzip` archive. Then upload the `.myzip`
back to watch the reverse process and reconstruct the original file.

Every compression algorithm is implemented **from scratch in TypeScript** — no
third-party compression libraries. The goal is educational transparency, not the
best compression ratio.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm test           # run the vitest suite (round-trip + unit tests)
npm run typecheck  # type-check without emitting
```

## Tests

The compression engine is the correctness-critical core, so it's covered by a
[vitest](https://vitest.dev) suite (`src/algorithms/*.test.ts`):

- **`pipeline.test.ts`** — end-to-end `decompress(compress(x)) === x` for text,
  binary, empty, single-byte, all-256-values, overlapping references, and
  pseudo-random inputs.
- **`lz77` / `huffman` / `bitstream` / `rle`** — per-stage unit tests, including
  the RFC 1951 canonical-code example and prefix-free guarantees.
- **`zip.test.ts`** — CRC-32 against standard vectors + ZIP structure checks.
- **`myzip.test.ts`** — container round-trip and malformed-input rejection.

## How it works

The pipeline (`src/algorithms/`) exposes every intermediate state so the UI can
visualize it:

| Stage | Module | What you see |
|-------|--------|--------------|
| Read bytes | `bitstream.ts` | bytes as decimal / hex / binary / ASCII |
| RLE warm-up | `rle.ts` | runs of identical bytes (illustrative only) |
| LZ77 | `lz77.ts` | repeated sequences highlighted + token stream |
| Frequency + Huffman | `huffman.ts` | frequency bars, animated tree, codebook |
| Bitstream | `bitstream.ts` + `encoder.ts` | the packed `0/1` stream and stats |
| Package | `myzip.ts` | the `.myzip` container, ratio, space saved |

`encoder.ts` runs the forward pipeline; `decoder.ts` runs it in reverse.

### The `.myzip` format

A compact binary container (version 2):

```
0       magic "MYZP" + version
5..12   originalSize, bitLength (uint32, little-endian)
13..    filename (length-prefixed UTF-8)
…       257-byte canonical Huffman code-length table (1 byte per symbol)
…       raw packed bitstream bytes
```

Instead of the whole codebook, the archive stores just each symbol's **code
length** and rebuilds identical [canonical Huffman](EXPLAINED.md#9-stage-5--the-myzip-container)
codes on both sides — the same trick DEFLATE uses. The payload is raw bytes (no
base64). Overhead is now a small constant (~280 bytes), so files with real
redundancy genuinely shrink; **tiny or already-compressed files (PDF/JPG) may
still grow** — that trade-off is surfaced in the UI as part of the lesson.

## Stack

React · TypeScript · Tailwind CSS · Framer Motion · Vite. No backend, no
database, no uploads — everything happens in memory in the browser.
# zip-visualizer
