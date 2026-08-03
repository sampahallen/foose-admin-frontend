import { useMemo, useState } from 'react'
import { AdminShell, Badge, Button, DataTable, PageHeader, Pagination } from '../components'
import {
  ROLE_CODES_BY_KEY,
  ROLE_LABELS,
  STAFF_ROLE_KEYS,
  hasRole,
  roleLabels,
  type RoleKey,
} from '../constants/roles'
import { useServerTable } from '../hooks/useServerTable'
import { apiDelete, apiPut } from '../lib/api'
import type { User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { exportRowsToCsv } from '../utils/exportCsv'
import { formatDateTime, initials } from '../utils/format'

type AdminUsersResponse = {
  users: User[]
  total: number
  page: number
  pages: number
  limit: number
}

const PAGE_SIZE = 20

function buildUsersPath(basePath: string, state: { page: number; search: string }) {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(state.page) })
  if (state.search) params.set('search', state.search)
  return `${basePath}?${params.toString()}`
}

function roleDistribution(users: User[]) {
  const counts = new Map<string, number>()
  for (const user of users) {
    for (const label of roleLabels(user.roles, user.role)) {
      if (label === ROLE_LABELS[ROLE_CODES_BY_KEY.standardUser]) continue
      counts.set(label, (counts.get(label) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
}

export function AdminUserRolesPage() {
  const table = useServerTable<AdminUsersResponse, { page: number; search: string }>({
    basePath: '/admin/users',
    buildPath: buildUsersPath,
    defaults: { page: 1, search: '' },
    resetKeyOnChange: 'page',
  })
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')

  const users = useMemo(() => table.data?.users || [], [table.data])
  const total = table.data?.total || 0
  const pages = table.data?.pages || 0
  const limit = table.data?.limit || PAGE_SIZE
  const distribution = useMemo(() => roleDistribution(users), [users])

  async function updateRole(userId: string, roleKey: RoleKey, mode: 'add' | 'remove') {
    setBusy(`${mode}:${userId}:${roleKey}`)
    setActionError('')
    try {
      if (mode === 'add') {
        await apiPut(`/admin/users/${userId}/roles/${roleKey}`)
      } else {
        await apiDelete(`/admin/users/${userId}/roles/${roleKey}`)
      }
      await table.refetch()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to update user role'))
    } finally {
      setBusy('')
    }
  }

  function exportCsv() {
    exportRowsToCsv(
      'staff-roles-page.csv',
      [
        { header: 'Name', value: (user: User) => user.name },
        { header: 'Email', value: (user: User) => user.email },
        { header: 'Username', value: (user: User) => user.username },
        { header: 'Roles', value: (user: User) => roleLabels(user.roles, user.role).join('; ') },
        { header: 'Email verified', value: (user: User) => (user.isEmailVerified ? 'Yes' : 'No') },
        { header: 'Joined', value: (user: User) => formatDateTime(user.createdAt) },
      ],
      users,
    )
  }

  return (
    <AdminShell section="users">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader
          actions={
            <Button disabled={!users.length} icon="download" onClick={exportCsv} variant="secondary">
              Export this page
            </Button>
          }
          description="Manage operational access for Foose staff accounts."
          meta={table.data && <p className="text-sm font-semibold text-foose-muted">{total} staff account{total === 1 ? '' : 's'} match your search.</p>}
          title="Staff & roles"
        />

        {!!distribution.length && (
          <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-foose-border bg-foose-surface p-3">
            <span className="px-1 text-xs font-bold uppercase tracking-widest text-foose-faint">Roles on this page</span>
            {distribution.map(([label, count]) => (
              <Badge key={label} tone={label === ROLE_LABELS[ROLE_CODES_BY_KEY.superAdmin] ? 'accent' : 'neutral'}>
                {label} · {count}
              </Badge>
            ))}
          </div>
        )}

        <form className="mb-5 flex flex-col gap-3 rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:flex-row md:items-center" onSubmit={(event) => event.preventDefault()}>
          <label className="flex-1 text-sm font-semibold text-foose-text">
            Search users
            <input
              className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              onChange={(event) => table.set({ search: event.target.value })}
              placeholder="Name, email, username, phone, or user ID"
              value={table.state.search}
            />
          </label>
          {table.state.search && (
            <Button onClick={() => table.set({ search: '' })} variant="secondary">
              Clear
            </Button>
          )}
        </form>

        {actionError && <p className="mb-4 rounded-lg border border-foose-danger/30 bg-foose-danger-bg px-4 py-2 text-sm font-semibold text-foose-danger">{actionError}</p>}

        <DataTable<User>
          caption="Staff accounts"
          columns={[
            {
              cell: (user) => (
                <div className="flex min-w-60 items-center gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">
                    {initials(user.name)}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-foose-text">{user.name}</strong>
                    <small className="block truncate text-xs font-semibold text-foose-muted">
                      {user.email} / @{user.username}
                    </small>
                    <small className="hidden truncate text-[11px] font-semibold text-foose-faint md:block">{user._id}</small>
                  </span>
                </div>
              ),
              header: 'User',
              key: 'user',
            },
            {
              cell: (user) => (
                <div className="flex flex-wrap gap-2">
                  {roleLabels(user.roles, user.role).map((label) => (
                    <Badge key={label} tone={label === ROLE_LABELS[ROLE_CODES_BY_KEY.superAdmin] ? 'accent' : 'neutral'}>
                      {label}
                    </Badge>
                  ))}
                </div>
              ),
              header: 'Current roles',
              hideBelow: 'md',
              key: 'roles',
            },
            {
              cell: (user) => (
                <div className="flex flex-wrap gap-2">
                  <Badge tone={user.isEmailVerified ? 'success' : 'warning'}>{user.isEmailVerified ? 'Email verified' : 'Email pending'}</Badge>
                  {user.isKycVerified && <Badge tone="success">KYC</Badge>}
                </div>
              ),
              header: 'Status',
              hideBelow: 'lg',
              key: 'status',
            },
            {
              cell: (user) => formatDateTime(user.createdAt),
              header: 'Joined',
              hideBelow: 'lg',
              key: 'joined',
            },
            {
              cell: (user) => (
                <div className="grid gap-2">
                  {STAFF_ROLE_KEYS.map((roleKey) => {
                    const roleCode = ROLE_CODES_BY_KEY[roleKey]
                    const assigned = hasRole(user.roles, roleCode, user.role)
                    const key = `${assigned ? 'remove' : 'add'}:${user._id}:${roleKey}`
                    return (
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-foose-border bg-foose-surface-low px-3 py-2" key={roleKey}>
                        <span className="text-xs font-bold text-foose-text">{ROLE_LABELS[roleCode]}</span>
                        <Button
                          loading={busy === key}
                          loadingLabel="Saving..."
                          onClick={() => void updateRole(user._id, roleKey, assigned ? 'remove' : 'add')}
                          size="sm"
                          variant={assigned ? 'danger' : 'primary'}
                        >
                          {assigned ? 'Remove' : 'Add'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              ),
              header: 'Role actions',
              key: 'actions',
            },
          ]}
          empty={{ body: 'No users match the current search.', title: 'No users found' }}
          error={table.error}
          footer={<Pagination label="users" onPageChange={(page) => table.set({ page })} page={table.state.page} pageCount={pages} pageSize={limit} total={total} />}
          loading={table.loading}
          minWidth={1040}
          onRetry={table.refetch}
          rowKey={(user) => user._id}
          rows={users}
        />
      </section>
    </AdminShell>
  )
}
