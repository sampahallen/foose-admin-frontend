import { useMemo } from 'react'
import { useQueryState } from './useQueryState'

/**
 * Filters/sorts/paginates an already-loaded array in memory, with the same URL-synced
 * filter/page state contract as useServerTable — for endpoints (like the disputes queue)
 * that return their full result set in one unpaginated call. No extra network requests.
 */
export function useClientTable<T, TState extends Record<string, string | number>>({
  defaults,
  filter,
  pageSize = 20,
  resetKeyOnChange,
  rows,
  sort,
}: {
  defaults: TState
  filter?: (row: T, state: TState) => boolean
  pageSize?: number
  resetKeyOnChange?: keyof TState
  rows: T[]
  sort?: (a: T, b: T, state: TState) => number
}) {
  const query = useQueryState({ defaults, resetKeyOnChange })

  const filtered = useMemo(
    () => (filter ? rows.filter((row) => filter(row, query.state)) : rows),
    [filter, rows, query.state],
  )

  const sorted = useMemo(
    () => (sort ? [...filtered].sort((a, b) => sort(a, b, query.state)) : filtered),
    [filtered, sort, query.state],
  )

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const rawPage = Number(query.state.page) || 1
  const page = Math.min(Math.max(1, rawPage), pageCount)
  const pageRows = useMemo(() => sorted.slice((page - 1) * pageSize, page * pageSize), [page, pageSize, sorted])

  return { ...query, page, pageCount, rows: pageRows, total }
}
