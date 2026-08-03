import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import { withBasePath } from '../../utils/navigation'

export type MetricTone = 'default' | 'accent' | 'danger' | 'warning' | 'success'

const toneValueClass: Record<MetricTone, string> = {
  accent: 'text-accent',
  danger: 'text-foose-danger',
  default: 'text-foose-text',
  success: 'text-foose-success',
  warning: 'text-foose-warning',
}

const chartHeightClass = {
  md: 'h-52',
  sm: 'h-36',
  spark: 'h-10',
} as const

export function MetricCard({
  chart,
  chartHeight = 'sm',
  children,
  href,
  icon,
  label,
  note,
  size = 'md',
  tone = 'default',
  value,
}: {
  chart?: ReactNode
  chartHeight?: keyof typeof chartHeightClass
  children?: ReactNode
  href?: string
  icon?: IconName
  label: string
  note?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  tone?: MetricTone
  value: ReactNode
}) {
  const card = (
    <article className="flex h-full flex-col rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5">
      <p className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-foose-faint">
        {icon && <Icon className="shrink-0" name={icon} size={14} />}
        <span className="truncate" title={label}>{label}</span>
      </p>
      <p className={`mt-1.5 font-sans font-bold ${toneValueClass[tone]} ${size === 'lg' ? 'text-3xl md:text-4xl' : size === 'sm' ? 'text-xl' : 'text-2xl'}`}>
        {value}
      </p>
      {note && <p className="mt-1 truncate text-xs font-semibold text-foose-muted">{note}</p>}
      {chart && <div className={`mt-3 min-w-0 ${chartHeightClass[chartHeight]}`}>{chart}</div>}
      {children}
    </article>
  )

  if (!href) return card

  return (
    <a
      aria-label={`Open ${label}`}
      className="group block h-full rounded-xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-accent/20 [&_article]:h-full [&_article]:transition [&_article]:group-hover:border-accent [&_article]:group-hover:shadow-md"
      href={withBasePath(href)}
    >
      {card}
    </a>
  )
}
