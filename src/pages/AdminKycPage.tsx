import { useMemo, useState, type FormEvent } from 'react'
import { AdminShell, Badge, ConfirmDialog, EmptyState, ErrorState, Icon, LoadingState, StatCard } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { apiPut } from '../lib/api'
import type { KycRecord, PaginatedKycRecords, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
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

type IdTypeFilter = '' | 'Ghana Card' | 'Passport' | 'Driving License'
type PhoneVerifiedFilter = '' | 'true' | 'false'
type ReviewedWithinFilter = '' | '7' | '30' | '90'
type AcceptedSort = 'newest' | 'oldest'
type KycAction = 'approve' | 'reject'

type KycActionRequest = {
  action: KycAction
  record: PendingKyc
}

const ACCEPTED_PREVIEW_SIZE = 5
const ACCEPTED_PAGE_SIZE = 50

const idTypeOptions: Array<{ label: string; value: IdTypeFilter }> = [
  { label: 'All ID types', value: '' },
  { label: 'Ghana Card', value: 'Ghana Card' },
  { label: 'Passport', value: 'Passport' },
  { label: 'Driving License', value: 'Driving License' },
]

function buildApprovedKycPath({
  idType,
  limit,
  page,
  phoneVerified,
  reviewedWithin,
  search,
  sort,
}: {
  idType?: IdTypeFilter
  limit: number
  page: number
  phoneVerified?: PhoneVerifiedFilter
  reviewedWithin?: ReviewedWithinFilter
  search?: string
  sort?: AcceptedSort
}) {
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
  })

  if (idType) params.set('idType', idType)
  if (phoneVerified) params.set('phoneVerified', phoneVerified)
  if (reviewedWithin) params.set('reviewedWithin', reviewedWithin)
  if (search) params.set('search', search)
  if (sort) params.set('sort', sort)

  return `/admin/kyc/approved?${params.toString()}`
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
      <span className="initials inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">
        {initials(sellerName)}
      </span>
      <span className="min-w-0">
        <strong className="block truncate">{sellerName}</strong>
        <small className="block truncate text-xs font-semibold text-foose-muted">{email || (username ? `@${username}` : 'No account email')}</small>
      </span>
    </div>
  )
}

function AcceptedKycPreviewPanel({
  loading,
  onViewAll,
  records,
  total,
}: {
  loading: boolean
  onViewAll: () => void
  records: AcceptedKyc[]
  total: number
}) {
  return (
    <aside className="rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foose-text">Previously accepted KYCs</h2>
          <p className="mt-1 text-sm leading-6 text-foose-muted">Latest approved seller verifications.</p>
        </div>
        <Badge tone="success">{total}</Badge>
      </div>

      {loading && <LoadingState label="Loading accepted KYCs..." />}

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

      <button
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover"
        onClick={onViewAll}
        type="button"
      >
        View all
        <Icon name="arrow" size={18} />
      </button>
    </aside>
  )
}

