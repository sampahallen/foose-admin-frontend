import { CHART_SEQUENTIAL } from '../../constants/charts'
import { formatCount } from './chartFormat'

export function Meter({
  label,
  note,
  total,
  tone = '#2642fb',
  value,
}: {
  label: string
  note?: string
  total: number
  tone?: string
  value: number
}) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0
  const percent = Math.round(ratio * 100)

  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-bold text-foose-text">{percent}%</span>
        <span className="text-xs font-semibold text-foose-muted">
          {formatCount(value)} of {formatCount(total)} {label}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full" style={{ background: CHART_SEQUENTIAL[0] }}>
        <div className="h-full rounded-full transition-all" style={{ background: tone, width: `${percent}%` }} />
      </div>
      {note && <p className="text-xs text-foose-muted">{note}</p>}
    </div>
  )
}
