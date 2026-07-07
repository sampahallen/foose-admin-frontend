import { useEffect, useState, type ReactNode } from 'react'
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from 'react-icons/tb'
import { canResolveDisputes, canReviewKyc, isSuperAdminRole, type UserRoles } from '../../constants/roles'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { initials } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
import { LogoutConfirmDialog } from '../auth/LogoutConfirmDialog'
import { Icon, type IconName } from '../icons/Icon'

type AdminSection = 'overview' | 'kyc' | 'disputes' | 'analytics' | 'users'

const NAV: Array<{
  allowed: (roles?: UserRoles, legacyRole?: number | string) => boolean
  key: AdminSection
  label: string
  href: string
  icon: IconName
}> = [
  { allowed: isSuperAdminRole, href: '/admin', icon: 'grid', key: 'overview', label: 'Dashboard' },
  { allowed: canReviewKyc, href: '/admin/kyc', icon: 'shield', key: 'kyc', label: 'KYC Reviews' },
  { allowed: canResolveDisputes, href: '/admin/disputes', icon: 'alert', key: 'disputes', label: 'Disputes' },
  { allowed: isSuperAdminRole, href: '/admin/analytics', icon: 'chart', key: 'analytics', label: 'Analytics' },
]

function searchPlaceholder(section: AdminSection) {
  if (section === 'disputes') return 'Search disputes...'
  if (section === 'kyc') return 'Search KYC records...'
  if (section === 'analytics') return 'Search analytics...'
  return 'Search marketplace...'
}

