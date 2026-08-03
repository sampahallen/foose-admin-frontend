import type { ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { withBasePath } from '../../utils/navigation'

export function PageHeader({
  actions,
  backLabel = 'Back',
  backTo,
  description,
  eyebrow,
  meta,
  title,
}: {
  actions?: ReactNode
  backLabel?: string
  backTo?: string
  description?: ReactNode
  eyebrow?: ReactNode
  meta?: ReactNode
  title: string
}) {
  return (
    <header className="mb-6">
      {backTo && (
        <a className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-foose-muted transition hover:text-accent" href={withBasePath(backTo)}>
          <Icon name="arrow" size={16} className="rotate-180" />
          {backLabel}
        </a>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
          <h1 className="font-display text-2xl font-bold tracking-tight text-foose-text md:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-foose-muted md:text-base">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {meta && <div className="mt-4">{meta}</div>}
    </header>
  )
}
