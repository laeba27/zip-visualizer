/**
 * Stage tabs + playback controls. Each stage is a clickable tab; the active tab
 * drives which visualization + explanation is shown. Play steps through them.
 */
import { Check, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { StageDef } from './stages'
import { accent } from './theme'
import { Button } from './ui'

export function TimelineController({
  stages,
  current,
  onSelect,
  onPrev,
  onNext,
  onPlay,
  playing,
}: {
  stages: StageDef[]
  current: number
  onSelect: (i: number) => void
  onPrev: () => void
  onNext: () => void
  onPlay: () => void
  playing: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Tab strip */}
      <div className="flex flex-wrap gap-2">
        {stages.map((stage, i) => {
          const done = i < current
          const active = i === current
          const a = accent[stage.accent]
          const Icon = stage.icon
          return (
            <button
              key={stage.key}
              onClick={() => onSelect(i)}
              className={`group flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                active
                  ? `${a.ring} ${a.soft} ${a.softText} ring-1 shadow-sm`
                  : done
                    ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
                    : 'border-edge bg-white text-muted hover:border-violet-200 hover:text-ink'
              }`}
            >
              <span
                className={`grid h-5 w-5 place-items-center rounded-md text-[10px] ${
                  active ? a.chip : done ? 'bg-emerald-100 text-emerald-700' : 'bg-surfaceMuted text-muted'
                }`}
              >
                {done ? <Check size={12} /> : <Icon size={12} />}
              </span>
              <span className="hidden sm:inline">{stage.title}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
          )
        })}
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" icon={ChevronLeft} onClick={onPrev} disabled={current === 0}>
          Prev
        </Button>
        <Button variant="ghost" icon={ChevronRight} onClick={onNext} disabled={current === stages.length - 1}>
          Next
        </Button>
        <Button icon={playing ? Pause : Play} onClick={onPlay}>
          {playing ? 'Pause' : 'Play through'}
        </Button>
        <span className="ml-auto text-xs text-muted">
          Step {current + 1} of {stages.length}
        </span>
      </div>
    </div>
  )
}