export function AdminKycPage() {
  const records = useApiResource<{ records: PendingKyc[] }>('/admin/kyc/pending')
  const acceptedPreview = useApiResource<AcceptedKycResponse>(
    buildApprovedKycPath({ limit: ACCEPTED_PREVIEW_SIZE, page: 1, sort: 'newest' }),
  )
  const [actionError, setActionError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [showAcceptedAll, setShowAcceptedAll] = useState(false)
  const [acceptedPage, setAcceptedPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState('')
  const [acceptedSearch, setAcceptedSearch] = useState('')
  const [idTypeFilter, setIdTypeFilter] = useState<IdTypeFilter>('')
  const [phoneVerifiedFilter, setPhoneVerifiedFilter] = useState<PhoneVerifiedFilter>('')
  const [reviewedWithinFilter, setReviewedWithinFilter] = useState<ReviewedWithinFilter>('')
  const [acceptedSort, setAcceptedSort] = useState<AcceptedSort>('newest')
  const [kycActionRequest, setKycActionRequest] = useState<KycActionRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionDialogError, setActionDialogError] = useState('')

  const acceptedPath = useMemo(
    () =>
      buildApprovedKycPath({
        idType: idTypeFilter,
        limit: ACCEPTED_PAGE_SIZE,
        page: acceptedPage,
        phoneVerified: phoneVerifiedFilter,
        reviewedWithin: reviewedWithinFilter,
        search: acceptedSearch,
        sort: acceptedSort,
      }),
    [acceptedPage, acceptedSearch, acceptedSort, idTypeFilter, phoneVerifiedFilter, reviewedWithinFilter],
  )
  const acceptedRecords = useApiResource<AcceptedKycResponse>(showAcceptedAll ? acceptedPath : null, showAcceptedAll)

  function requestKycAction(action: KycAction, record: PendingKyc) {
    setActionError('')
    setActionDialogError('')
    setRejectReason('')
    setKycActionRequest({ action, record })
  }

  function cancelKycAction() {
    if (kycActionRequest && busyId === `${kycActionRequest.action}:${kycActionRequest.record._id}`) return
    setActionDialogError('')
    setRejectReason('')
    setKycActionRequest(null)
  }

  async function confirmKycAction() {
    if (!kycActionRequest) return
    const { action, record } = kycActionRequest
    const id = record._id
    const reason = rejectReason.trim()

    setActionError('')
    setActionDialogError('')
    setBusyId(`${action}:${id}`)
    try {
      if (action === 'approve') {
        await apiPut(`/admin/kyc/${id}/approve`)
      } else {
        await apiPut(`/admin/kyc/${id}/reject`, { reason })
      }
      await records.refetch()
      await acceptedPreview.refetch()
      await acceptedRecords.refetch()
      setKycActionRequest(null)
      setRejectReason('')
    } catch (requestError) {
      setActionDialogError(
        getErrorMessage(requestError, action === 'approve' ? 'Unable to approve KYC submission' : 'Unable to reject KYC submission'),
      )
    } finally {
      setBusyId('')
    }
  }

  function showAllAccepted() {
    setAcceptedPage(1)
    setShowAcceptedAll(true)
  }

  function submitAcceptedSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAcceptedPage(1)
    setAcceptedSearch(searchDraft.trim())
  }

  function clearAcceptedFilters() {
    setAcceptedPage(1)
    setSearchDraft('')
    setAcceptedSearch('')
    setIdTypeFilter('')
    setPhoneVerifiedFilter('')
    setReviewedWithinFilter('')
    setAcceptedSort('newest')
  }

  const pendingRecords = records.data?.records || []
  const previewRecords = acceptedPreview.data?.records || []
  const acceptedTotal = acceptedRecords.data?.total || 0
  const acceptedLimit = acceptedRecords.data?.limit || ACCEPTED_PAGE_SIZE
  const acceptedPages = acceptedRecords.data?.pages || 0
  const acceptedStart = acceptedTotal ? (acceptedPage - 1) * acceptedLimit + 1 : 0
  const acceptedEnd = Math.min(acceptedPage * acceptedLimit, acceptedTotal)
  const hasAcceptedFilters = Boolean(
    acceptedSearch || searchDraft || idTypeFilter || phoneVerifiedFilter || reviewedWithinFilter || acceptedSort !== 'newest',
  )
  const kycActionBusy = kycActionRequest ? busyId === `${kycActionRequest.action}:${kycActionRequest.record._id}` : false
  const kycActionSeller = kycActionRequest ? getUserName(kycActionRequest.record.userId) : ''
  const kycActionIdNo = kycActionRequest?.record.idNo || 'Not provided'

  return (
    <AdminShell section="kyc">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <div className="admin-title mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>{showAcceptedAll ? 'Accepted KYC records' : 'KYC reviews'}</h1>
            <p>
              {showAcceptedAll
                ? 'Search and filter all previously accepted KYC submissions.'
                : 'Pending identity records awaiting admin action.'}
            </p>
          </div>
          <div className="admin-mini-stats grid w-full gap-4 sm:grid-cols-2 md:w-auto">
            <StatCard icon="shield" label="Pending Verifications" value={String(pendingRecords.length)} note="Awaiting review" />
            <StatCard icon="check" label="Accepted Records" value={String(acceptedPreview.data?.total || 0)} note="Previously approved" />
          </div>
        </div>

        {showAcceptedAll ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-center text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent"
                onClick={() => setShowAcceptedAll(false)}
                type="button"
              >
                Back to reviews
              </button>
              <p className="text-sm font-semibold text-foose-muted">
                {acceptedTotal ? `Showing ${acceptedStart}-${acceptedEnd} of ${acceptedTotal}` : 'No accepted records found'}
              </p>
            </div>

            <form
              className="grid gap-4 rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_150px_auto]"
              onSubmit={submitAcceptedSearch}
            >
              <label className="text-sm font-semibold text-foose-text">
                Search
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Name, email, username, phone, or ID"
                  value={searchDraft}
                />
              </label>
              <label className="text-sm font-semibold text-foose-text">
                ID type
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => {
                    setAcceptedPage(1)
                    setIdTypeFilter(event.target.value as IdTypeFilter)
                  }}
                  value={idTypeFilter}
                >
                  {idTypeOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-semibold text-foose-text">
                Phone
                <select
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => {
                    setAcceptedPage(1)
                    setPhoneVerifiedFilter(event.target.value as PhoneVerifiedFilter)
                  }}
                  value={phoneVerifiedFilter}
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
                  onChange={(event) => {
                    setAcceptedPage(1)
                    setReviewedWithinFilter(event.target.value as ReviewedWithinFilter)
                  }}
                  value={reviewedWithinFilter}
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
                  onChange={(event) => {
                    setAcceptedPage(1)
                    setAcceptedSort(event.target.value as AcceptedSort)
                  }}
                  value={acceptedSort}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </label>
              <div className="flex items-end gap-3">
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover"
                  type="submit"
                >
                  Search
                </button>
                {hasAcceptedFilters && (
                  <button
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-4 py-2.5 text-center text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent"
                    onClick={clearAcceptedFilters}
                    type="button"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>

            {acceptedRecords.loading && <LoadingState label="Loading accepted KYC records..." />}
            {acceptedRecords.error && <ErrorState message={acceptedRecords.error} retry={acceptedRecords.refetch} />}
            {!acceptedRecords.loading && !acceptedRecords.error && !acceptedRecords.data?.records.length && (
              <EmptyState body="Try a different search term or loosen the filters." title="No accepted KYC records found" />
            )}
            {!!acceptedRecords.data?.records.length && (
              <div className="overflow-x-auto rounded-xl border border-foose-border bg-foose-surface shadow-sm">
                <table className="sharp-table w-full min-w-[980px] border-collapse text-left text-sm [&_th]:border-b [&_th]:border-foose-border [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-foose-surface-mid [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted">
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>ID Type</th>
                      <th>ID Number</th>
                      <th>Reviewed</th>
                      <th>Reviewer</th>
                      <th>Phone</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acceptedRecords.data.records.map((record) => (
                      <tr
                        className="clickable-row cursor-pointer [&:hover_td]:bg-accent-light"
                        key={record._id}
                        onClick={() => openRecord(record._id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') openRecord(record._id)
                        }}
                        role="link"
                        tabIndex={0}
                      >
                        <td>
                          <SellerCell record={record} />
                        </td>
                        <td>
                          <Badge>{record.idType || 'Unknown'}</Badge>
                        </td>
                        <td className="font-semibold">{record.idNo || 'Not provided'}</td>
                        <td>{formatDateTime(record.reviewedAt)}</td>
                        <td>{getReviewerName(record.reviewedBy)}</td>
                        <td>
                          <Badge tone={record.phoneVerified ? 'success' : 'warning'}>
                            {record.phoneVerified ? 'Verified' : 'Not verified'}
                          </Badge>
                        </td>
                        <td onClick={(event) => event.stopPropagation()}>
                          <a
                            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-4 py-2 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent"
                            href={withBasePath(`/admin/kyc/${record._id}`)}
                          >
                            View details
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!!acceptedRecords.data && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foose-border bg-foose-surface p-4">
                <p className="text-sm font-semibold text-foose-muted">
                  Page {acceptedPages ? acceptedPage : 0} of {acceptedPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-4 py-2 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                    disabled={acceptedPage <= 1 || acceptedRecords.loading}
                    onClick={() => setAcceptedPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <button
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-4 py-2 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                    disabled={!acceptedPages || acceptedPage >= acceptedPages || acceptedRecords.loading}
                    onClick={() => setAcceptedPage((current) => current + 1)}
                    type="button"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
            <div className="min-w-0 space-y-4">
              {records.loading && <LoadingState label="Loading KYC records..." />}
              {records.error && <ErrorState message={records.error} retry={records.refetch} />}
              {actionError && <ErrorState message={actionError} />}
              {!records.loading && !records.error && !pendingRecords.length && (
                <EmptyState body="No pending KYC submissions are waiting for review." title="KYC queue is clear" />
              )}
              {!!pendingRecords.length && (
                <div className="overflow-x-auto rounded-xl border border-foose-border bg-foose-surface shadow-sm">
                  <table className="sharp-table w-full min-w-[860px] border-collapse text-left text-sm [&_th]:border-b [&_th]:border-foose-border [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-foose-surface-mid [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted admin-table [&_td:first-child]:font-bold">
                    <thead>
                      <tr>
                        <th>Seller Name</th>
                        <th>Submission Date</th>
                        <th>ID Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRecords.map((record) => (
                        <tr
                          className="clickable-row cursor-pointer [&:hover_td]:bg-accent-light"
                          key={record._id}
                          onClick={() => openRecord(record._id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') openRecord(record._id)
                          }}
                          role="link"
                          tabIndex={0}
                        >
                          <td>
                            <SellerCell record={record} />
                          </td>
                          <td>{formatDateTime(record.submittedAt)}</td>
                          <td>
                            <Badge>{record.idType}</Badge>
                          </td>
                          <td>
                            <Badge tone="accent">{record.status}</Badge>
                          </td>
                          <td onClick={(event) => event.stopPropagation()}>
                            <div className="table-actions flex flex-wrap items-center justify-end gap-3">
                              <a
                                className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-center text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                                href={withBasePath(`/admin/kyc/${record._id}`)}
                              >
                                View details
                              </a>
                              <button
                                className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-accent bg-accent px-5 py-2.5 text-center text-sm font-bold text-white shadow-md shadow-accent/15 transition hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
                                disabled={busyId === `approve:${record._id}`}
                                onClick={() => requestKycAction('approve', record)}
                                type="button"
                              >
                                {busyId === `approve:${record._id}` ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-center text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
                                disabled={busyId === `reject:${record._id}`}
                                onClick={() => requestKycAction('reject', record)}
                                type="button"
                              >
                                {busyId === `reject:${record._id}` ? 'Rejecting...' : 'Reject'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <AcceptedKycPreviewPanel
              loading={acceptedPreview.loading}
              onViewAll={showAllAccepted}
              records={previewRecords}
              total={acceptedPreview.data?.total || 0}
            />
          </div>
        )}
      </section>
      {kycActionRequest && (
        <ConfirmDialog
          cancelDisabled={kycActionBusy}
          confirmDisabled={kycActionBusy}
          confirmLabel={
            kycActionBusy
              ? kycActionRequest.action === 'approve'
                ? 'Approving...'
                : 'Rejecting...'
              : kycActionRequest.action === 'approve'
                ? 'Approve KYC'
                : 'Reject KYC'
          }
          description={`Are you sure you want to ${kycActionRequest.action} KYC for user ${kycActionSeller} of ID No. ${kycActionIdNo}?`}
          onCancel={cancelKycAction}
          onConfirm={() => void confirmKycAction()}
          open={Boolean(kycActionRequest)}
          title={kycActionRequest.action === 'approve' ? 'Approve KYC?' : 'Reject KYC?'}
          tone={kycActionRequest.action === 'approve' ? 'success' : 'danger'}
        >
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-lg bg-foose-surface-low p-3 text-sm sm:grid-cols-2">
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-foose-faint">Seller</span>
                <strong className="mt-1 block text-foose-text">{kycActionSeller}</strong>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-foose-faint">ID No.</span>
                <strong className="mt-1 block text-foose-text">{kycActionIdNo}</strong>
              </div>
            </div>

            {kycActionRequest.action === 'reject' && (
              <label className="text-sm font-semibold text-foose-text">
                Rejection reason optional
                <textarea
                  className="mt-2 min-h-28 w-full resize-y rounded-lg border border-foose-border bg-white px-3 py-3 text-sm font-medium text-foose-text outline-none transition placeholder:text-foose-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => {
                    setRejectReason(event.target.value)
                    setActionDialogError('')
                  }}
                  placeholder="Explain what the seller needs to fix."
                  value={rejectReason}
                />
              </label>
            )}

            {actionDialogError && (
              <p className="rounded-lg border border-foose-danger/30 bg-foose-danger-bg px-3 py-2 text-sm font-semibold text-foose-danger">
                {actionDialogError}
              </p>
            )}
          </div>
        </ConfirmDialog>
      )}
    </AdminShell>
  )
}
