import { buttonClass } from './buttonStyles'

export function Pagination({
  disabled = false,
  label = 'records',
  onPageChange,
  page,
  pageCount,
  pageSize,
  total,
}: {
  disabled?: boolean
  label?: string
  onPageChange: (page: number) => void
  page: number
  pageCount: number
  pageSize?: number
  total?: number
}) {
  if (pageCount <= 1 && !total) return null

  const hasRange = Boolean(total && pageSize)
  const start = hasRange ? (page - 1) * (pageSize as number) + 1 : 0
  const end = hasRange ? Math.min(page * (pageSize as number), total as number) : 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foose-border bg-foose-surface p-4">
      <p aria-live="polite" className="text-sm font-semibold text-foose-muted">
        {hasRange
          ? total
            ? `Showing ${start}–${end} of ${total} ${label}`
            : `No ${label} found`
          : `Page ${pageCount ? page : 0} of ${pageCount}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          className={buttonClass({ size: 'sm', variant: 'secondary' })}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          type="button"
        >
          Previous
        </button>
        <button
          className={buttonClass({ size: 'sm', variant: 'secondary' })}
          disabled={disabled || !pageCount || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  )
}
