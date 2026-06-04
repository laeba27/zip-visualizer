/**
 * React hook that owns a single compression Web Worker and exposes promise-based
 * compress()/decompress() calls with progress reporting. The worker is created
 * lazily and torn down on unmount.
 */
import { useCallback, useEffect, useRef } from 'react'
import type { CompressionResult, DecompressionResult } from '../algorithms/types'
import type { WorkerRequest, WorkerResponse } from './compression.worker'

export interface Progress {
  fraction: number
  label: string
}

type Pending = {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
  onProgress?: (p: Progress) => void
}

export function useCompressionWorker() {
  const workerRef = useRef<Worker | null>(null)
  const pending = useRef(new Map<number, Pending>())
  const nextId = useRef(1)

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      const worker = new Worker(new URL('./compression.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data
        const p = pending.current.get(msg.id)
        if (!p) return
        if (msg.type === 'progress') {
          p.onProgress?.({ fraction: msg.fraction, label: msg.label })
        } else if (msg.type === 'compress-done' || msg.type === 'decompress-done') {
          pending.current.delete(msg.id)
          p.resolve(msg.result)
        } else if (msg.type === 'error') {
          pending.current.delete(msg.id)
          p.reject(new Error(msg.message))
        }
      }
      worker.onerror = (e) => {
        // A fatal worker error rejects everything in flight.
        const err = new Error(e.message || 'Worker crashed (the file may be too large for available memory).')
        for (const [, p] of pending.current) p.reject(err)
        pending.current.clear()
      }
      workerRef.current = worker
    }
    return workerRef.current
  }, [])

  const send = useCallback(
    <T>(build: (id: number) => WorkerRequest, transfer: Transferable[], onProgress?: (p: Progress) => void): Promise<T> => {
      const worker = getWorker()
      const id = nextId.current++
      return new Promise<T>((resolve, reject) => {
        pending.current.set(id, { resolve: resolve as (v: unknown) => void, reject, onProgress })
        worker.postMessage(build(id), transfer)
      })
    },
    [getWorker],
  )

  const compress = useCallback(
    (fileName: string, bytes: Uint8Array, onProgress?: (p: Progress) => void) => {
      // Copy into a fresh buffer we can transfer (zero-copy) to the worker.
      const buffer = bytes.slice().buffer
      return send<CompressionResult>((id) => ({ id, kind: 'compress', fileName, bytes: buffer }), [buffer], onProgress)
    },
    [send],
  )

  const decompress = useCallback(
    (bytes: Uint8Array, onProgress?: (p: Progress) => void) => {
      const buffer = bytes.slice().buffer
      return send<DecompressionResult>((id) => ({ id, kind: 'decompress', bytes: buffer }), [buffer], onProgress)
    },
    [send],
  )

  useEffect(() => {
    // Snapshot the refs so the cleanup closes over stable values, not whatever
    // `*.current` happens to be at teardown time.
    const worker = workerRef
    const inFlight = pending.current
    return () => {
      worker.current?.terminate()
      worker.current = null
      inFlight.clear()
    }
  }, [])

  return { compress, decompress }
}
