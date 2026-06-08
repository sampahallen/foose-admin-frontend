import { getCurrentAppPathname, stripBasePath, withBasePath } from './navigation'

export function sanitizeRedirect(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/admin'
  const target = stripBasePath(value)
  if (target.startsWith('/login')) return '/admin'
  return target
}

export function currentRedirectTarget() {
  if (typeof window === 'undefined') return '/admin'
  return sanitizeRedirect(`${getCurrentAppPathname()}${window.location.search}`)
}

export function redirectFromSearch(fallback = '/admin') {
  if (typeof window === 'undefined') return fallback
  const params = new URLSearchParams(window.location.search)
  return sanitizeRedirect(params.get('redirect') || fallback)
}

export function loginHref(redirect = currentRedirectTarget()) {
  return withBasePath(`/login?redirect=${encodeURIComponent(sanitizeRedirect(redirect))}`)
}
