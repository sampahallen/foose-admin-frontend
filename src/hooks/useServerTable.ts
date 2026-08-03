import { useEffect, useState } from 'react'
import { useApiResource } from './useApiResource'
import { useQueryState } from './useQueryState'

type Codec<T> = {
  parse?: Partial<{ [K in keyof T]: (raw: string) => T[K] }>
  serialize?: Partial<{ [K in keyof T]: (value: T[K]) => string | undefined }>
}

/**
 * Composes useQueryState + useApiResource for server-paginated tables: builds the request
 * path from URL-synced filter/page state, debounces the actual fetch so rapid filter changes
 * (typing a search box) don't fire a request per keystroke, and holds the previous page of
 * rows visible (via `loading`) while the next page is in flight instead of blanking to a
 * skeleton.
 */
export function useServerTable<TResponse, TState extends Record<string, string | number>>({
  basePath,
  buildPath,
  debounceMs = 250,
  defaults,
  parse,
  resetKeyOnChange,
  serialize,
}: {
  basePath: string
  buildPath: (basePath: string, state: TState) => string
  debounceMs?: number
  defaults: TState
  resetKeyOnChange?: keyof TState
} & Codec<TState>) {
  const query = useQueryState({ defaults, parse, resetKeyOnChange, serialize })
  const rawPath = buildPath(basePath, query.state)
  const [debouncedPath, setDebouncedPath] = useState(rawPath)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedPath(rawPath), debounceMs)
    return () => window.clearTimeout(timer)
  }, [debounceMs, rawPath])

  const resource = useApiResource<TResponse>(debouncedPath)
  const [previousData, setPreviousData] = useState<TResponse | null>(null)

  if (resource.data && resource.data !== previousData) {
    setPreviousData(resource.data)
  }

  const pending = debouncedPath !== rawPath
  const data = resource.data ?? (pending ? previousData : null)

  return {
    ...query,
    data,
    error: resource.error,
    loading: resource.loading || pending,
    refetch: resource.refetch,
  }
}
