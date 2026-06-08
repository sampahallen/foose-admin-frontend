import { useEffect, useState, type FormEvent } from 'react'
import { ErrorState } from '../components'
import { getAppName } from '../config/env'
import { useAuth } from '../hooks/useAuth'
import { redirectFromSearch } from '../utils/authRedirect'
import { getErrorMessage } from '../utils/errorMessage'
import { navigateTo } from '../utils/navigation'

export function LoginPage() {
  const brand = getAppName()
  const { login, user } = useAuth()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTarget = redirectFromSearch('/admin')

  useEffect(() => {
    if (user?.role === 'admin') navigateTo(redirectTarget)
  }, [redirectTarget, user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')

    try {
      await login({
        identifier: String(formData.get('identifier') || ''),
        password: String(formData.get('password') || ''),
      })
      navigateTo(redirectTarget)
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Unable to log in'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-auth-page min-h-dvh bg-foose-bg flex items-center justify-center p-4">
      <form className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3 auth-card mx-auto w-full max-w-3xl p-5 md:p-8 admin-login-card max-w-md" onSubmit={(event) => void handleSubmit(event)}>
        <h1>{brand} Admin</h1>
        <p>Sign in with your normal Foose account. Access is granted only when that account has the admin role.</p>
        <label>
          Email or username
          <input autoComplete="username" name="identifier" required />
        </label>
        <label>
          Password
          <input autoComplete="current-password" name="password" required type="password" />
        </label>
        {error && <ErrorState message={error} />}
        <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover full" disabled={submitting} type="submit">
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </main>
  )
}
