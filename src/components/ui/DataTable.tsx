import type { ReactNode } from 'react'
import { Icon } from '../icons/Icon'
import { EmptyState } from '../feedback/EmptyState'
import { ErrorState } from '../feedback/ErrorState'
import { TableShell } from './Table'

export type DataTableColumn<T> = {
  align?: 'left' | 'right'
  cell: (row: T, index: number) => ReactNode
  header: ReactNode
  hideBelow?: 'sm' | 'md' | 'lg'
  key: string
  sortable?: boolean
  width?: string
}

const hideBelowClass: Record<NonNullable<DataTableColumn<unknown>['hideBelow']>, string> = {
  lg: 'hidden lg:table-cell',
  md: 'hidden md:table-cell',
  sm: 'hidden sm:table-cell',
}

export function DataTable<T>({
  caption,
  columns,
  empty,
  error,
  footer,
  loading = false,
  minWidth,
  onRetry,
  onRowClick,
  onSortChange,
  rowKey,
  rows,
  selectedKey,
  sort,
}: {
  caption?: string
  columns: DataTableColumn<T>[]
  empty?: { action?: ReactNode; body?: string; title: string }
  error?: string
  footer?: ReactNode
  loading?: boolean
  minWidth?: number
  onRetry?: () => void
  onRowClick?: (row: T) => void
  onSortChange?: (key: string) => void
  rowKey: (row: T, index: number) => string
  rows: T[]
  selectedKey?: string
  sort?: { dir: 'asc' | 'desc'; key: string }
}) {
  if (error && !rows.length) return <ErrorState message={error} retry={onRetry} />
  if (!loading && !rows.length) {
    return empty ? <EmptyState action={empty.action} body={empty.body || 'No records found.'} title={empty.title} /> : null
  }

  return (
    <div className="space-y-4">
      <TableShell caption={caption} minWidth={minWidth}>
        <thead>
          <tr>
            {columns.map((column) => {
              const isSorted = sort?.key === column.key
              return (
                <th className={`${column.align === 'right' ? 'text-right' : ''} ${column.hideBelow ? hideBelowClass[column.hideBelow] : ''}`} key={column.key} style={column.width ? { width: column.width } : undefined}>
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 uppercase tracking-widest text-foose-muted transition hover:text-accent"
                      onClick={() => onSortChange?.(column.key)}
                      type="button"
                    >
                      {column.header}
                      <Icon name="sort" size={13} className={isSorted ? 'text-accent' : 'opacity-50'} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'} aria-busy={loading}>
          {rows.map((row, index) => {
            const key = rowKey(row, index)
            const clickable = Boolean(onRowClick)
            return (
              <tr
                className={`${clickable ? 'cursor-pointer [&:hover_td]:bg-accent-light' : ''} ${selectedKey === key ? '[&_td]:bg-accent-light' : ''}`}
                key={key}
                onClick={clickable ? () => onRowClick?.(row) : undefined}
                onKeyDown={clickable ? (event) => { if (event.key === 'Enter') onRowClick?.(row) } : undefined}
                role={clickable ? 'link' : undefined}
                tabIndex={clickable ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td className={`${column.align === 'right' ? 'text-right' : ''} ${column.hideBelow ? hideBelowClass[column.hideBelow] : ''}`} key={column.key}>
                    {column.cell(row, index)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </TableShell>
      {footer}
    </div>
  )
}
