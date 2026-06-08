import { useEffect, type ReactNode } from 'react'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { currentRedirectTarget, loginHref } from '../../utils/authRedirect'
import { navigateTo } from '../../utils/navigation'
import { EmptyState, LoadingState } from '../feedback'

export function AuthRequired({ children }: { children: ReactNode }) {
  const { logout, status, user } = useAuth()
  const brand = getAppName()
  const redirectTarget = currentRedirectTarget()

  useEffect(() => {
    if (status === 'guest' && !user) {
      navigateTo(loginHref(redirectTarget))
    }
  }, [redirectTarget, status, user])

  if (status === 'checking') return <LoadingState label="Checking admin session..." />
  if (!user) return <LoadingState label="Redirecting to admin login..." />

  if (user.role !== 'admin') {
    return (
      <main className="admin-auth-page min-h-dvh bg-foose-bg flex items-center justify-center p-4">
        <EmptyState
          action={
            <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => void logout()} type="button">
              Log out and switch account
            </button>
          }
          body={`This console is limited to ${brand} administrators.`}
          icon="alert"
          title="Admin access required"
        />
      </main>
    )
  }

  return children
}
