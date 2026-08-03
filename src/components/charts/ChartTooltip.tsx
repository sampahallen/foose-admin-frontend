import type { ReactNode } from 'react'
import { chartTooltipLabel } from './chartFormat'

type TooltipPayloadEntry = {
  color?: string
  dataKey?: string | number
  name?: ReactNode
  value?: number | string
}

export function ChartTooltip({
  active,
  formatValue,
  label,
  payload,
}: {
  active?: boolean
  formatValue?: (value: number | string, name: ReactNode) => string
  label?: ReactNode
  payload?: TooltipPayloadEntry[]
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-foose-border bg-foose-surface px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1.5 font-bold text-foose-text">{chartTooltipLabel(label)}</p>}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div className="flex items-center gap-2" key={`${entry.dataKey}`}>
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: entry.color }} />
            <span className="text-foose-muted">{entry.name}</span>
            <strong className="ml-auto font-mono tabular-nums text-foose-text">
              {entry.value !== undefined ? (formatValue ? formatValue(entry.value, entry.name) : String(entry.value)) : ''}
            </strong>
          </div>
        ))}
      </div>
    </div>
  )
}
