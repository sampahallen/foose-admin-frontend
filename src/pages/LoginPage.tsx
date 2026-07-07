import { useEffect, useState, type FormEvent } from 'react'
import { adminHomeForRoles, isStaffRole } from '../constants/roles'
import { useAuth } from '../hooks/useAuth'
import { redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { navigateTo } from '../utils/navigation'

export function LoginPage() {
  const { login, logout, user } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTarget = redirectFromSearch('/admin')

  useEffect(() => {
    if (user && isStaffRole(user.roles, user.role)) {
      navigateTo(redirectTarget === '/admin' ? adminHomeForRoles(user.roles, user.role) : redirectTarget)
    }
  }, [redirectTarget, user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')

    try {
      const auth = await login({
        identifier: String(formData.get('identifier') || ''),
        password: String(formData.get('password') || ''),
      })

      if (!isStaffRole(auth.user.roles, auth.user.role)) {
        await logout()
        setError('This account does not have admin access.')
        return
      }

      navigateTo(redirectTarget === '/admin' ? adminHomeForRoles(auth.user.roles, auth.user.role) : redirectTarget)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to log in'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-auth-page flex min-h-dvh items-center justify-center bg-[#f5f7fb] px-4 py-10 text-foose-text">
      <form
        className="w-full max-w-[440px] rounded-lg border border-[#d9deea] bg-foose-surface p-6 shadow-[0_22px_70px_rgba(26,27,37,0.13)] sm:p-8"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="mb-8 flex items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-accent/15 bg-accent-light shadow-sm">
            <img alt="Foose" className="size-9 rounded-md object-cover" src="/foose-favicon.jpg" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold leading-tight text-foose-text">Foose Admin</h1>
            <p className="mt-1 text-sm leading-6 text-foose-muted">Sign into your foose admin account.</p>
          </div>
        </div>

        <div className="space-y-5">
          <label className="block text-sm font-semibold text-foose-text">
            Email or username
            <input
              autoComplete="username"
              className="mt-2 h-12 w-full rounded-lg border border-foose-border bg-white px-3.5 text-base text-foose-text outline-none transition placeholder:text-foose-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
              name="identifier"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-foose-text">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 h-12 w-full rounded-lg border border-foose-border bg-white px-3.5 text-base text-foose-text outline-none transition placeholder:text-foose-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
              name="password"
              required
              type="password"
            />
          </label>

          {error && (
            <p
              aria-live="polite"
              className="rounded-lg border border-foose-danger-bg bg-foose-danger-bg px-3.5 py-3 text-sm font-medium text-foose-danger"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-accent bg-accent px-5 py-3 text-sm font-bold text-white shadow-md shadow-accent/20 transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </div>
      </form>
    </main>
  )
}
