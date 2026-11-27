import { KycCorrectionSummary } from '../components/admin/KycCorrectionFields'
import { useEffect, useRef, useState } from 'react'
import { AdminShell, Badge, Button, EmptyState, ErrorState, KycActionDialog, LoadingState, PageHeader } from '../components'
import { roleLabels } from '../constants/roles'
import { useApiResource } from '../hooks/useApiResource'
import { useKycReviewAction } from '../hooks/useKycReviewAction'
import type { KycRecord, User } from '../types/api'
import { formatDateTime } from '../utils/format'
import { getCurrentAppPathname } from '../utils/navigation'

type KycDetail = Omit<KycRecord, 'reviewedBy' | 'userId'> & {
  _id: string
  reviewedBy?: User | string | null
  userId?: User | string | null
}

type PreviewImage = {
  title: string
  url: string
}

const STATUS_TONE = {
  approved: 'success',
  not_submitted: 'neutral',
  pending: 'accent',
  rejected: 'danger',
} as const

function currentKycId() {
  const match = getCurrentAppPathname().match(/^\/admin\/kyc\/([^/]+)/)
  try {
    return match ? decodeURIComponent(match[1]).trim() : ''
  } catch {
    return ''
  }
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

function getUserPhone(user?: User | string | null) {
  return isUserObject(user) ? user.phone : undefined
}

function getUserMeta(user?: User | string | null) {
  if (!isUserObject(user)) return []
  return [user.username ? `@${user.username}` : undefined, ...roleLabels(user.roles, user.role)].filter(Boolean)
}

function DocumentPreview({
  onPreview,
  title,
  url,
}: {
  onPreview: (image: PreviewImage) => void
  title: string
  url?: string
}) {
  const [failedUrl, setFailedUrl] = useState<string>()
  const failed = Boolean(url && url === failedUrl)

  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
      {url && !failed ? (
        <button
          aria-label={`Preview ${title}`}
          className="group flex min-w-0 flex-1 basis-40 cursor-pointer items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          onClick={() => onPreview({ title, url })}
          type="button"
        >
          <span className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-foose-border bg-foose-surface-mid p-1.5 sm:h-20 sm:w-32">
            <img alt="" className="h-full w-full object-contain" onError={() => setFailedUrl(url)} src={url} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-bold wrap-anywhere text-foose-text group-hover:text-accent">{title}</span>
        </button>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foose-text">{title}</p>
          <p className="mt-1 text-sm text-foose-muted">{failed ? 'Image could not load' : 'No image submitted'}</p>
        </div>
      )}
      {url && (
        <a className="inline-flex min-h-11 shrink-0 items-center text-sm font-bold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" href={url} rel="noreferrer" target="_blank">
          Open image
        </a>
      )}
    </li>
  )
}

function ImagePreviewModal({ onClose, preview }: { onClose: () => void; preview: PreviewImage }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  return (
    <dialog
      aria-labelledby="kyc-preview-title"
      className="m-auto max-h-[94dvh] w-[calc(100%-1.5rem)] max-w-6xl overflow-auto rounded-xl border border-foose-border bg-foose-surface text-foose-text shadow-2xl backdrop:bg-foose-text/75"
      onCancel={onClose}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
      ref={dialog}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-foose-border px-4 py-2">
        <h2 className="text-base font-bold sm:text-lg" id="kyc-preview-title">{preview.title}</h2>
        <div className="flex items-center gap-2">
          <a className="inline-flex min-h-10 items-center text-sm font-bold text-accent" href={preview.url} rel="noreferrer" target="_blank">Open image</a>
          <Button onClick={onClose} size="sm" variant="secondary">Close</Button>
        </div>
      </div>
      <div className="bg-foose-surface-mid p-3">
        {failed
          ? <p className="p-4 text-center text-sm text-foose-muted" role="status">Image could not load.</p>
          : <img alt={preview.title} className="max-h-[76dvh] w-full object-contain" onError={() => setFailed(true)} src={preview.url} />}
      </div>
    </dialog>
  )
}

const FIELD_LIST_CLASS = 'grid gap-x-4 gap-y-3 [&_dd]:mt-1 [&_dd]:wrap-anywhere [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text [&_dt]:text-xs [&_dt]:font-semibold [&_dt]:text-foose-muted'

