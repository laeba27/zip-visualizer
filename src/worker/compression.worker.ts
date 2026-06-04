/**
 * Compression Web Worker.
 *
 * Runs the (potentially heavy) compress/decompress pipelines off the main thread
 * so the UI never freezes, even on multi-megabyte files. It streams progress
 * messages back and posts the final result. The result already contains only
 * bounded samples for visualization, so it stays small enough to structured-clone.
 */

import { compress } from '../algorithms/encoder'
import { decompress } from '../algorithms/decoder'
import type { CompressionResult, DecompressionResult } from '../algorithms/types'

export type WorkerRequest =
  | { id: number; kind: 'compress'; fileName: string; bytes: ArrayBuffer }
  | { id: number; kind: 'decompress'; bytes: ArrayBuffer }

export type WorkerResponse =
  | { id: number; type: 'progress'; fraction: number; label: string }
  | { id: number; type: 'compress-done'; result: CompressionResult }
  | { id: number; type: 'decompress-done'; result: DecompressionResult }
  | { id: number; type: 'error'; message: string }

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data
  const post = (msg: WorkerResponse) => ctx.postMessage(msg)

  try {
    if (req.kind === 'compress') {
      const bytes = new Uint8Array(req.bytes)
      const result = compress(req.fileName, bytes, {
        onProgress: (fraction, label) => post({ id: req.id, type: 'progress', fraction, label }),
      })
      post({ id: req.id, type: 'compress-done', result })
    } else {
      const bytes = new Uint8Array(req.bytes)
      const result = decompress(bytes, {
        onProgress: (fraction, label) => post({ id: req.id, type: 'progress', fraction, label }),
      })
      post({ id: req.id, type: 'decompress-done', result })
    }
  } catch (err) {
    post({ id: req.id, type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
