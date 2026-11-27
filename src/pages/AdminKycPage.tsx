import { AdminShell, Badge, Button, DataTable, ErrorState, LoadingState, PageHeader, Pagination } from '../components'
import { ChartFrame, StatusBar } from '../components/charts'
import { statusColor } from '../constants/charts'
import { isSuperAdminRole } from '../constants/roles'
import { useApiResource } from '../hooks/useApiResource'
import { useAuth } from '../hooks/useAuth'
import { useQueryState } from '../hooks/useQueryState'
import { useServerTable } from '../hooks/useServerTable'
import type { AdminStats, KycRecord, PaginatedKycRecords, User } from '../types/api'
import { exportRowsToCsv } from '../utils/exportCsv'
import { formatDateTime, initials } from '../utils/format'
import { withBasePath } from '../utils/navigation'

type PendingKyc = KycRecord & {
  _id: string
  userId: User
}

type ReviewedKyc = Omit<KycRecord, 'reviewedBy' | 'userId'> & {
  _id: string
  reviewedBy?: User | string | null
  userId?: User | string | null
}

type ReviewedKycResponse = Omit<PaginatedKycRecords, 'records'> & {
  records: ReviewedKyc[]
}

type ReviewedFilters = {
  idType: string
  page: number
  phoneVerified: string
  reviewedWithin: string
  search: string
  sort: string
}

type ReviewedView = 'accepted' | 'rejected'
type KycView = 'pending' | ReviewedView

const VIEW_DEFAULTS = { view: 'pending', page: 1 }
const reviewedEndpoints = { accepted: '/admin/kyc/approved', rejected: '/admin/kyc/rejected' }
const REVIEWED_DEFAULTS: ReviewedFilters = { idType: '', page: 1, phoneVerified: '', reviewedWithin: '', search: '', sort: 'newest' }
const ACCEPTED_PREVIEW_SIZE = 5
const REVIEWED_PAGE_SIZE = 50

const idTypeOptions = [
  { label: 'All ID types', value: '' },
  { label: 'Ghana Card', value: 'Ghana Card' },
  { label: 'Passport', value: 'Passport' },
  { label: 'Driving License', value: 'Driving License' },
]

function reviewedPath(basePath: string, state: ReviewedFilters) {
  const params = new URLSearchParams({ limit: String(REVIEWED_PAGE_SIZE), page: String(state.page) })
  if (state.idType) params.set('idType', state.idType)
  if (state.phoneVerified) params.set('phoneVerified', state.phoneVerified)
  if (state.reviewedWithin) params.set('reviewedWithin', state.reviewedWithin)
  if (state.search) params.set('search', state.search)
  if (state.sort) params.set('sort', state.sort)
  return `${basePath}?${params.toString()}`
}

function previewPath(view: ReviewedView) {
  return `${reviewedEndpoints[view]}?limit=${ACCEPTED_PREVIEW_SIZE}&page=1&sort=newest`
}

function isUserObject(user?: User | string | null): user is User {
  return Boolean(user && typeof user === 'object')
}

function getUserName(user?: User | string | null) {
  if (!user) return 'Unknown seller'
  return typeof user === 'string' ? user : user.name
}

function getUserEmail(user?: User | string | null) {
  return isUserObject(user) ? user.email : undefined
}

function getUserUsername(user?: User | string | null) {
  return isUserObject(user) ? user.username : undefined
}

function getReviewerName(user?: User | string | null) {
  if (!user) return 'Not recorded'
  return typeof user === 'string' ? 'Admin user' : user.name
}

function recordPath(id: string, view: KycView) {
  const params = new URLSearchParams(view === 'pending' ? '' : window.location.search)
  if (view !== 'pending') params.set('view', view)
  const query = params.toString()
  return withBasePath(`/admin/kyc/${encodeURIComponent(id)}${query ? `?${query}` : ''}`)
}

