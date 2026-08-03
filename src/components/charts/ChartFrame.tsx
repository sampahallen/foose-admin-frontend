import type { ReactElement, ReactNode } from 'react'
import { ResponsiveContainer } from 'recharts'
import { withBasePath } from '../../utils/navigation'
import { ChartEmpty } from './ChartEmpty'

const heightClass = {
  lg: 'h-72',
  md: 'h-52',
  sm: 'h-36',
} as const

export function ChartFrame({
  actions,
  children,
  className = '',
  emptyMessage = 'No chart data yet.',
  hasData = true,
  height = 'md',
  href,
  note,
  responsive = true,
  subtitle,
  title,
}: {
  actions?: ReactNode
  children: ReactElement
  className?: string
  emptyMessage?: string
  hasData?: boolean
  height?: keyof typeof heightClass
  href?: string
  note?: ReactNode
  /** Wrap `children` in recharts' `ResponsiveContainer` — turn off for non-recharts content that sizes itself (e.g. `StatusBar`, `Meter`). */
  responsive?: boolean
  subtitle?: ReactNode
  title: string
}) {
  const frame = (
    <article className={`rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wide text-foose-muted">{title}</h2>
          {subtitle && <p className="mt-1 text-2xl font-bold text-foose-text">{subtitle}</p>}
        </div>
        {note && <span className="shrink-0 rounded-lg bg-foose-surface-low px-3 py-1 text-xs font-bold text-foose-muted">{note}</span>}
        {actions}
      </div>
      <div className={`min-w-0 ${heightClass[height]}`}>
        {!hasData ? (
          <ChartEmpty message={emptyMessage} />
        ) : responsive ? (
          <ResponsiveContainer height="100%" width="100%">
            {children}
          </ResponsiveContainer>
        ) : (
          children
        )}
      </div>
    </article>
  )

  if (!href) return frame

  return (
    <a
      aria-label={`Open ${title}`}
      className="group block rounded-xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-accent/20 [&_article]:transition [&_article]:group-hover:border-accent [&_article]:group-hover:shadow-md"
      href={withBasePath(href)}
    >
      {frame}
    </a>
  )
}
