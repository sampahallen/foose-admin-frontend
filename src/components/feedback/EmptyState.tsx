import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'

export function EmptyState({
  action,
  body,
  icon = 'info',
  title,
}: {
  action?: ReactNode
  body: string
  icon?: IconName
  title: string
}) {
  return (
    <div className="mx-auto my-10 flex max-w-xl flex-col items-center gap-4 rounded-xl border border-foose-border bg-foose-surface p-8 text-center text-accent">
      <Icon name={icon} size={32} />
      <h2 className="text-lg font-bold text-foose-text">{title}</h2>
      <p className="text-sm leading-6 text-foose-muted">{body}</p>
      {action}
    </div>
  )
}
