import { useState } from 'react'
import { AdminShell, Badge, Button, DataTable, KycActionDialog, PageHeader, Pagination } from '../components'
import { ChartFrame, StatusBar } from '../components/charts'
import { statusColor } from '../constants/charts'
import { isSuperAdminRole } from '../constants/roles'
import { useApiResource } from '../hooks/useApiResource'
import { useAuth } from '../hooks/useAuth'
import { useKycReviewAction } from '../hooks/useKycReviewAction'
import { useServerTable } from '../hooks/useServerTable'
import type { AdminStats, KycRecord, PaginatedKycRecords, User } from '../types/api'
import { exportRowsToCsv } from '../utils/exportCsv'
import { formatDateTime, initials } from '../utils/format'
import { navigateTo, withBasePath } from '../utils/navigation'

type PendingKyc = KycRecord & {
  _id: string
  userId: User
}

type AcceptedKyc = Omit<KycRecord, 'reviewedBy' | 'userId'> & {
  _id: string
  reviewedBy?: User | string | null
  userId?: User | string | null
}

type AcceptedKycResponse = Omit<PaginatedKycRecords, 'records'> & {
  records: AcceptedKyc[]
}

type AcceptedFilters = {
  idType: string
  page: number
  phoneVerified: string
  reviewedWithin: string
  search: string
  sort: string
}

const ACCEPTED_PREVIEW_SIZE = 5
const ACCEPTED_PAGE_SIZE = 50

const idTypeOptions = [
  { label: 'All ID types', value: '' },
  { label: 'Ghana Card', value: 'Ghana Card' },
  { label: 'Passport', value: 'Passport' },
  { label: 'Driving License', value: 'Driving License' },
]

function acceptedPath(basePath: string, state: AcceptedFilters) {
  const params = new URLSearchParams({ limit: String(ACCEPTED_PAGE_SIZE), page: String(state.page) })
  if (state.idType) params.set('idType', state.idType)
  if (state.phoneVerified) params.set('phoneVerified', state.phoneVerified)
  if (state.reviewedWithin) params.set('reviewedWithin', state.reviewedWithin)
  if (state.search) params.set('search', state.search)
  if (state.sort) params.set('sort', state.sort)
  return `${basePath}?${params.toString()}`
}