function RecordLink({ record, view }: { record: PendingKyc | ReviewedKyc; view: KycView }) {
  return (
    <a
      aria-label={`${view === 'pending' ? 'Review' : 'View'} KYC for ${getUserName(record.userId)}`}
      className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-bold text-accent hover:bg-accent-light focus-visible:outline-2 focus-visible:outline-accent"
      href={recordPath(record._id, view)}
    >
      {view === 'pending' ? 'Review' : 'View record'}
    </a>
  )
}

function SellerCell({ record }: { record: ReviewedKyc | PendingKyc }) {
  const sellerName = getUserName(record.userId)
  const email = getUserEmail(record.userId)
  const username = getUserUsername(record.userId)

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">
        {initials(sellerName)}
      </span>
      <span className="min-w-0">
        <strong className="block wrap-anywhere">{sellerName}</strong>
        <small className="block wrap-anywhere text-xs font-semibold text-foose-muted">{email || (username ? `@${username}` : 'No account email')}</small>
      </span>
    </div>
  )
}

function AcceptedKycPreviewPanel({ resource, onViewAll }: {
  resource: ReturnType<typeof useApiResource<ReviewedKycResponse>>
  onViewAll: () => void
}) {
  const records = resource.data?.records || []

  return (
    <section className="rounded-xl border border-foose-border bg-foose-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foose-border px-4 py-3 md:px-5">
        <h2 className="text-base font-bold text-foose-text">Recently accepted</h2>
        <Button iconRight="arrow" onClick={onViewAll} size="sm" variant="secondary">View accepted records</Button>
      </div>
      {resource.loading && <p className="p-4 text-sm text-foose-muted" role="status">Loading accepted records…</p>}
      {resource.error && <div className="p-4"><ErrorState message={resource.error} retry={resource.refetch} /></div>}
      {!resource.loading && !resource.error && !records.length && (
        <p className="p-4 text-sm text-foose-muted">No accepted KYC records yet.</p>
      )}
      {!!records.length && (
        <ul className="divide-y divide-foose-border">
          {records.map((record) => (
            <li key={record._id}>
              <a className="grid items-center gap-2 px-4 py-3 text-sm hover:bg-foose-surface-low focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] md:px-5" href={recordPath(record._id, 'accepted')}>
                <SellerCell record={record} />
                <span className="text-foose-muted">{record.idType || 'ID not set'}</span>
                <span className="text-foose-muted sm:text-right">{formatDateTime(record.reviewedAt)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ReviewedKycTable({ view }: { view: ReviewedView }) {
  const table = useServerTable<ReviewedKycResponse, ReviewedFilters>({
    basePath: reviewedEndpoints[view],
    buildPath: reviewedPath,
    defaults: REVIEWED_DEFAULTS,
    resetKeyOnChange: 'page',
  })

  const records = table.data?.records || []
  const total = table.data?.total || 0
  const pages = table.data?.pages || 0
  const limit = table.data?.limit || REVIEWED_PAGE_SIZE

  function exportCsv() {
    exportRowsToCsv(
      `kyc-${view}-page.csv`,
      [
        { header: 'Seller', value: (record: ReviewedKyc) => getUserName(record.userId) },
        { header: 'Email', value: (record: ReviewedKyc) => getUserEmail(record.userId) || '' },
        { header: 'ID type', value: (record: ReviewedKyc) => record.idType || '' },
        { header: 'ID number', value: (record: ReviewedKyc) => record.idNo || '' },
        { header: 'Reviewed', value: (record: ReviewedKyc) => formatDateTime(record.reviewedAt) },
        { header: 'Reviewer', value: (record: ReviewedKyc) => getReviewerName(record.reviewedBy) },
        { header: 'Phone verified', value: (record: ReviewedKyc) => (record.phoneVerified ? 'Yes' : 'No') },
      ],
      records,
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-xl border border-foose-border bg-foose-surface p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <label className="min-w-0 text-sm font-semibold text-foose-text">
          Search
          <input
            className="mt-2 h-11 min-w-0 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            maxLength={120}
            onChange={(event) => table.set({ search: event.target.value })}
            placeholder="Name, email, username, phone, or ID"
            value={table.state.search}
          />
        </label>
        <label className="min-w-0 text-sm font-semibold text-foose-text">
          ID type
          <select
            className="mt-2 h-11 min-w-0 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            onChange={(event) => table.set({ idType: event.target.value })}
            value={table.state.idType}
          >
            {idTypeOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="min-w-0 text-sm font-semibold text-foose-text">
          Phone
          <select
            className="mt-2 h-11 min-w-0 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            onChange={(event) => table.set({ phoneVerified: event.target.value })}
            value={table.state.phoneVerified}
          >
            <option value="">All phone states</option>
            <option value="true">Verified</option>
            <option value="false">Not verified</option>
          </select>
        </label>
        <label className="min-w-0 text-sm font-semibold text-foose-text">
          Reviewed
          <select
            className="mt-2 h-11 min-w-0 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            onChange={(event) => table.set({ reviewedWithin: event.target.value })}
            value={table.state.reviewedWithin}
          >
            <option value="">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </label>
        <label className="min-w-0 text-sm font-semibold text-foose-text">
          Sort
          <select
            className="mt-2 h-11 min-w-0 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            onChange={(event) => table.set({ sort: event.target.value })}
            value={table.state.sort}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm font-semibold text-foose-muted">
          {table.loading ? `Loading ${view} records…` : !table.error && `${total} matching records`}
        </p>
        <div className="flex flex-wrap gap-2">
          {!table.isDefault && <Button onClick={table.reset} size="sm" variant="secondary">Reset search and filters</Button>}
          <Button disabled={table.loading || Boolean(table.error) || !records.length} icon="download" onClick={exportCsv} size="sm" variant="secondary">
            Export this page
          </Button>
        </div>
      </div>

      <DataTable<ReviewedKyc>
        compactRows
        caption={`${view === 'accepted' ? 'Accepted' : 'Rejected'} KYC records`}
        columns={[
          { cell: (record) => <SellerCell record={record} />, header: 'Seller', key: 'seller' },
          { cell: (record) => <Badge>{record.idType || 'Unknown'}</Badge>, header: 'ID type', hideBelow: 'sm', key: 'idType' },
          { cell: (record) => record.idNo || 'Not provided', header: 'ID number', hideBelow: 'lg', key: 'idNo' },
          { cell: (record) => formatDateTime(record.reviewedAt), header: 'Reviewed', hideBelow: 'md', key: 'reviewed' },
          { cell: (record) => getReviewerName(record.reviewedBy), header: 'Reviewer', hideBelow: 'lg', key: 'reviewer' },
          { cell: (record) => <Badge tone={record.phoneVerified ? 'success' : 'warning'}>{record.phoneVerified ? 'Verified' : 'Not verified'}</Badge>, header: 'Phone', hideBelow: 'sm', key: 'phone' },
          ...(view === 'rejected' ? [{
            cell: (record: ReviewedKyc) => record.correctionRequest?.fields.length ? 'Corrections requested' : record.rejectionReason || 'Not recorded',
            header: 'Rejection details',
            hideBelow: 'md' as const,
            key: 'rejection',
          }] : []),
          { cell: (record) => <RecordLink record={record} view={view} />, header: 'Actions', key: 'actions' },
        ]}
        empty={{ body: 'Try a different search term or loosen the filters.', title: `No ${view} KYC records found` }}
        error={table.error}
        footer={
          <Pagination
            label="records"
            onPageChange={(page) => table.set({ page })}
            page={table.state.page}
            pageCount={pages}
            pageSize={limit}
            total={total}
          />
        }
        loading={table.loading}
        onRetry={table.refetch}
        rowKey={(record) => record._id}
        rows={records}
      />
    </div>
  )
}

export function AdminKycPage() {
  const { user } = useAuth()
  const isSuperAdmin = isSuperAdminRole(user?.roles, user?.role)
  const viewState = useQueryState({ defaults: VIEW_DEFAULTS })
  const requestedView = viewState.state.view
  const view = requestedView === 'accepted' || requestedView === 'rejected' ? requestedView : 'pending'
  const setView = (nextView: KycView) => {
    if (nextView !== view) viewState.set({ view: nextView, page: 1 })
  }

  const pending = useApiResource<{ records: PendingKyc[] }>('/admin/kyc/pending')
  const acceptedPreview = useApiResource<ReviewedKycResponse>(previewPath('accepted'))
  const rejectedPreview = useApiResource<ReviewedKycResponse>(previewPath('rejected'))
  const stats = useApiResource<AdminStats>(isSuperAdmin ? '/admin/stats' : null, isSuperAdmin)

  const pendingRecords = pending.data?.records || []

  const kycStatusSegments = (stats.data?.charts.kycStatus || []).map((item) => ({
    color: statusColor(String(item.status) === 'approved' ? 'approved' : String(item.status) === 'rejected' ? 'rejected' : String(item.status) === 'pending' ? 'pending' : 'not_submitted'),
    count: item.count,
    key: String(item.status),
    label: String(item.status).replaceAll('_', ' '),
  }))

  return (
    <AdminShell section="kyc">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader title="KYC reviews" />
        <div aria-label="KYC views" className="mb-5 grid grid-cols-3 gap-1 border-b sm:flex sm:flex-wrap sm:gap-x-5 border-foose-border" role="group">
          {(['pending', 'accepted', 'rejected'] as const).map((key) => (
            <button
              aria-pressed={view === key}
              className={`inline-flex min-w-0 min-h-12 flex-wrap items-center justify-center gap-x-2 border-b-2 px-1 py-2 text-center text-xs sm:text-sm font-bold focus-visible:outline-2 focus-visible:outline-accent ${view === key ? 'border-accent text-accent' : 'border-transparent text-foose-muted hover:text-foose-text'}`}
              key={key}
              onClick={() => setView(key)}
              type="button"
            >
              {key === 'pending' ? 'Pending review' : key === 'accepted' ? 'Accepted records' : 'Rejected records'}
              {key === 'pending' && pending.data && <Badge tone={view === key ? 'accent' : 'neutral'}>{pendingRecords.length}</Badge>}
              {key === 'accepted' && acceptedPreview.data && <Badge tone={view === key ? 'accent' : 'neutral'}>{acceptedPreview.data.total}</Badge>}
              {key === 'rejected' && rejectedPreview.data && <Badge tone={view === key ? 'accent' : 'neutral'}>{rejectedPreview.data.total}</Badge>}
            </button>
          ))}
        </div>

        {view === 'pending' ? (
          <div className="space-y-6">
            {pending.loading ? <LoadingState label="Loading pending submissions…" /> : <DataTable<PendingKyc>
              compactRows
              caption="Pending KYC submissions"
              columns={[
                { cell: (record) => <SellerCell record={record} />, header: 'Seller name', key: 'seller' },
                { cell: (record) => formatDateTime(record.submittedAt), header: 'Submission date', hideBelow: 'md', key: 'submitted' },
                { cell: (record) => <Badge>{record.idType}</Badge>, header: 'ID type', hideBelow: 'sm', key: 'idType' },
                { cell: (record) => <RecordLink record={record} view="pending" />, header: 'Review', key: 'actions' },
              ]}
              empty={{ body: 'No pending KYC submissions are waiting for review.', title: 'KYC queue is clear' }}
              error={pending.error}
              onRetry={pending.refetch}
              rowKey={(record) => record._id}
              rows={pendingRecords}
            />}
            <AcceptedKycPreviewPanel onViewAll={() => setView('accepted')} resource={acceptedPreview} />
          </div>
        ) : (
          <ReviewedKycTable key={view} view={view} />
        )}
        {isSuperAdmin && !!kycStatusSegments.length && (
          <ChartFrame className="mt-6" height="auto" responsive={false} title="KYC status breakdown">
            <StatusBar onSegmentClick={(key) => {
              if (key === 'approved') setView('accepted')
              if (key === 'rejected' || key === 'pending') setView(key)
            }} segments={kycStatusSegments} />
          </ChartFrame>
        )}
      </section>
    </AdminShell>
  )
}
