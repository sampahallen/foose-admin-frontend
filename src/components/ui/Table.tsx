import type { ReactNode } from 'react'

export function TableShell({
  caption,
  children,
  className = '',
  minWidth,
}: {
  caption?: string
  children: ReactNode
  className?: string
  minWidth?: number
}) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-foose-border bg-foose-surface shadow-sm ${className}`}>
      <table
        className="w-full border-collapse text-left text-sm [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:border-b [&_th]:border-foose-border [&_th]:bg-foose-surface-mid [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted"
        style={minWidth ? { minWidth } : undefined}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  )
}
