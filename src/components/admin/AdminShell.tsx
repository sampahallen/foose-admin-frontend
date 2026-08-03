import { useEffect, useState, type ReactNode } from 'react'
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarRightCollapse } from 'react-icons/tb'
import { canResolveDisputes, canReviewKyc, isSuperAdminRole, roleLabels, type UserRoles } from '../../constants/roles'
import { getAppName } from '../../config/env'
import { useAuth } from '../../hooks/useAuth'
import { initials } from '../../utils/format'
import { withBasePath } from '../../utils/navigation'
import { LogoutConfirmDialog } from '../auth/LogoutConfirmDialog'
import { Icon, type IconName } from '../icons/Icon'

type AdminSection = 'overview' | 'kyc' | 'disputes' | 'analytics' | 'users'

type NavItem = {
  allowed: (roles?: UserRoles, legacyRole?: number | string) => boolean
  href: string
  icon: IconName
  key: AdminSection
  label: string
}

const NAV_GROUPS: Array<{ items: NavItem[]; label: string }> = [
  {
    items: [
      { allowed: isSuperAdminRole, href: '/admin', icon: 'grid', key: 'overview', label: 'Dashboard' },
      { allowed: canReviewKyc, href: '/admin/kyc', icon: 'shield', key: 'kyc', label: 'KYC Reviews' },
      { allowed: canResolveDisputes, href: '/admin/disputes', icon: 'alert', key: 'disputes', label: 'Disputes' },
    ],
    label: 'Operations',
  },
  {
    items: [
      { allowed: isSuperAdminRole, href: '/admin/users', icon: 'users', key: 'users', label: 'Staff & roles' },
      { allowed: isSuperAdminRole, href: '/admin/analytics', icon: 'chart', key: 'analytics', label: 'Analytics' },
    ],
    label: 'Administration',
  },
]

const SECTION_LABELS: Record<AdminSection, string> = {
  analytics: 'Analytics',
  disputes: 'Disputes',
  kyc: 'KYC Reviews',
  overview: 'Dashboard',
  users: 'Staff & Roles',
}

function allowedNavGroups(roles?: UserRoles, legacyRole?: number | string) {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => item.allowed(roles, legacyRole)) })).filter(
    (group) => group.items.length > 0,
  )
}

function NavLinks({ collapsed, groups, onNavigate, section }: { collapsed: boolean; groups: ReturnType<typeof allowedNavGroups>; onNavigate?: () => void; section: AdminSection }) {
  return (
    <nav className={`flex flex-col gap-5 ${collapsed ? 'items-center' : ''}`}>
      {groups.map((group) => (
        <div className="flex flex-col gap-2" key={group.label}>
          {!collapsed && <p className="px-4 text-[11px] font-bold uppercase tracking-widest text-foose-faint">{group.label}</p>}
          {group.items.map((item) => (
            <a
              className={`flex items-center gap-3 rounded-lg text-sm font-semibold transition ${
                collapsed ? 'size-11 justify-center p-0' : 'px-4 py-3'
              } ${section === item.key ? 'bg-accent text-white' : 'text-foose-muted hover:bg-accent-light hover:text-accent'}`}
              href={withBasePath(item.href)}
              key={item.key}
              onClick={onNavigate}
              title={item.label}
            >
              <Icon name={item.icon} />
              <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
            </a>
          ))}
        </div>
      ))}
    </nav>
  )
}

function SidebarFooter({ collapsed, onLogout, roleLabel, userName }: { collapsed: boolean; onLogout: () => void; roleLabel: string; userName: string }) {
  return (
    <footer className={`border-t border-foose-border pt-4 ${collapsed ? 'flex flex-col items-center' : ''}`}>
      {!collapsed && (
        <div className="mb-3 flex items-center gap-3 px-1">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">
            {initials(userName)}
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-sm text-foose-text">{userName}</strong>
            <small className="block truncate text-xs font-semibold text-foose-muted">{roleLabel}</small>
          </span>
        </div>
      )}
      <button
        className={`flex items-center gap-3 rounded-lg text-sm font-semibold text-foose-muted transition hover:bg-accent-light hover:text-accent ${
          collapsed ? 'size-11 justify-center p-0' : 'w-full px-4 py-3'
        }`}
        onClick={onLogout}
        title="Log Out"
        type="button"
      >
        <Icon name="arrow" />
        <span className={collapsed ? 'sr-only' : ''}>Log Out</span>
      </button>
    </footer>
  )
}

export function AdminShell({ actions, children, section }: { actions?: ReactNode; children: ReactNode; section: AdminSection }) {
  const { logout, user } = useAuth()
  const brand = getAppName()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const groups = allowedNavGroups(user?.roles, user?.role)
  const primaryRoleLabel = roleLabels(user?.roles, user?.role).find((label) => label !== 'Standard User') || 'Staff'

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

  return (
    <div className={`min-h-dvh bg-foose-bg lg:grid ${sidebarWidth}`}>
      <aside
        className={`sticky top-0 z-40 flex min-h-16 items-center border-b border-foose-border bg-foose-surface p-4 transition-all lg:h-dvh lg:flex-col lg:justify-between lg:border-b-0 lg:border-r ${
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

        <div className="hidden lg:block">
          <NavLinks collapsed={sidebarCollapsed} groups={groups} section={section} />
        </div>

        <div className="hidden lg:block">
          <SidebarFooter collapsed={sidebarCollapsed} onLogout={requestLogout} roleLabel={primaryRoleLabel} userName={user?.name || 'Admin'} />
        </div>
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

            <div className="mt-4 flex-1 overflow-y-auto">
              <NavLinks collapsed={false} groups={groups} onNavigate={closeMenu} section={section} />
            </div>

            <SidebarFooter collapsed={false} onLogout={requestLogout} roleLabel={primaryRoleLabel} userName={user?.name || 'Admin'} />
          </aside>
        </div>
      )}

      <LogoutConfirmDialog onCancel={cancelLogout} onConfirm={confirmLogout} open={logoutConfirmOpen} />

      <main className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-foose-border bg-foose-surface/95 p-4 backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-widest text-foose-muted">{SECTION_LABELS[section]}</p>
          <div className="flex items-center gap-3">
            {actions}
            {user?.profilePhoto ? (
              <img alt="" className="size-10 rounded-full object-cover" src={user.profilePhoto} />
            ) : (
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(user?.name)}</span>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