function previewPath() {
  return `/admin/kyc/approved?limit=${ACCEPTED_PREVIEW_SIZE}&page=1&sort=newest`
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

function openRecord(id: string) {
  navigateTo(`/admin/kyc/${id}`)
}

function SellerCell({ record }: { record: AcceptedKyc | PendingKyc }) {
  const sellerName = getUserName(record.userId)
  const email = getUserEmail(record.userId)
  const username = getUserUsername(record.userId)

  return (
    <div className="flex min-w-56 items-center gap-3">
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">
        {initials(sellerName)}
      </span>
      <span className="min-w-0">
        <strong className="block truncate">{sellerName}</strong>
        <small className="block truncate text-xs font-semibold text-foose-muted">{email || (username ? `@${username}` : 'No account email')}</small>
      </span>
    </div>
  )
}

function AcceptedKycPreviewPanel({ loading, onViewAll, records, total }: { loading: boolean; onViewAll: () => void; records: AcceptedKyc[]; total: number }) {
  return (
    <aside className="rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foose-text">Previously accepted KYCs</h2>
          <p className="mt-1 text-sm leading-6 text-foose-muted">Latest approved seller verifications.</p>
        </div>
        <Badge tone="success">{total}</Badge>
      </div>

      {loading && <p className="text-sm font-semibold text-foose-muted">Loading accepted KYCs...</p>}

      {!loading && !records.length && (
        <div className="rounded-lg border border-dashed border-foose-border bg-foose-surface-low p-4 text-sm font-semibold text-foose-muted">
          No accepted KYC records yet.
        </div>
      )}

      {!!records.length && (
        <div className="space-y-4">
          {records.map((record) => {
            const sellerName = getUserName(record.userId)
            return (
              <a
                className="block rounded-lg border border-foose-border bg-white p-3 transition hover:border-accent hover:bg-accent-light"
                href={withBasePath(`/admin/kyc/${record._id}`)}
                key={record._id}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-foose-success-bg text-xs font-bold text-foose-success">
                    {initials(sellerName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-foose-text">{sellerName}</strong>
                    <small className="block truncate text-xs font-semibold text-foose-muted">{getUserEmail(record.userId) || record.idNo || 'Accepted record'}</small>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-foose-faint">
                      <span>{record.idType || 'ID not set'}</span>
                      <span>{formatDateTime(record.reviewedAt)}</span>
                    </span>
                  </span>
                </div>
              </a>
            )
          })}
        </div>
      )}

      <Button className="mt-5 w-full" full iconRight="arrow" onClick={onViewAll}>
        View accepted records
      </Button>
    </aside>
  )
}

export function AdminKycPage() {
  const { user } = useAuth()
  const isSuperAdmin = isSuperAdminRole(user?.roles, user?.role)
  const [view, setView] = useState<'accepted' | 'pending'>('pending')

  const pending = useApiResource<{ records: PendingKyc[] }>('/admin/kyc/pending')
  const acceptedPreview = useApiResource<AcceptedKycResponse>(previewPath())
  const stats = useApiResource<AdminStats>(isSuperAdmin ? '/admin/stats' : null, isSuperAdmin)

  const acceptedTable = useServerTable<AcceptedKycResponse, AcceptedFilters>({
    basePath: '/admin/kyc/approved',
    buildPath: acceptedPath,
    defaults: { idType: '', page: 1, phoneVerified: '', reviewedWithin: '', search: '', sort: 'newest' },
    resetKeyOnChange: 'page',
  })

  const kycAction = useKycReviewAction({
    onSuccess: async () => {
      await pending.refetch()
      await acceptedPreview.refetch()
      await acceptedTable.refetch()
    },
  })

  const pendingRecords = pending.data?.records || []
  const previewRecords = acceptedPreview.data?.records || []
  const acceptedRecords = acceptedTable.data?.records || []
  const acceptedTotal = acceptedTable.data?.total || 0
  const acceptedPages = acceptedTable.data?.pages || 0
  const acceptedLimit = acceptedTable.data?.limit || ACCEPTED_PAGE_SIZE

  const kycStatusSegments = (stats.data?.charts.kycStatus || []).map((item) => ({
    color: statusColor(String(item.status) === 'approved' ? 'approved' : String(item.status) === 'rejected' ? 'rejected' : String(item.status) === 'pending' ? 'pending' : 'not_submitted'),
    count: item.count,
    key: String(item.status),
    label: String(item.status).replaceAll('_', ' '),
  }))

  function exportAcceptedCsv() {
    exportRowsToCsv(
      'kyc-accepted-page.csv',
      [
        { header: 'Seller', value: (record: AcceptedKyc) => getUserName(record.userId) },
        { header: 'Email', value: (record: AcceptedKyc) => getUserEmail(record.userId) || '' },
        { header: 'ID type', value: (record: AcceptedKyc) => record.idType || '' },
        { header: 'ID number', value: (record: AcceptedKyc) => record.idNo || '' },
        { header: 'Reviewed', value: (record: AcceptedKyc) => formatDateTime(record.reviewedAt) },
        { header: 'Reviewer', value: (record: AcceptedKyc) => getReviewerName(record.reviewedBy) },
        { header: 'Phone verified', value: (record: AcceptedKyc) => (record.phoneVerified ? 'Yes' : 'No') },
      ],
      acceptedRecords,
    )
  }

  return (
    <AdminShell section="kyc">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader
          actions={
            <div className="inline-flex rounded-lg border border-foose-border bg-foose-surface p-1 shadow-sm">
              <button
                className={`min-h-10 rounded-md px-4 text-sm font-bold transition ${view === 'pending' ? 'bg-accent text-white shadow-sm' : 'text-foose-muted hover:bg-accent-light hover:text-accent'}`}
                onClick={() => setView('pending')}
                type="button"
              >
                Pending ({pendingRecords.length})
              </button>
              <button
                className={`min-h-10 rounded-md px-4 text-sm font-bold transition ${view === 'accepted' ? 'bg-accent text-white shadow-sm' : 'text-foose-muted hover:bg-accent-light hover:text-accent'}`}
                onClick={() => setView('accepted')}
                type="button"
              >
                Accepted
              </button>
            </div>
          }
          description="Review pending identity submissions and search previously accepted KYC records."
          title="KYC reviews"
        />

        {isSuperAdmin && !!kycStatusSegments.length && (
          <ChartFrame className="mb-6" height="sm" responsive={false} title="KYC status breakdown">
            <StatusBar onSegmentClick={(key) => key === 'approved' && setView('accepted')} segments={kycStatusSegments} />
          </ChartFrame>
        )}

        {view === 'pending' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
            <div className="min-w-0">
              <DataTable<PendingKyc>
                caption="Pending KYC submissions"
                columns={[
                  { cell: (record) => <SellerCell record={record} />, header: 'Seller name', key: 'seller' },
                  { cell: (record) => formatDateTime(record.submittedAt), header: 'Submission date', hideBelow: 'md', key: 'submitted' },
                  { cell: (record) => <Badge>{record.idType}</Badge>, header: 'ID type', hideBelow: 'sm', key: 'idType' },
                  { cell: (record) => <Badge tone="accent">{record.status}</Badge>, header: 'Status', key: 'status' },
                  {
                    cell: (record) => (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button onClick={() => openRecord(record._id)} size="sm" variant="secondary">View</Button>
                        <Button
                          loading={kycAction.busy && kycAction.action === 'approve' && kycAction.targetId === record._id}
                          loadingLabel="Approving..."
                          onClick={() => kycAction.request('approve', record._id)}
                          size="sm"
                        >
                          Approve
                        </Button>
                        <Button
                          loading={kycAction.busy && kycAction.action === 'reject' && kycAction.targetId === record._id}
                          loadingLabel="Rejecting..."
                          onClick={() => kycAction.request('reject', record._id)}
                          size="sm"
                          variant="secondary"
                        >
                          Reject
                        </Button>
                      </div>
                    ),
                    header: 'Actions',
                    key: 'actions',
                  },
                ]}
                empty={{ body: 'No pending KYC submissions are waiting for review.', title: 'KYC queue is clear' }}
                error={pending.error}
                loading={pending.loading}
                minWidth={860}
                onRetry={pending.refetch}
                onRowClick={(record) => openRecord(record._id)}
                rowKey={(record) => record._id}
                rows={pendingRecords}
              />
            </div>

            <AcceptedKycPreviewPanel loading={acceptedPreview.loading} onViewAll={() => setView('accepted')} records={previewRecords} total={acceptedPreview.data?.total || 0} />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foose-muted">
                {acceptedTotal ? `${acceptedTotal} accepted records` : 'No accepted records found'}
              </p>
              <Button disabled={!acceptedRecords.length} icon="download" onClick={exportAcceptedCsv} size="sm" variant="secondary">
                Export this page
              </Button>
            </div>

            <div className="grid gap-4 rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_150px]">
              <label className="text-sm font-semibold text-foose-text">
                Search
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => acceptedTable.set({ search: event.target.value })}
                  placeholder="Name, email, username, phone, or ID"
                  value={acceptedTable.state.search}
                />
              </label>
              <label className="text-sm font-semibold text-foose-text">
                ID type
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => acceptedTable.set({ idType: event.target.value })}
                  value={acceptedTable.state.idType}
                >
                  {idTypeOptions.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold text-foose-text">
                Phone
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => acceptedTable.set({ phoneVerified: event.target.value })}
                  value={acceptedTable.state.phoneVerified}
                >
                  <option value="">All phone states</option>
                  <option value="true">Verified</option>
                  <option value="false">Not verified</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-foose-text">
                Reviewed
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => acceptedTable.set({ reviewedWithin: event.target.value })}
                  value={acceptedTable.state.reviewedWithin}
                >
                  <option value="">Any time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </label>
              <label className="text-sm font-semibold text-foose-text">
                Sort
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => acceptedTable.set({ sort: event.target.value })}
                  value={acceptedTable.state.sort}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </label>
            </div>

            <DataTable<AcceptedKyc>
              caption="Accepted KYC records"
              columns={[
                { cell: (record) => <SellerCell record={record} />, header: 'Seller', key: 'seller' },
                { cell: (record) => <Badge>{record.idType || 'Unknown'}</Badge>, header: 'ID type', hideBelow: 'sm', key: 'idType' },
                { cell: (record) => record.idNo || 'Not provided', header: 'ID number', hideBelow: 'lg', key: 'idNo' },
                { cell: (record) => formatDateTime(record.reviewedAt), header: 'Reviewed', hideBelow: 'md', key: 'reviewed' },
                { cell: (record) => getReviewerName(record.reviewedBy), header: 'Reviewer', hideBelow: 'lg', key: 'reviewer' },
                { cell: (record) => <Badge tone={record.phoneVerified ? 'success' : 'warning'}>{record.phoneVerified ? 'Verified' : 'Not verified'}</Badge>, header: 'Phone', key: 'phone' },
                { cell: (record) => <Button onClick={() => openRecord(record._id)} size="sm" variant="secondary">View</Button>, header: 'Actions', key: 'actions' },
              ]}
              empty={{ body: 'Try a different search term or loosen the filters.', title: 'No accepted KYC records found' }}
              error={acceptedTable.error}
              footer={
                <Pagination
                  label="records"
                  onPageChange={(page) => acceptedTable.set({ page })}
                  page={acceptedTable.state.page}
                  pageCount={acceptedPages}
                  pageSize={acceptedLimit}
                  total={acceptedTotal}
                />
              }
              loading={acceptedTable.loading}
              minWidth={980}
              onRetry={acceptedTable.refetch}
              onRowClick={(record) => openRecord(record._id)}
              rowKey={(record) => record._id}
              rows={acceptedRecords}
            />
          </div>
        )}
      </section>

      <KycActionDialog
        controller={kycAction}
        idNo={pendingRecords.find((record) => record._id === kycAction.targetId)?.idNo}
        sellerName={getUserName(pendingRecords.find((record) => record._id === kycAction.targetId)?.userId)}
      />
    </AdminShell>
  )
}
