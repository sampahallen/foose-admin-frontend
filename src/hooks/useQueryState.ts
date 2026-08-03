import { useCallback, useEffect, useState } from 'react'

type Codec<T> = {
  parse?: Partial<{ [K in keyof T]: (raw: string) => T[K] }>
  serialize?: Partial<{ [K in keyof T]: (value: T[K]) => string | undefined }>
}

function defaultParse(defaultValue: unknown, raw: string): unknown {
  if (typeof defaultValue === 'number') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : defaultValue
  }
  return raw
}

function defaultSerialize(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return String(value)
}

function readFromSearch<T extends Record<string, string | number>>(defaults: T, codec: Codec<T>): T {
  const params = new URLSearchParams(window.location.search)
  const next = { ...defaults }
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const raw = params.get(String(key))
    if (raw === null || raw === '') continue
    const parser = codec.parse?.[key]
    next[key] = (parser ? parser(raw) : (defaultParse(defaults[key], raw) as T[typeof key]))
  }
  return next
}

function writeToSearch<T extends Record<string, string | number>>(defaults: T, state: T, codec: Codec<T>) {
  const params = new URLSearchParams(window.location.search)
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const value = state[key]
    const isDefault = value === defaults[key]
    const serializer = codec.serialize?.[key]
    const serialized = isDefault ? undefined : serializer ? serializer(value) : defaultSerialize(value)
    if (serialized === undefined) params.delete(String(key))
    else params.set(String(key), serialized)
  }
  const query = params.toString()
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState(window.history.state, '', url)
}

/**
 * URL-mirrored local state for filters/pagination. Uses `history.replaceState` directly
 * (never `navigateTo`'s pushState+synthetic-popstate) so typing in a search box never
 * scroll-jumps the page or pollutes back-button history — the URL is a read/write mirror
 * of local state, not a navigation event.
 *
 * Pass a stable (module-level or `useMemo`'d) `defaults` object for best behavior; a fresh
 * literal each render still works correctly, it just re-subscribes the popstate listener
 * and recomputes callbacks slightly more often.
 */
export function useQueryState<T extends Record<string, string | number>>({
  defaults,
  parse,
  resetKeyOnChange,
  serialize,
}: {
  defaults: T
  resetKeyOnChange?: keyof T
} & Codec<T>) {
  const [state, setState] = useState<T>(() => readFromSearch(defaults, { parse, serialize }))

  useEffect(() => {
    function handlePopState() {
      setState(readFromSearch(defaults, { parse, serialize }))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [defaults, parse, serialize])

  const set = useCallback(
    (patch: Partial<T>) => {
      setState((current) => {
        const next = { ...current, ...patch }
        if (resetKeyOnChange) {
          const otherKeyChanged = Object.keys(patch).some((key) => key !== resetKeyOnChange)
          if (otherKeyChanged && !(resetKeyOnChange in patch)) next[resetKeyOnChange] = defaults[resetKeyOnChange]
        }
        writeToSearch(defaults, next, { parse, serialize })
        return next
      })
    },
    [defaults, parse, resetKeyOnChange, serialize],
  )

  const reset = useCallback(() => {
    setState(defaults)
    writeToSearch(defaults, defaults, { parse, serialize })
  }, [defaults, parse, serialize])

  const isDefault = (Object.keys(defaults) as Array<keyof T>).every((key) => state[key] === defaults[key])

  return { isDefault, reset, set, state }
}
