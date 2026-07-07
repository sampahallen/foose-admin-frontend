import { useMemo, useState, type FormEvent } from 'react'
import { AdminShell, Badge, EmptyState, ErrorState, LoadingState, StatCard } from '../components'
import {
  ROLE_CODES_BY_KEY,
  ROLE_LABELS,
  STAFF_ROLE_KEYS,
  hasRole,
  roleLabels,
  type RoleKey,
} from '../constants/roles'
import { useApiResource } from '../hooks/useApiResource'
import { apiDelete, apiPut } from '../lib/api'
import type { User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, initials } from '../utils/format'

type AdminUsersResponse = {
  users: User[]
  total: number
  page: number
  pages: number
  limit: number
}

const PAGE_SIZE = 20

function buildUsersPath(page: number, search: string) {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    page: String(page),
  })

  if (search) params.set('search', search)
  return `/admin/users?${params.toString()}`
}

export function AdminUserRolesPage() {
  const [page, setPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState('')
  const [actionError, setActionError] = useState('')
  const usersPath = useMemo(() => buildUsersPath(page, search), [page, search])
  const users = useApiResource<AdminUsersResponse>(usersPath)

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPage(1)
    setSearch(searchDraft.trim())
  }

  async function updateRole(userId: string, roleKey: RoleKey, mode: 'add' | 'remove') {
    setBusy(`${mode}:${userId}:${roleKey}`)
    setActionError('')
    try {
      if (mode === 'add') {
        await apiPut(`/admin/users/${userId}/roles/${roleKey}`)
      } else {
        await apiDelete(`/admin/users/${userId}/roles/${roleKey}`)
      }
      await users.refetch()
    } catch (requestError) {
      setActionError(getErrorMessage(requestError, 'Unable to update user role'))
    } finally {
      setBusy('')
    }
  }

  const total = users.data?.total || 0
  const pages = users.data?.pages || 0
  const limit = users.data?.limit || PAGE_SIZE
  const start = total ? (page - 1) * limit + 1 : 0
  const end = Math.min(page * limit, total)

  return (
    <AdminShell section="users">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <div className="admin-title mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>Staff roles</h1>
            <p>Manage operational access for Foose staff accounts.</p>
          </div>
          <div className="admin-mini-stats grid gap-3 sm:grid-cols-2">
            <StatCard icon="user" label="Matched Users" value={String(total)} note={total ? `${start}-${end}` : 'No matches'} />
          </div>
        </div>

        <form className="mb-5 flex flex-col gap-3 rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:flex-row md:items-end" onSubmit={submitSearch}>
          <label className="flex-1 text-sm font-semibold text-foose-text">
            Search users
            <input
              className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Name, email, username, phone, or user ID"
              value={searchDraft}
            />
          </label>
          <button className="inline-flex min-h-11 items-center justify-center rounded-lg border border-accent bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover" type="submit">
            Search
          </button>
          {(search || searchDraft) && (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent"
              onClick={() => {
                setPage(1)
                setSearch('')
                setSearchDraft('')
              }}
              type="button"
            >
              Clear
            </button>
          )}
        </form>

        {users.loading && <LoadingState label="Loading users..." />}
        {users.error && <ErrorState message={users.error} retry={users.refetch} />}
        {actionError && <ErrorState message={actionError} />}
        {!users.loading && !users.error && !users.data?.users.length && (
          <EmptyState body="No users match the current search." title="No users found" />
        )}

        {!!users.data?.users.length && (
          <div className="overflow-x-auto rounded-xl border border-foose-border bg-foose-surface">
            <table className="sharp-table w-full min-w-[1040px] border-collapse text-left text-sm [&_th]:border-b [&_th]:border-foose-border [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-foose-surface-mid [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Current Roles</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Role Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.data.users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="flex min-w-60 items-center gap-3">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">
                          {initials(user.name)}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-foose-text">{user.name}</strong>
                          <small className="block truncate text-xs font-semibold text-foose-muted">
                            {user.email} / @{user.username}
                          </small>
                          <small className="block truncate text-[11px] font-semibold text-foose-faint">{user._id}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {roleLabels(user.roles, user.role).map((label) => (
                          <Badge key={label} tone={label === ROLE_LABELS[ROLE_CODES_BY_KEY.superAdmin] ? 'accent' : 'neutral'}>
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={user.isEmailVerified ? 'success' : 'warning'}>
                          {user.isEmailVerified ? 'Email verified' : 'Email pending'}
                        </Badge>
                        {user.isKycVerified && <Badge tone="success">KYC</Badge>}
                      </div>
                    </td>
                    <td>{formatDateTime(user.createdAt)}</td>
                    <td>
                      <div className="grid gap-2">
                        {STAFF_ROLE_KEYS.map((roleKey) => {
                          const roleCode = ROLE_CODES_BY_KEY[roleKey]
                          const assigned = hasRole(user.roles, roleCode, user.role)
                          return (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-foose-border bg-foose-surface-low px-3 py-2" key={roleKey}>
                              <span className="text-xs font-bold text-foose-text">{ROLE_LABELS[roleCode]}</span>
                              <button
                                className={`inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:pointer-events-none disabled:opacity-50 ${
                                  assigned
                                    ? 'border-foose-danger-bg bg-white text-foose-danger hover:bg-foose-danger-bg'
                                    : 'border-accent bg-accent text-white hover:bg-accent-hover'
                                }`}
                                disabled={busy === `${assigned ? 'remove' : 'add'}:${user._id}:${roleKey}`}
                                onClick={() => void updateRole(user._id, roleKey, assigned ? 'remove' : 'add')}
                                type="button"
                              >
                                {busy === `${assigned ? 'remove' : 'add'}:${user._id}:${roleKey}`
                                  ? 'Saving...'
                                  : assigned
                                    ? 'Remove'
                                    : 'Add'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!!users.data && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foose-border bg-foose-surface p-4">
            <p className="text-sm font-semibold text-foose-muted">
              Page {pages ? page : 0} of {pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-4 py-2 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                disabled={page <= 1 || users.loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-4 py-2 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                disabled={!pages || page >= pages || users.loading}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  )
}
