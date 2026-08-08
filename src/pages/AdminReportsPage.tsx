import { AdminShell, Badge, DataTable, PageHeader, Pagination } from '../components'
import { useServerTable } from '../hooks/useServerTable'
import type { PaginatedUserReports, User, UserReport, UserReportReason } from '../types/api'
import { formatDateTime, initials } from '../utils/format'
import { navigateTo } from '../utils/navigation'

type ReportFilters = {
  page: number
  reason: string
  status: string
}

const REPORT_PAGE_SIZE = 50

const reasonLabels: Record<UserReportReason, string> = {
  counterfeit_or_fake_listings: 'Counterfeit or fake listings',
  harassment: 'Harassment or abusive behavior',
  inappropriate_content: 'Inappropriate content',
  other: 'Other',
  scam_or_fraud: 'Scam or fraud',
  spam: 'Spam',
}

const statusTone = {
  dismissed: 'neutral',
  open: 'warning',
  resolved: 'success',
} as const

const reasonOptions = [
  { label: 'All reasons', value: '' },
  ...(Object.keys(reasonLabels) as UserReportReason[]).map((value) => ({ label: reasonLabels[value], value })),
]

function reportsPath(basePath: string, state: ReportFilters) {
  const params = new URLSearchParams({ limit: String(REPORT_PAGE_SIZE), page: String(state.page) })
  if (state.status) params.set('status', state.status)
  if (state.reason) params.set('reason', state.reason)
  return `${basePath}?${params.toString()}`
}

function isUserObject(user?: User | string | null): user is User {
  return Boolean(user && typeof user === 'object')
}

function getUserName(user?: User | string | null, fallback = 'Unknown account') {
  if (!user) return fallback
  return typeof user === 'string' ? fallback : user.name
}

function getUserMeta(user?: User | string | null) {
  if (!isUserObject(user)) return undefined
  return user.email || (user.username ? `@${user.username}` : undefined)
}

function openRecord(id: string) {
  navigateTo(`/admin/reports/${id}`)
}

function PersonCell({ person }: { person?: User | string }) {
  const name = getUserName(person)
  return (
    <div className="flex min-w-48 items-center gap-3">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-light text-xs font-bold text-accent">
        {initials(name)}
      </span>
      <span className="min-w-0">
        <strong className="block truncate">{name}</strong>
        <small className="block truncate text-xs font-semibold text-foose-muted">{getUserMeta(person) || 'No account email'}</small>
      </span>
    </div>
  )
}

export function AdminReportsPage() {
  const table = useServerTable<PaginatedUserReports, ReportFilters>({
    basePath: '/admin/user-reports',
    buildPath: reportsPath,
    defaults: { page: 1, reason: '', status: '' },
    resetKeyOnChange: 'page',
  })

  const records = table.data?.records || []
  const total = table.data?.total || 0
  const pages = table.data?.pages || 0
  const limit = table.data?.limit || REPORT_PAGE_SIZE

  return (
    <AdminShell section="reports">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader
          description="Review reports raised by users against other accounts, then resolve or dismiss each one."
          title="User reports"
        />

        <div className="mb-5 grid gap-4 rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm sm:grid-cols-2 lg:w-fit lg:grid-cols-[200px_200px]">
          <label className="text-sm font-semibold text-foose-text">
            Status
            <select
              className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              onChange={(event) => table.set({ status: event.target.value })}
              value={table.state.status}
            >
              <option value="">All statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-foose-text">
            Reason
            <select
              className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
              onChange={(event) => table.set({ reason: event.target.value })}
              value={table.state.reason}
            >
              {reasonOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <DataTable<UserReport>
          caption="User reports"
          columns={[
            { cell: (record) => <PersonCell person={record.reporterId} />, header: 'Reporter', key: 'reporter' },
            { cell: (record) => <PersonCell person={record.reportedUserId} />, header: 'Reported account', key: 'reported' },
            { cell: (record) => reasonLabels[record.reason] || record.reason, header: 'Issue', hideBelow: 'md', key: 'reason' },
            { cell: (record) => <Badge tone={statusTone[record.status as keyof typeof statusTone] || 'neutral'}>{record.status}</Badge>, header: 'Status', key: 'status' },
            { cell: (record) => formatDateTime(record.createdAt), header: 'Submitted', hideBelow: 'lg', key: 'submitted' },
          ]}
          empty={{ body: 'No user reports match these filters.', title: 'No reports found' }}
          error={table.error}
          footer={
            <Pagination
              label="reports"
              onPageChange={(page) => table.set({ page })}
              page={table.state.page}
              pageCount={pages}
              pageSize={limit}
              total={total}
            />
          }
          loading={table.loading}
          minWidth={860}
          onRetry={table.refetch}
          onRowClick={(record) => openRecord(record._id)}
          rowKey={(record) => record._id}
          rows={records}
        />
      </section>
    </AdminShell>
  )
}
