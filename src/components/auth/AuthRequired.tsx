import { useEffect, useState, type ReactNode } from 'react'
import { isStaffRole, isSuperAdminRole } from '../../constants/roles'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { currentRedirectTarget, loginHref } from '../../utils/authRedirect'
import { navigateTo } from '../../utils/navigation'
import { EmptyState, LoadingState } from '../feedback'
import { LogoutConfirmDialog } from './LogoutConfirmDialog'

export function AuthRequired({
  children,
  superAdminOnly = false,
}: {
  children: ReactNode
  superAdminOnly?: boolean
}) {
  const { logout, status, user } = useAuth()
  const brand = getAppName()
  const redirectTarget = currentRedirectTarget()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  useEffect(() => {
    if (status === 'guest' && !user) {
      navigateTo(loginHref(redirectTarget))
    }
  }, [redirectTarget, status, user])

  if (status === 'checking') return <LoadingState label="Checking admin session..." />
  if (!user) return <LoadingState label="Redirecting to admin login..." />

  if (!isStaffRole(user.roles, user.role) || (superAdminOnly && !isSuperAdminRole(user.roles, user.role))) {
    return (
      <main className="admin-auth-page min-h-dvh bg-foose-bg flex items-center justify-center p-4">
        <EmptyState
          action={
            <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" onClick={() => setLogoutConfirmOpen(true)} type="button">
              Log out and switch account
            </button>
          }
          body={`This console is limited to ${superAdminOnly ? 'super administrators' : `${brand} administrators`}.`}
          icon="alert"
          title="Admin access required"
        />
        <LogoutConfirmDialog
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => {
            setLogoutConfirmOpen(false)
            void logout()
          }}
          open={logoutConfirmOpen}
        />
      </main>
    )
  }

  return children
}
