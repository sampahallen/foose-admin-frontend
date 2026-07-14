import { useState } from 'react'
import { AdminShell, Badge, ButtonLink, ConfirmDialog, EmptyState, ErrorState, Icon, LoadingState } from '../components'
import { roleLabels } from '../constants/roles'
import { useApiResource } from '../hooks/useApiResource'
import { apiPut } from '../lib/api'
import type { KycRecord, User } from '../types/api'
import { getErrorMessage } from '../utils/errorMessage'
import { formatDateTime, initials } from '../utils/format'
import { getCurrentAppPathname, withBasePath } from '../utils/navigation'

type KycDetail = Omit<KycRecord, 'reviewedBy' | 'userId'> & {
  _id: string
  reviewedBy?: User | string | null
  userId?: User | string | null
}

type PreviewImage = {
  title: string
  url: string
}

type KycAction = 'approve' | 'reject'

const STATUS_TONE = {
  approved: 'success',
  not_submitted: 'neutral',
  pending: 'accent',
  rejected: 'danger',
} as const

function currentKycId() {
  const match = getCurrentAppPathname().match(/^\/admin\/kyc\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
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
  return (
    <article className="kyc-document-card h-full rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <strong className="text-sm font-bold text-foose-text">{title}</strong>
        {url && (
          <a className="shrink-0 text-xs font-bold text-accent hover:text-accent-hover" href={url} rel="noreferrer" target="_blank">
            Open image
          </a>
        )}
      </header>
      {url ? (
        <button
          aria-label={`Preview ${title}`}
          className="block w-full overflow-hidden rounded-lg border border-foose-border bg-foose-surface-low text-left transition hover:border-accent focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
          onClick={() => onPreview({ title, url })}
          type="button"
        >
          <span className="flex aspect-[4/3] w-full items-center justify-center bg-foose-surface-mid p-2 sm:aspect-[3/2]">
            <img alt={title} className="max-h-full max-w-full rounded-md object-contain" src={url} />
          </span>
        </button>
      ) : (
        <span className="image-placeholder flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-foose-surface-mid text-sm font-semibold text-foose-faint sm:aspect-[3/2]">
          No image submitted
        </span>
      )}
    </article>
  )
}

function ImagePreviewModal({ onClose, preview }: { onClose: () => void; preview: PreviewImage }) {
  return (
    <div aria-label={`${preview.title} preview`} aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" role="dialog">
      <button aria-label="Close image preview" className="absolute inset-0 bg-black/75" onClick={onClose} type="button" />
      <article className="relative z-10 w-full max-w-6xl">
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <h2 className="text-base font-bold sm:text-lg">{preview.title}</h2>
          <button
            aria-label="Close image preview"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white transition hover:bg-black/60 focus:outline-none focus:ring-4 focus:ring-white/20"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="rounded-xl bg-white p-2 shadow-2xl">
          <img alt={preview.title} className="max-h-[78dvh] w-full rounded-lg object-contain sm:max-h-[82dvh]" src={preview.url} />
        </div>
      </article>
    </div>
  )
}

export function AdminKycDetailPage() {
  const kycId = currentKycId()
  const resource = useApiResource<{ kyc: KycDetail }>(kycId ? `/admin/kyc/${kycId}` : null)
  const [actionError, setActionError] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null)
  const [kycAction, setKycAction] = useState<KycAction | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionDialogError, setActionDialogError] = useState('')

  const kyc = resource.data?.kyc
  const sellerName = getUserName(kyc?.userId)
  const userMeta = getUserMeta(kyc?.userId)

  function requestKycAction(action: KycAction) {
    setActionError('')
    setActionDialogError('')
    setRejectReason('')
    setKycAction(action)
  }

  function cancelKycAction() {
    if (busyAction) return
    setActionDialogError('')
    setRejectReason('')
    setKycAction(null)
  }

  async function confirmKycAction() {
    if (!kycId || !kycAction) return
    const reason = rejectReason.trim()

    setActionError('')
    setActionDialogError('')
    setBusyAction(kycAction)
    try {
      if (kycAction === 'approve') {
        await apiPut(`/admin/kyc/${kycId}/approve`)
      } else {
        await apiPut(`/admin/kyc/${kycId}/reject`, { reason })
      }
      await resource.refetch()
      setKycAction(null)
      setRejectReason('')
    } catch (requestError) {
      setActionDialogError(
        getErrorMessage(requestError, kycAction === 'approve' ? 'Unable to approve KYC submission' : 'Unable to reject KYC submission'),
      )
    } finally {
      setBusyAction('')
    }
  }

  const kycActionIdNo = kyc?.idNo || 'Not provided'

  return (
    <AdminShell section="kyc">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <a className="back-link mb-6 inline-flex items-center gap-2 text-sm font-semibold text-foose-muted hover:text-accent" href={withBasePath('/admin/kyc')}>
          <Icon name="arrow" /> Back to KYC queue
        </a>
        {!kycId && <EmptyState body="Open a KYC record from the admin queue." title="KYC record required" />}
        {resource.loading && <LoadingState label="Loading KYC details..." />}
        {resource.error && <ErrorState message={resource.error} retry={resource.refetch} />}
        {actionError && <ErrorState message={actionError} />}
        {kyc && (
          <>
            <div className="admin-title mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
              <div>
                <h1>{sellerName}</h1>
                <p>Review identity documents, card number, selfie, and submission history.</p>
              </div>
              <div className="button-row flex flex-wrap items-center gap-3">
                <Badge tone={STATUS_TONE[kyc.status]}>{kyc.status.replace('_', ' ')}</Badge>
                <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-primary border-accent bg-accent text-white shadow-md shadow-accent/15 hover:bg-accent-hover" disabled={busyAction === 'approve'} onClick={() => requestKycAction('approve')} type="button">
                  {busyAction === 'approve' ? 'Approving...' : 'Approve'}
                </button>
                <button className="button inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-center text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 [&.full]:w-full button-secondary border-foose-border bg-foose-surface text-foose-text hover:border-accent hover:text-accent" disabled={busyAction === 'reject'} onClick={() => requestKycAction('reject')} type="button">
                  {busyAction === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>

            <div className="kyc-detail-grid grid gap-6">
              <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3 kyc-identity-card">
                <div className="person-heading">
                  <span className="initials inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(sellerName)}</span>
                  <div>
                    <h2>Seller details</h2>
                    {getUserEmail(kyc.userId) && <p>{getUserEmail(kyc.userId)}</p>}
                  </div>
                </div>
                <dl className="record-grid grid gap-3 sm:grid-cols-2 [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text [&_.wide]:sm:col-span-2">
                  <div>
                    <dt>Account</dt>
                    <dd>{userMeta.join(' / ') || 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDateTime(kyc.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt>Reviewed</dt>
                    <dd>{formatDateTime(kyc.reviewedAt)}</dd>
                  </div>
                  <div>
                    <dt>Submission count</dt>
                    <dd>{kyc.submissionCount || 0}</dd>
                  </div>
                </dl>
              </section>

              <section className="form-card rounded-xl border border-foose-border bg-foose-surface shadow-sm p-4 md:p-5 [&_label]:text-sm [&_label]:font-semibold [&_label]:text-foose-text [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_input]:w-full [&_input]:px-3 [&_input]:py-3 [&_select]:w-full [&_select]:px-3 [&_select]:py-3 [&_textarea]:w-full [&_textarea]:px-3 [&_textarea]:py-3 max-lg:rounded-lg max-lg:p-3">
                <h2>
                  <Icon name="shield" /> ID details
                </h2>
                <dl className="record-grid grid gap-3 sm:grid-cols-2 [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text [&_.wide]:sm:col-span-2">
                  <div>
                    <dt>ID type</dt>
                    <dd>{kyc.idType || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Card / document number</dt>
                    <dd>{kyc.idNo || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Phone number</dt>
                    <dd>{kyc.phone || getUserPhone(kyc.userId) || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Date of birth</dt>
                    <dd>{kyc.dob || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Reviewer</dt>
                    <dd>{getUserName(kyc.reviewedBy)}</dd>
                  </div>
                  {kyc.rejectionReason && (
                    <div className="wide">
                      <dt>Rejection reason</dt>
                      <dd className="danger-text font-semibold text-foose-danger">{kyc.rejectionReason}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <section className="kyc-documents grid gap-5 md:grid-cols-2">
              <DocumentPreview onPreview={setPreviewImage} title="Submitted ID document" url={kyc.idImgUrl} />
              <DocumentPreview onPreview={setPreviewImage} title="Submitted selfie" url={kyc.selfieImgUrl} />
            </section>

            <div className="form-actions flex flex-wrap items-center gap-3">
              <ButtonLink to="/admin/kyc" variant="secondary">
                Return to queue
              </ButtonLink>
            </div>
          </>
        )}
      </section>
      {kycAction && (
        <ConfirmDialog
          cancelDisabled={Boolean(busyAction)}
          confirmDisabled={Boolean(busyAction)}
          confirmLabel={
            busyAction
              ? kycAction === 'approve'
                ? 'Approving...'
                : 'Rejecting...'
              : kycAction === 'approve'
                ? 'Approve KYC'
                : 'Reject KYC'
          }
          description={`Are you sure you want to ${kycAction} KYC for user ${sellerName} of ID No. ${kycActionIdNo}?`}
          onCancel={cancelKycAction}
          onConfirm={() => void confirmKycAction()}
          open={Boolean(kycAction)}
          title={kycAction === 'approve' ? 'Approve KYC?' : 'Reject KYC?'}
          tone={kycAction === 'approve' ? 'success' : 'danger'}
        >
          <div className="grid gap-4">
            <div className="grid gap-3 rounded-lg bg-foose-surface-low p-3 text-sm sm:grid-cols-2">
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-foose-faint">Seller</span>
                <strong className="mt-1 block text-foose-text">{sellerName}</strong>
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-widest text-foose-faint">ID No.</span>
                <strong className="mt-1 block text-foose-text">{kycActionIdNo}</strong>
              </div>
            </div>

            {kycAction === 'reject' && (
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
      {previewImage && <ImagePreviewModal onClose={() => setPreviewImage(null)} preview={previewImage} />}
    </AdminShell>
  )
}
