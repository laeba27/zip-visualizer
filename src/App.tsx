import { FileArchive, PackageOpen } from 'lucide-react'
import { useState } from 'react'
import { CompressView } from './views/CompressView'
import { DecompressView } from './views/DecompressView'

type Mode = 'compress' | 'decompress'

export function App() {
  const [mode, setMode] = useState<Mode>('compress')

  return (
    <div className="mx-auto min-h-full max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-ink">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600">
                <FileArchive size={20} />
              </span>
              ZipLab
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Watch ZIP-style compression work, one step at a time. Everything runs in your browser using LZ77 +
              Huffman coding built from scratch — no libraries, no server, no uploads.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-edge bg-white p-1 shadow-sm">
            <TabButton active={mode === 'compress'} icon={FileArchive} onClick={() => setMode('compress')}>
              Compress
            </TabButton>
            <TabButton active={mode === 'decompress'} icon={PackageOpen} onClick={() => setMode('decompress')}>
              Decompress
            </TabButton>
          </div>
        </div>
      </header>

      <main className="animate-fade-in">{mode === 'compress' ? <CompressView /> : <DecompressView />}</main>

      <footer className="mt-10 border-t border-edge pt-4 text-xs text-muted">
        ZipLab is an educational visualizer. Its <code className="rounded bg-surfaceMuted px-1 text-ink">.myzip</code>{' '}
        format prioritizes transparency over compression ratio — small or random files may not shrink, which is part of
        the lesson.
      </footer>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof FileArchive
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-violet-500 text-white shadow-sm' : 'text-muted hover:text-ink'
      }`}
    >
      <Icon size={15} />
      {children}
    </button>
  )
}
