/** Small shared presentational primitives — soft pastel light theme. */
import { Info } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { accent, type AccentColor } from './theme'

type IconType = ComponentType<{ className?: string; size?: number | string }>

export function Panel({
  title,
  subtitle,
  accent: color = 'sky',
  icon: Icon,
  children,
  active = false,
}: {
  title: string
  subtitle?: string
  accent?: AccentColor
  icon?: IconType
  children: ReactNode
  active?: boolean
}) {
  const a = accent[color]
  return (
    <section
      className={`rounded-2xl border bg-surface shadow-sm transition-all ${
        active ? `${a.ring} ring-1` : 'border-edge'
      }`}
    >
      <header className="flex items-center justify-between gap-3 border-b border-edge px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${a.chip}`}>
            {Icon ? <Icon size={15} /> : <span className={`h-2 w-2 rounded-full ${a.dot}`} />}
          </span>
          <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Prominent plain-English explanation callout. */
export function Explain({ accent: color = 'sky', children }: { accent?: AccentColor; children: ReactNode }) {
  const a = accent[color]
  return (
    <div className={`mb-4 flex gap-3 rounded-xl border ${a.ring} ${a.soft} px-4 py-3`}>
      <Info size={18} className={`mt-0.5 shrink-0 ${a.softText}`} />
      <div className={`text-sm leading-relaxed ${a.softText}`}>{children}</div>
    </div>
  )
}

/** Determinate progress bar with a label, shown while the worker runs. */
export function ProgressBar({ fraction, label }: { fraction: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100)
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surfaceMuted">
        <div
          className="h-full rounded-full bg-violet-500 transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surfaceMuted px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  )
}

export function Button({
  children,
  onClick,
  disabled,
  variant = 'primary',
  icon: Icon,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'ghost' | 'success'
  icon?: IconType
  className?: string
}) {
  const styles: Record<string, string> = {
    primary: 'bg-violet-500 hover:bg-violet-600 text-white shadow-sm',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm',
    ghost: 'bg-white border border-edge hover:border-violet-300 text-ink',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  )
}