export function AdminKycDetailPage() {
  const kycId = currentKycId()
  const resource = useApiResource<{ kyc: KycDetail }>(kycId ? `/admin/kyc/${encodeURIComponent(kycId)}` : null)
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null)
  const kycActionController = useKycReviewAction({ onSuccess: () => resource.refetch() })

  const kyc = resource.data?.kyc
  const sellerName = getUserName(kyc?.userId)
  const userMeta = getUserMeta(kyc?.userId)
  const view = new URLSearchParams(window.location.search).get('view')
  const fromReviewedRecords = view === 'accepted' || view === 'rejected'

  return (
    <AdminShell section="kyc">
      <section className="mx-auto max-w-4xl p-4 md:p-6 lg:p-8">
        <PageHeader
          actions={kyc && !kyc.correctionRequest && (
            <>
              {kyc.status === 'pending' && <Button disabled={kycActionController.busy} onClick={() => kycActionController.request('reject', kycId, kyc.submissionCount)} variant="secondary">
                Reject
              </Button>}
              <Button disabled={kyc.status === 'approved' || kycActionController.busy} onClick={() => kycActionController.request('approve', kycId, kyc.submissionCount)}>
                {kyc.status === 'approved' ? 'Approved' : 'Approve'}
              </Button>
            </>
          )}
          backLabel={fromReviewedRecords ? `Back to ${view} records` : 'Back to KYC queue'}
          backTo={fromReviewedRecords ? `/admin/kyc${window.location.search}` : '/admin/kyc'}
          description={kyc && getUserEmail(kyc.userId)}
          meta={kyc && <Badge tone={STATUS_TONE[kyc.status]}>{kyc.status.replaceAll('_', ' ')}</Badge>}
          title={kyc ? sellerName : 'KYC record'}
        />

        {!kycId && <EmptyState body="Open a KYC record from the admin queue." title="KYC record required" />}
        {resource.loading && <LoadingState label="Loading KYC details..." />}
        {resource.error && <ErrorState message={resource.error} retry={resource.refetch} />}
        {kyc && (
          <div className="min-w-0 divide-y divide-foose-border rounded-xl border border-foose-border bg-foose-surface">
            <section aria-labelledby="kyc-identity-heading" className="p-4 sm:p-6">
              <h2 className="mb-4 text-base font-bold text-foose-text" id="kyc-identity-heading">Identity details</h2>
              <dl className={`${FIELD_LIST_CLASS} grid-cols-1 sm:grid-cols-2`}>
                <div><dt>ID type</dt><dd>{kyc.idType || 'Not provided'}</dd></div>
                <div><dt>Document number</dt><dd>{kyc.idNo || 'Not provided'}</dd></div>
                <div><dt>Date of birth</dt><dd>{kyc.dob || 'Not provided'}</dd></div>
                <div><dt>Phone number</dt><dd>{kyc.phone || getUserPhone(kyc.userId) || 'Not provided'}</dd></div>
              </dl>
            </section>

            <section aria-labelledby="kyc-documents-heading" className="px-4 pt-4 pb-1 sm:px-6 sm:pt-6 sm:pb-3">
              <h2 className="text-base font-bold text-foose-text" id="kyc-documents-heading">Submitted documents</h2>
              <ul className="mt-1 divide-y divide-foose-border">
                <DocumentPreview onPreview={setPreviewImage} title="ID front / photo page" url={kyc.idImgUrl} />
                <DocumentPreview onPreview={setPreviewImage} title="ID back" url={kyc.idBackImgUrl} />
                <DocumentPreview onPreview={setPreviewImage} title="Submitted selfie" url={kyc.selfieImgUrl} />
              </ul>
            </section>

            <section aria-labelledby="kyc-review-heading" className="p-4 sm:p-6">
              <h2 className="mb-4 text-base font-bold text-foose-text" id="kyc-review-heading">Review decision</h2>
              <dl className={`${FIELD_LIST_CLASS} grid-cols-1 sm:grid-cols-2`}>
                <div><dt>Reviewed</dt><dd>{formatDateTime(kyc.reviewedAt)}</dd></div>
                <div><dt>Reviewer</dt><dd>{kyc.reviewedBy ? getUserName(kyc.reviewedBy) : 'Not recorded'}</dd></div>
                {kyc.correctionRequest && (
                  <div className="sm:col-span-2">
                    <dt>Requested corrections</dt>
                    <dd><KycCorrectionSummary request={kyc.correctionRequest} /></dd>
                  </div>
                )}
                {kyc.rejectionReason && (
                  <div className="rounded-lg bg-foose-danger-bg p-3 sm:col-span-2">
                    <dt>Rejection reason</dt>
                    <dd className="text-foose-danger!">{kyc.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section aria-labelledby="kyc-seller-heading" className="p-4 sm:p-6">
              <h2 className="mb-4 text-base font-bold text-foose-text" id="kyc-seller-heading">Seller details</h2>
              <dl className={`${FIELD_LIST_CLASS} grid-cols-1 sm:grid-cols-2`}>
                <div className="sm:col-span-2"><dt>Account</dt><dd>{userMeta.join(' / ') || 'Not available'}</dd></div>
                <div><dt>Submitted</dt><dd>{formatDateTime(kyc.submittedAt)}</dd></div>
                <div><dt>Submission count</dt><dd>{kyc.submissionCount || 0}</dd></div>
              </dl>
            </section>
          </div>
        )}
      </section>

      <KycActionDialog controller={kycActionController} idNo={kyc?.idNo} idType={kyc?.idType} sellerName={sellerName} />
      {previewImage && <ImagePreviewModal onClose={() => setPreviewImage(null)} preview={previewImage} />}
    </AdminShell>
  )
}
