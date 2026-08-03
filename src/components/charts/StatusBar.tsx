import { formatCount } from './chartFormat'

export type StatusBarSegment = {
  color: string
  count: number
  key: string
  label: string
}

export function StatusBar({
  onSegmentClick,
  segments,
  selectedKey,
}: {
  onSegmentClick?: (key: string) => void
  segments: StatusBarSegment[]
  selectedKey?: string
}) {
  const total = segments.reduce((sum, segment) => sum + segment.count, 0)
  const visible = segments.filter((segment) => segment.count > 0)

  if (!total || !visible.length) {
    return <div className="flex h-full items-center justify-center rounded-lg bg-foose-surface-low text-sm font-semibold text-foose-muted">No data yet.</div>
  }

  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div className="flex h-4 w-full overflow-hidden rounded-full bg-foose-surface-low" role="img" aria-label={visible.map((segment) => `${segment.label} ${segment.count}`).join(', ')}>
        {visible.map((segment, index) => (
          <button
            className="h-full shrink-0 transition hover:brightness-95 disabled:cursor-default"
            disabled={!onSegmentClick}
            key={segment.key}
            onClick={() => onSegmentClick?.(segment.key)}
            style={{
              background: segment.color,
              marginLeft: index === 0 ? 0 : 2,
              width: `${(segment.count / total) * 100}%`,
            }}
            title={`${segment.label}: ${formatCount(segment.count)}`}
            type="button"
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {visible.map((segment) => {
          const isSelected = selectedKey === segment.key
          const legendClass = `flex items-center gap-2 rounded-md px-1.5 py-1 text-xs font-semibold transition ${onSegmentClick ? 'hover:bg-foose-surface-low' : ''} ${isSelected ? 'bg-accent-light' : ''}`
          const legendContent = (
            <>
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: segment.color }} />
              <span className="text-foose-text">{segment.label}</span>
              <span className="font-mono tabular-nums text-foose-muted">{formatCount(segment.count)}</span>
            </>
          )

          if (!onSegmentClick) {
            return (
              <div className={legendClass} key={segment.key}>
                {legendContent}
              </div>
            )
          }

          return (
            <button className={legendClass} key={segment.key} onClick={() => onSegmentClick(segment.key)} type="button">
              {legendContent}
            </button>
          )
        })}
      </div>
    </div>
  )
}
