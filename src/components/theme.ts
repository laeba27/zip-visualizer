/** Shared theme tokens — the per-stage accent palette used across components. */

export type AccentColor = 'sky' | 'violet' | 'amber' | 'emerald' | 'rose' | 'cyan'

/** Per-accent pastel palette: soft tints for surfaces, stronger for text/dots. */
export const accent: Record<AccentColor, { dot: string; soft: string; softText: string; ring: string; chip: string }> =
  {
    sky: {
      dot: 'bg-sky-400',
      soft: 'bg-sky-50',
      softText: 'text-sky-700',
      ring: 'ring-sky-200 border-sky-200',
      chip: 'bg-sky-100 text-sky-700',
    },
    violet: {
      dot: 'bg-violet-400',
      soft: 'bg-violet-50',
      softText: 'text-violet-700',
      ring: 'ring-violet-200 border-violet-200',
      chip: 'bg-violet-100 text-violet-700',
    },
    amber: {
      dot: 'bg-amber-400',
      soft: 'bg-amber-50',
      softText: 'text-amber-700',
      ring: 'ring-amber-200 border-amber-200',
      chip: 'bg-amber-100 text-amber-700',
    },
    emerald: {
      dot: 'bg-emerald-400',
      soft: 'bg-emerald-50',
      softText: 'text-emerald-700',
      ring: 'ring-emerald-200 border-emerald-200',
      chip: 'bg-emerald-100 text-emerald-700',
    },
    rose: {
      dot: 'bg-rose-400',
      soft: 'bg-rose-50',
      softText: 'text-rose-700',
      ring: 'ring-rose-200 border-rose-200',
      chip: 'bg-rose-100 text-rose-700',
    },
    cyan: {
      dot: 'bg-cyan-400',
      soft: 'bg-cyan-50',
      softText: 'text-cyan-700',
      ring: 'ring-cyan-200 border-cyan-200',
      chip: 'bg-cyan-100 text-cyan-700',
    },
  }