export function AdminShell({ section, children }: { section: AdminSection; children: ReactNode }) {
  const { logout, user } = useAuth()
  const brand = getAppName()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const allowedNav = NAV.filter((item) => item.allowed(user?.roles, user?.role))

  useEffect(() => {
    if (!menuOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
  }

  function requestLogout() {
    closeMenu()
    setLogoutConfirmOpen(true)
  }

  function cancelLogout() {
    setLogoutConfirmOpen(false)
  }

  function confirmLogout() {
    setLogoutConfirmOpen(false)
    void logout()
  }

  const sidebarWidth = sidebarCollapsed ? 'lg:grid-cols-[80px_minmax(0,1fr)]' : 'lg:grid-cols-[256px_minmax(0,1fr)]'
  const sidebarLabelClass = sidebarCollapsed ? 'lg:sr-only' : ''

  return (
    <div className={`admin-shell min-h-dvh bg-foose-bg lg:grid ${sidebarWidth}`}>
      <aside
        className={`admin-sidebar sticky top-0 z-40 flex min-h-16 items-center border-b border-foose-border bg-foose-surface p-4 transition-all lg:h-dvh lg:flex-col lg:border-b-0 lg:border-r ${
          sidebarCollapsed ? 'justify-between lg:items-center lg:px-3' : 'justify-between lg:items-stretch'
        }`}
      >
        <div className={`flex items-start justify-between gap-3 ${sidebarCollapsed ? 'lg:w-full lg:justify-center' : ''}`}>
          <div className={sidebarCollapsed ? 'lg:hidden' : ''}>
            <h1 className="text-xl font-bold text-accent">{brand} Admin</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-foose-muted">Management Suite</p>
          </div>
          <button
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden size-11 shrink-0 items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-foose-muted transition hover:border-accent hover:text-accent lg:inline-flex ${
              sidebarCollapsed ? '' : 'ml-auto'
            }`}
            onClick={() => setSidebarCollapsed((current) => !current)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            {sidebarCollapsed ? <TbLayoutSidebarRightCollapse size={22} /> : <TbLayoutSidebarLeftCollapse size={22} />}
          </button>
        </div>

        <button
          aria-expanded={menuOpen}
          aria-label="Open admin menu"
          className="ml-auto inline-flex size-11 items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-foose-text transition hover:border-accent hover:text-accent lg:hidden"
          onClick={() => setMenuOpen(true)}
          type="button"
        >
          <Icon name="menu" />
        </button>

        <nav className={`hidden flex-col gap-2 lg:flex ${sidebarCollapsed ? 'lg:items-center' : ''}`}>
          {allowedNav.map((item) => (
            <a
              className={`flex items-center gap-3 rounded-lg text-sm font-semibold transition ${
                sidebarCollapsed ? 'size-11 justify-center p-0' : 'px-4 py-3'
              } ${section === item.key ? 'bg-accent text-white' : 'text-foose-muted hover:bg-accent-light hover:text-accent'}`}
              href={withBasePath(item.href)}
              key={item.key}
              title={item.label}
            >
              <Icon name={item.icon} />
              <span className={sidebarLabelClass}>{item.label}</span>
            </a>
          ))}
        </nav>

        <button
          className={`button-primary hidden items-center gap-2 rounded-lg border border-accent bg-accent text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover lg:inline-flex ${
            sidebarCollapsed ? 'size-11 justify-center p-0' : 'min-h-11 justify-center px-5 py-2.5'
          }`}
          title="Generate Report"
          type="button"
        >
          <Icon name="chart" />
          <span className={sidebarLabelClass}>Generate Report</span>
        </button>

        <footer className={`hidden border-t border-foose-border pt-4 lg:block ${sidebarCollapsed ? 'w-full' : ''}`}>
          <a
            className={`flex items-center gap-3 rounded-lg text-sm font-semibold text-foose-muted transition hover:bg-accent-light hover:text-accent ${
              sidebarCollapsed ? 'mx-auto size-11 justify-center p-0' : 'px-4 py-3'
            }`}
            href={withBasePath('/admin')}
            title="Security"
          >
            <Icon name="shield" />
            <span className={sidebarLabelClass}>Security</span>
          </a>
          <button
            className={`admin-footer-action mt-2 flex w-full items-center gap-3 rounded-lg text-sm font-semibold text-foose-muted transition hover:bg-accent-light hover:text-accent ${
              sidebarCollapsed ? 'mx-auto size-11 justify-center p-0' : 'px-4 py-3'
            }`}
            onClick={requestLogout}
            title="Log Out"
            type="button"
          >
            <Icon name="arrow" />
            <span className={sidebarLabelClass}>Log Out</span>
          </button>
        </footer>
      </aside>

      {menuOpen && (
        <div aria-modal="true" className="fixed inset-0 z-50 lg:hidden" role="dialog">
          <button aria-label="Close admin menu" className="absolute inset-0 bg-foose-text/45" onClick={closeMenu} type="button" />
          <aside className="relative ml-auto flex h-full w-[min(22rem,calc(100%-2rem))] flex-col border-l border-foose-border bg-foose-surface p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-foose-border pb-4">
              <div>
                <h2 className="text-xl font-bold text-accent">{brand} Admin</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-foose-muted">Management Suite</p>
              </div>
              <button
                aria-label="Close admin menu"
                className="inline-flex size-10 items-center justify-center rounded-lg border border-foose-border bg-foose-surface text-foose-text transition hover:border-accent hover:text-accent"
                onClick={closeMenu}
                type="button"
              >
                <Icon name="x" />
              </button>
            </div>

            <nav className="mt-4 grid gap-2">
              {allowedNav.map((item) => (
                <a
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    section === item.key ? 'bg-accent text-white' : 'text-foose-muted hover:bg-accent-light hover:text-accent'
                  }`}
                  href={withBasePath(item.href)}
                  key={item.key}
                  onClick={closeMenu}
                >
                  <Icon name={item.icon} /> {item.label}
                </a>
              ))}
            </nav>

            <button
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover"
              type="button"
            >
              <Icon name="chart" /> Generate Report
            </button>

            <div className="mt-auto border-t border-foose-border pt-4">
              <a
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold text-foose-muted transition hover:bg-accent-light hover:text-accent"
                href={withBasePath('/admin')}
                onClick={closeMenu}
              >
                <Icon name="shield" /> Security
              </a>
              <button
                className="mt-2 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold text-foose-muted transition hover:bg-accent-light hover:text-accent"
                onClick={requestLogout}
                type="button"
              >
                <Icon name="arrow" /> Log Out
              </button>
            </div>
          </aside>
        </div>
      )}

      <LogoutConfirmDialog onCancel={cancelLogout} onConfirm={confirmLogout} open={logoutConfirmOpen} />

      <main className="admin-main min-w-0">
        <header className="admin-top sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-foose-border bg-foose-surface/95 p-4 backdrop-blur">
          <label className="flex h-11 w-full max-w-md items-center gap-3 rounded-lg bg-foose-surface-mid px-4">
            <Icon name="search" />
            <input className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none" placeholder={searchPlaceholder(section)} />
          </label>
          <div className="flex items-center gap-3 text-foose-muted">
            <Icon name="bell" />
            <Icon name="info" />
            {user?.profilePhoto ? (
              <img alt="" className="size-10 rounded-full object-cover" src={user.profilePhoto} />
            ) : (
              <span className="admin-avatar-fallback inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(user?.name)}</span>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
